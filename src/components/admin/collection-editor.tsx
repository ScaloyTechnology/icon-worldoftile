"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveCollection } from "@/server/admin/collection-actions";
import type { CollectionEditorData } from "@/server/admin/collection-editor-data";
import type { ProductEditorMedia } from "@/server/admin/product-editor-data";
import { AdminMediaPicker } from "./product-editor";
import styles from "./product-editor.module.css";

type CollectionEditorProps = Readonly<{
  data: CollectionEditorData;
  error?: string;
  onCancel?: () => void;
  onDirty?: () => void;
  onPendingChange?: (pending: boolean) => void;
}>;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function PendingBridge({ onChange }: Readonly<{ onChange?: (pending: boolean) => void }>) {
  const { pending } = useFormStatus();
  useEffect(() => onChange?.(pending), [onChange, pending]);
  return null;
}

function SubmitControls({ saveChanges, onCancel }: Readonly<{ saveChanges: boolean; onCancel?: () => void }>) {
  const { pending } = useFormStatus();
  return <>
    <button className={styles.tertiary} disabled={pending} name="intent" type="submit" value="draft">Save draft</button>
    <button className={styles.primary} disabled={pending} name="intent" type="submit" value={saveChanges ? "save" : "publish"}>{pending ? "Saving..." : saveChanges ? "Save changes" : "Publish collection"}</button>
    <button className={styles.cancel} disabled={pending} onClick={onCancel} type="button">Cancel</button>
  </>;
}

export function CollectionEditor({ data, error, onCancel, onDirty, onPendingChange }: CollectionEditorProps) {
  const collection = data.collection;
  const [name, setName] = useState(collection?.name ?? "");
  const [slug, setSlug] = useState(collection?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(collection));
  const [coverMediaId, setCoverMediaId] = useState(collection?.coverMediaId ?? "");
  const [heroMediaId, setHeroMediaId] = useState(collection?.heroMediaId ?? "");
  const [images, setImages] = useState<ProductEditorMedia[]>([...data.images]);
  const touch = () => onDirty?.();
  const addImage = (asset: ProductEditorMedia) => setImages((current) => current.some((item) => item.id === asset.id) ? current : [asset, ...current]);

  return <div className={styles.editor}>
    <header className={styles.header}>
      <div><p>Content studio / Collections</p><h1 id="collection-editor-title">{collection ? `Edit ${collection.name}` : "Add collection"}</h1><span>Public grouping and homepage eligibility in one concise record.</span></div>
      <button autoFocus aria-label="Close Collection editor" className={styles.close} onClick={onCancel} type="button">&times;</button>
    </header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}

    <form action={saveCollection} className={styles.form} onChange={touch}>
      <PendingBridge onChange={onPendingChange} />
      <input name="id" type="hidden" value={collection?.id ?? ""} />
      <input name="coverMediaId" type="hidden" value={coverMediaId} />
      <input name="heroMediaId" type="hidden" value={heroMediaId} />

      <div className={styles.formBody}>
        <section>
          <div className={styles.sectionTitle}><span>01</span><div><h2>Basic information</h2><p>Identity and concise public copy.</p></div></div>
          <div className={styles.fields}>
            <label>Collection name *<input name="name" required maxLength={160} value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugTouched) setSlug(slugify(next)); }} /></label>
            <label className={styles.slugField}>Public slug *<input name="slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value.toLowerCase()); }} /><small>Suggested for new Collections. Existing slugs remain stable unless edited.</small></label>
            <label className={styles.wide}>Short description<textarea name="description" rows={4} maxLength={1000} defaultValue={collection?.description ?? ""} placeholder="A concise description for public Collection experiences." /></label>
          </div>
        </section>

        <section>
          <div className={styles.sectionTitle}><span>02</span><div><h2>Images</h2><p>Approved imagery used by public Collection experiences.</p></div></div>
          <div className={styles.mediaSection}><h3>Main image</h3><p>Required when a published Collection is Featured on Homepage.</p><AdminMediaPicker altPlaceholder="Describe this Collection image" assets={images} selected={coverMediaId ? [coverMediaId] : []} onSelect={(id) => { setCoverMediaId(id); touch(); }} onRemove={() => { setCoverMediaId(""); touch(); }} onUpload={addImage} empty="No approved images are available." /></div>
          <div className={styles.mediaSection}><h3>Homepage image <small>(optional)</small></h3><p>Overrides the Main Image on the homepage when selected.</p><AdminMediaPicker altPlaceholder="Describe this homepage Collection image" assets={images} selected={heroMediaId ? [heroMediaId] : []} onSelect={(id) => { setHeroMediaId(id); touch(); }} onRemove={() => { setHeroMediaId(""); touch(); }} onUpload={addImage} empty="No approved images are available." /></div>
        </section>

        <section>
          <div className={styles.sectionTitle}><span>03</span><div><h2>Visibility</h2><p>Public availability, homepage eligibility and deterministic ordering.</p></div></div>
          <div className={styles.fields}>
            <label>Status<select name="state" defaultValue={collection?.state ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select><small>Only Published Collections appear in the public Product filter.</small></label>
            <label>Display order<input name="sortOrder" type="number" min={0} max={100000} defaultValue={collection?.sortOrder ?? 0} /></label>
            <label>Homepage order<input name="homepageOrder" type="number" min={0} max={100000} defaultValue={collection?.homepageOrder ?? 0} /><small>Used after Featured and Published eligibility checks.</small></label>
            <label className={styles.toggle}><input name="isFeatured" type="checkbox" defaultChecked={collection?.isFeatured} /><span><strong>Featured on Homepage</strong><small>Published Featured Collections also require an approved Main Image.</small></span></label>
          </div>
        </section>
      </div>

      <footer className={styles.actions}><SubmitControls saveChanges={Boolean(collection && collection.state !== "DRAFT")} onCancel={onCancel} /></footer>
    </form>
  </div>;
}
