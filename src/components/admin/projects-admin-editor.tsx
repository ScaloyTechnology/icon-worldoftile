"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { AdminIcon } from "@/components/admin/admin-icons";
import { archiveProjectStory, saveProjectsPageMedia, saveProjectStory } from "@/server/admin/projects-actions";
import type { ProjectMedia } from "@/types/projects";
import type { ProjectAdminAsset, ProjectAdminStory, ProjectsAdminData } from "@/types/projects-admin";
import styles from "./projects-admin-editor.module.css";

type MutableStory = {
  id: string;
  slug: string;
  title: string;
  introduction: string;
  category: string;
  location: string;
  published: boolean;
  images: ProjectAdminAsset[];
};

type SlotMedia = ProjectAdminAsset | ProjectMedia | null;

function responseError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") return payload.error;
  return "The image could not be uploaded.";
}

function SubmitButton({ children, disabled = false }: Readonly<{ children: React.ReactNode; disabled?: boolean }>) {
  const { pending } = useFormStatus();
  return <button className={styles.primaryButton} disabled={disabled || pending} type="submit">{pending ? "Saving…" : children}</button>;
}

function MediaPreview({ media }: Readonly<{ media: SlotMedia }>) {
  if (!media?.src) return <span className={styles.noPreview}>No image selected</span>;
  return <Image alt={media.alt} fill sizes="(max-width: 760px) 100vw, 32vw" src={media.src} style={{ objectFit: "cover", objectPosition: "position" in media ? media.position ?? "50% 50%" : "50% 50%" }} unoptimized={!media.src.startsWith("/")} />;
}

function MediaCard({
  busy,
  current,
  description,
  fallback,
  label,
  onRestore,
  onUpload,
  title,
}: Readonly<{
  busy: boolean;
  current: ProjectAdminAsset | null;
  description: string;
  fallback: SlotMedia;
  label: string;
  onRestore: () => void;
  onUpload: (file: File) => void;
  title: string;
}>) {
  return <article className={styles.mediaCard}>
    <div className={styles.mediaPreview}>
      <MediaPreview media={current ?? fallback} />
      <i data-custom={current ? "true" : undefined}>{current ? "Custom image" : "Current fallback"}</i>
    </div>
    <div className={styles.mediaBody}>
      <p>{label}</p>
      <h3>{title}</h3>
      <span>{description}</span>
      <div>
        <label className={styles.uploadButton}>
          <AdminIcon name="plus" /> {busy ? "Uploading…" : current ? "Replace image" : "Upload image"}
          <input accept="image/jpeg,image/png,image/webp,image/avif" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) onUpload(file); }} type="file" />
        </label>
        {current ? <button className={styles.secondaryButton} disabled={busy} onClick={onRestore} type="button">Use fallback</button> : null}
      </div>
    </div>
  </article>;
}

function StoryModal({ categories, onClose, story }: Readonly<{ categories: readonly string[]; onClose: () => void; story: MutableStory }>) {
  const [draft, setDraft] = useState(story);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !uploading) onClose(); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", closeOnEscape); };
  }, [onClose, uploading]);

  async function uploadFiles(files: readonly File[]) {
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const uploaded: ProjectAdminAsset[] = [];
      for (const file of files) {
        const form = new FormData();
        form.set("file", file);
        form.set("alt", draft.title || file.name.replace(/\.[^.]+$/, ""));
        form.set("purpose", "projects");
        const response = await fetch("/api/admin/site-media", { method: "POST", body: form });
        const payload: unknown = await response.json();
        if (!response.ok || typeof payload !== "object" || payload === null || !("asset" in payload)) throw new Error(responseError(payload));
        const candidate = payload.asset as Partial<ProjectAdminAsset>;
        if (!candidate.id || !candidate.src) throw new Error("The uploaded image response was incomplete.");
        uploaded.push({ id: candidate.id, src: candidate.src, alt: candidate.alt ?? draft.title, width: candidate.width ?? 1600, height: candidate.height ?? 1100 });
      }
      setDraft((current) => ({ ...current, images: [...current.images, ...uploaded] }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The images could not be uploaded.");
    } finally {
      setUploading(false);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    setDraft((current) => {
      const images = [...current.images];
      const target = index + direction;
      if (target < 0 || target >= images.length) return current;
      [images[index], images[target]] = [images[target]!, images[index]!];
      return { ...current, images };
    });
  }

  return <div aria-labelledby="project-story-editor-title" aria-modal="true" className={styles.modalBackdrop} role="dialog">
    <div className={styles.modal}>
      <header className={styles.modalHeader}>
        <div><p>04 / Selected spaces</p><h2 id="project-story-editor-title">{draft.id ? "Edit project story" : "Complete project story"}</h2><span>The cover and all gallery frames feed the public card and its popup.</span></div>
        <button aria-label="Close project editor" disabled={uploading} onClick={onClose} type="button"><AdminIcon name="close" /></button>
      </header>
      <form action={saveProjectStory} className={styles.storyForm}>
        <input name="id" type="hidden" value={draft.id} />
        {draft.images.map((image) => <input key={image.id} name="projectMediaId" type="hidden" value={image.id} />)}
        <div className={styles.formFields}>
          <label><span>Project title</span><input name="title" onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Space study 01" required value={draft.title} /></label>
          <label><span>URL slug</span><input name="slug" onChange={(event) => setDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="Generated from title when empty" value={draft.slug} /></label>
          <label><span>Project category</span><input list="project-category-options" name="category" onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value }))} placeholder="Interior" required value={draft.category} /><datalist id="project-category-options">{categories.map((category) => <option key={category} value={category} />)}</datalist></label>
          <label><span>Location</span><input name="location" onChange={(event) => setDraft((current) => ({ ...current, location: event.target.value }))} placeholder="Optional location" value={draft.location} /></label>
          <label className={styles.fullField}><span>Story description</span><textarea name="introduction" onChange={(event) => setDraft((current) => ({ ...current, introduction: event.target.value }))} placeholder="Describe the project story shown in the frontend popup." required rows={5} value={draft.introduction} /></label>
          <label className={styles.publishToggle}><input checked={draft.published} name="published" onChange={(event) => setDraft((current) => ({ ...current, published: event.target.checked }))} type="checkbox" /><span><strong>Publish this story</strong><small>Published stories appear immediately in Selected spaces and category filters.</small></span></label>
        </div>

        <section className={styles.storyMedia}>
          <header><div><p>Project media</p><h3>Cover and popup gallery</h3></div><label className={styles.uploadButton}><AdminIcon name="plus" /> {uploading ? "Uploading…" : "Add gallery images"}<input accept="image/jpeg,image/png,image/webp,image/avif" disabled={uploading} multiple onChange={(event) => { const files = Array.from(event.target.files ?? []); event.currentTarget.value = ""; void uploadFiles(files); }} type="file" /></label></header>
          <p>The first image is the public card cover. Every image, in this order, appears in the project story popup.</p>
          <div className={styles.storyImages}>
            {draft.images.map((image, index) => <figure key={image.id}>
              <div><Image alt={image.alt} fill sizes="180px" src={image.src} style={{ objectFit: "cover" }} unoptimized={!image.src.startsWith("/")} /><b>{index === 0 ? "Cover" : `Gallery ${String(index).padStart(2, "0")}`}</b></div>
              <figcaption><button aria-label="Move image left" disabled={index === 0 || uploading} onClick={() => moveImage(index, -1)} type="button">←</button><button aria-label="Move image right" disabled={index === draft.images.length - 1 || uploading} onClick={() => moveImage(index, 1)} type="button">→</button><button aria-label="Remove image" disabled={uploading} onClick={() => setDraft((current) => ({ ...current, images: current.images.filter((item) => item.id !== image.id) }))} type="button">Remove</button></figcaption>
            </figure>)}
          </div>
          {!draft.images.length ? <p className={styles.storyError}>Add at least one cover image before saving.</p> : null}
          {error ? <p className={styles.storyError} role="alert">{error}</p> : null}
        </section>

        <footer className={styles.modalActions}><button className={styles.secondaryButton} disabled={uploading} onClick={onClose} type="button">Cancel</button><SubmitButton disabled={uploading || !draft.images.length}>Save project story</SubmitButton></footer>
      </form>
    </div>
  </div>;
}

export function ProjectsAdminEditor({ data }: Readonly<{ data: ProjectsAdminData }>) {
  const publishedStories = data.stories.filter((story) => story.published);
  const initialFeaturedId = publishedStories.some((story) => story.id === data.settings.featuredProjectId)
    ? data.settings.featuredProjectId
    : publishedStories[0]?.id ?? "";
  const [hero, setHero] = useState(data.hero.media);
  const [featuredProjectId, setFeaturedProjectId] = useState(initialFeaturedId);
  const [featuredPrimary, setFeaturedPrimary] = useState<ProjectAdminAsset | null>(data.settings.featuredPrimaryMediaId ? data.featuredPrimary : null);
  const [featuredSecondary, setFeaturedSecondary] = useState<ProjectAdminAsset | null>(data.settings.featuredSecondaryMediaId ? data.featuredSecondary : null);
  const [categoryMedia, setCategoryMedia] = useState(() => data.categories.map((category) => ({ ...category, selected: category.media })));
  const [gallery, setGallery] = useState(() => data.gallery.map((media, index) => ({ media, id: data.settings.galleryMediaIds[index] ?? "" })));
  const [sequence, setSequence] = useState(() => data.sequence.map((media, index) => ({ media, id: data.settings.sequenceMediaIds[index] ?? "" })));
  const [busyKeys, setBusyKeys] = useState<readonly string[]>([]);
  const [error, setError] = useState("");
  const [editingStory, setEditingStory] = useState<MutableStory | null>(null);
  const [startingStory, setStartingStory] = useState(false);

  const selectedFeatured = useMemo(() => data.stories.find((story) => story.published && story.id === featuredProjectId) ?? data.stories.find((story) => story.published) ?? null, [data.stories, featuredProjectId]);
  const featuredPrimaryFallback = selectedFeatured?.images[0] ?? data.featuredPrimaryFallback;
  const featuredSecondaryFallback = selectedFeatured?.images[1] ?? data.featuredSecondaryFallback;
  const categoryNames = data.categories.map((category) => category.name);

  async function upload(file: File, alt: string): Promise<ProjectAdminAsset> {
    const form = new FormData();
    form.set("file", file);
    form.set("alt", alt || file.name.replace(/\.[^.]+$/, ""));
    form.set("purpose", "projects");
    const response = await fetch("/api/admin/site-media", { method: "POST", body: form });
    const payload: unknown = await response.json();
    if (!response.ok || typeof payload !== "object" || payload === null || !("asset" in payload)) throw new Error(responseError(payload));
    const candidate = payload.asset as Partial<ProjectAdminAsset>;
    if (!candidate.id || !candidate.src) throw new Error("The uploaded image response was incomplete.");
    return { id: candidate.id, src: candidate.src, alt: candidate.alt ?? alt, width: candidate.width ?? 1600, height: candidate.height ?? 1100 };
  }

  async function uploadFor(key: string, file: File, alt: string, apply: (asset: ProjectAdminAsset) => void) {
    setBusyKeys((current) => [...current, key]);
    setError("");
    try { apply(await upload(file, alt)); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "The image could not be uploaded."); }
    finally { setBusyKeys((current) => current.filter((item) => item !== key)); }
  }

  async function beginStory(file: File | undefined) {
    if (!file) return;
    setStartingStory(true);
    setError("");
    try {
      const cover = await upload(file, file.name.replace(/\.[^.]+$/, ""));
      setEditingStory({ id: "", slug: "", title: "", introduction: "", category: "", location: "", published: true, images: [cover] });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The cover image could not be uploaded.");
    } finally {
      setStartingStory(false);
    }
  }

  function editStory(story: ProjectAdminStory) {
    setEditingStory({
      id: story.id,
      slug: story.slug,
      title: story.title,
      introduction: story.introduction,
      category: story.category,
      location: story.location,
      published: story.published,
      images: [...story.images],
    });
  }

  return <>
    {error ? <p className={styles.globalError} role="alert">{error}</p> : null}
    <form action={saveProjectsPageMedia} className={styles.editor}>
      <input name="heroMediaId" type="hidden" value={hero?.id ?? ""} />
      <input name="featuredProjectId" type="hidden" value={featuredProjectId} />
      <input name="featuredPrimaryMediaId" type="hidden" value={featuredPrimary?.id ?? ""} />
      <input name="featuredSecondaryMediaId" type="hidden" value={featuredSecondary?.id ?? ""} />
      <input name="categoryMedia" type="hidden" value={JSON.stringify(categoryMedia.map((category) => ({ categorySlug: category.slug, mediaId: category.selected?.id ?? "" })))} />
      {gallery.map((slot, index) => <input key={`gallery-field-${index}`} name="galleryMediaId" type="hidden" value={slot.id} />)}
      {sequence.map((slot, index) => <input key={`sequence-field-${index}`} name="sequenceMediaId" type="hidden" value={slot.id} />)}

      <nav className={styles.sectionNav} aria-label="Project page media sections">
        {["01 / Header", "02 / Featured", "03 / Categories", "04 / Selected spaces", "05 / Gallery", "06 / Material sequence"].map((label, index) => <a href={`#project-admin-${index + 1}`} key={label}>{label}</a>)}
      </nav>

      <section className={styles.section} id="project-admin-1">
        <header className={styles.sectionHeader}><span>01</span><div><p>Project page</p><h2>Header image</h2><small>Change the opening casebook image without changing its grid, crop reveal or animation.</small></div></header>
        <div className={styles.mediaGrid}><MediaCard busy={busyKeys.includes("hero")} current={hero} description="Full-height architectural image on the right side of the Projects header." fallback={data.hero.fallback} label="01 / Hero" onRestore={() => setHero(null)} onUpload={(file) => void uploadFor("hero", file, "Projects page hero", setHero)} title="Projects header image" /></div>
      </section>

      <section className={styles.section} id="project-admin-2">
        <header className={styles.sectionHeader}><span>02</span><div><p>Project page</p><h2>Featured project</h2><small>Select the story and optionally override its large and floating detail images.</small></div></header>
        <div className={styles.featuredSelect}><label><span>Featured story</span><select onChange={(event) => { setFeaturedProjectId(event.target.value); setFeaturedPrimary(null); setFeaturedSecondary(null); }} value={featuredProjectId}><option value="">Choose a published project story</option>{publishedStories.map((story) => <option key={story.id} value={story.id}>{story.title}</option>)}</select></label><p>The selected story supplies the title, category, description and popup gallery.</p></div>
        <div className={styles.mediaGrid}>
          <MediaCard busy={busyKeys.includes("featured-primary")} current={featuredPrimary} description="Large composition image. When empty, the selected story cover is used." fallback={featuredPrimaryFallback} label="01 / Primary" onRestore={() => setFeaturedPrimary(null)} onUpload={(file) => void uploadFor("featured-primary", file, "Featured project", setFeaturedPrimary)} title="Featured project image" />
          <MediaCard busy={busyKeys.includes("featured-secondary")} current={featuredSecondary} description="Smaller overlapping detail. When empty, the story's second gallery image is used." fallback={featuredSecondaryFallback} label="02 / Detail" onRestore={() => setFeaturedSecondary(null)} onUpload={(file) => void uploadFor("featured-secondary", file, "Featured project detail", setFeaturedSecondary)} title="Featured detail image" />
        </div>
      </section>

      <section className={styles.section} id="project-admin-3">
        <header className={styles.sectionHeader}><span>03</span><div><p>Project page</p><h2>Project categories</h2><small>Each category preview remains connected to its filter button and scrolling animation.</small></div></header>
        {categoryMedia.length ? <div className={styles.mediaGrid}>{categoryMedia.map((category, index) => <MediaCard busy={busyKeys.includes(`category-${category.slug}`)} current={category.selected} description={`Preview shown when visitors focus or select ${category.name}.`} fallback={category.preview} key={category.id} label={`${String(index + 1).padStart(2, "0")} / Category`} onRestore={() => setCategoryMedia((current) => current.map((item) => item.id === category.id ? { ...item, selected: null } : item))} onUpload={(file) => void uploadFor(`category-${category.slug}`, file, `${category.name} projects`, (asset) => setCategoryMedia((current) => current.map((item) => item.id === category.id ? { ...item, selected: asset } : item)))} title={category.name} />)}</div> : <p className={styles.emptyState}>Category image controls will appear after the first project story is saved.</p>}
      </section>

      <section className={`${styles.section} ${styles.storySection}`} id="project-admin-4">
        <header className={styles.sectionHeader}><span>04</span><div><p>Project page</p><h2>Selected spaces and popup stories</h2><small>Upload a cover first; the project details form opens immediately afterward.</small></div><label className={styles.uploadButton}><AdminIcon name="plus" /> {startingStory ? "Uploading cover…" : "Add project story"}<input accept="image/jpeg,image/png,image/webp,image/avif" disabled={startingStory} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; void beginStory(file); }} type="file" /></label></header>
        {data.stories.length ? <div className={styles.storyList}>{data.stories.map((story, index) => <article key={story.id}>
          <div className={styles.storyThumb}>{story.images[0] ? <Image alt={story.images[0].alt} fill sizes="160px" src={story.images[0].src} style={{ objectFit: "cover" }} unoptimized={!story.images[0].src.startsWith("/")} /> : <span>No cover</span>}<i>{String(index + 1).padStart(2, "0")}</i></div>
          <div className={styles.storyIdentity}><p>{story.category || "Uncategorised"}</p><h3>{story.title}</h3><span>{story.location || "Location pending"} · {story.images.length} {story.images.length === 1 ? "image" : "images"}</span></div>
          <b data-published={story.published || undefined}>{story.published ? "Published" : "Draft"}</b>
          <div className={styles.storyActions}><button className={styles.secondaryButton} onClick={() => editStory(story)} type="button">Edit story</button><button className={styles.archiveButton} formAction={archiveProjectStory.bind(null, story.id)} onClick={(event) => { if (!window.confirm(`Archive ${story.title}?`)) event.preventDefault(); }} type="submit">Archive</button></div>
        </article>)}</div> : <p className={styles.emptyState}>No project stories yet. Upload a cover image to create the first selected space.</p>}
      </section>

      <section className={styles.section} id="project-admin-5">
        <header className={styles.sectionHeader}><span>05</span><div><p>Project page</p><h2>Project gallery</h2><small>Five horizontal archive frames. The one-line heading and scroll animation remain unchanged.</small></div></header>
        <div className={styles.mediaGrid}>{gallery.map((slot, index) => <MediaCard busy={busyKeys.includes(`gallery-${index}`)} current={slot.media} description={`Horizontal gallery frame ${index + 1}.`} fallback={data.galleryFallbacks[index] ?? null} key={`gallery-${index}`} label={`${String(index + 1).padStart(2, "0")} / Frame`} onRestore={() => setGallery((current) => current.map((item, itemIndex) => itemIndex === index ? { media: null, id: "" } : item))} onUpload={(file) => void uploadFor(`gallery-${index}`, file, `Project gallery frame ${index + 1}`, (asset) => setGallery((current) => current.map((item, itemIndex) => itemIndex === index ? { media: asset, id: asset.id } : item)))} title={`Gallery image ${index + 1}`} />)}</div>
      </section>

      <section className={styles.section} id="project-admin-6">
        <header className={styles.sectionHeader}><span>06</span><div><p>Project page</p><h2>Material sequence</h2><small>Three images used in the frame-by-frame material story.</small></div></header>
        <div className={styles.mediaGrid}>{sequence.map((slot, index) => <MediaCard busy={busyKeys.includes(`sequence-${index}`)} current={slot.media} description={`Material sequence frame ${index + 1}.`} fallback={data.sequenceFallbacks[index] ?? null} key={`sequence-${index}`} label={`${String(index + 1).padStart(2, "0")} / Sequence`} onRestore={() => setSequence((current) => current.map((item, itemIndex) => itemIndex === index ? { media: null, id: "" } : item))} onUpload={(file) => void uploadFor(`sequence-${index}`, file, `Material sequence ${index + 1}`, (asset) => setSequence((current) => current.map((item, itemIndex) => itemIndex === index ? { media: asset, id: asset.id } : item)))} title={`Sequence image ${index + 1}`} />)}</div>
      </section>

      <footer className={styles.stickyActions}><div><strong>Publish project page media</strong><span>All page-level image changes are saved together.</span></div><SubmitButton disabled={busyKeys.length > 0}>Save and publish</SubmitButton></footer>
    </form>

    {editingStory ? <StoryModal categories={categoryNames} onClose={() => setEditingStory(null)} story={editingStory} /> : null}
  </>;
}
