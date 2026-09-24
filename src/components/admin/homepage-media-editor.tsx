"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { AdminIcon } from "@/components/admin/admin-icons";
import { saveHomepageMedia } from "@/server/admin/homepage-media-actions";
import type { HomeMedia } from "@/types/home";
import type { HomepageMediaEditorData, HomepageMediaGroup, HomepageMediaSlot } from "@/types/homepage-content";
import styles from "./meet-icon-media-editor.module.css";

type UploadedAsset = Readonly<{
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}>;

function responseError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") return payload.error;
  return "The image could not be uploaded.";
}

function SaveButton({ uploading }: Readonly<{ uploading: boolean }>) {
  const { pending } = useFormStatus();
  return <button className={styles.save} disabled={pending || uploading} type="submit">{pending ? "Publishing images…" : uploading ? "Waiting for uploads…" : "Save and publish"}</button>;
}

function imageFromUpload(current: HomeMedia, asset: UploadedAsset): HomeMedia {
  return {
    ...current,
    src: asset.src,
    alt: asset.alt || current.alt,
    width: asset.width ?? current.width,
    height: asset.height ?? current.height,
  };
}

export function HomepageMediaEditor({ data }: Readonly<{ data: HomepageMediaEditorData }>) {
  const [groups, setGroups] = useState<readonly HomepageMediaGroup[]>(() => data.groups.map((group) => ({ ...group, slots: group.slots.map((slot) => ({ ...slot })) })));
  const [uploadingKeys, setUploadingKeys] = useState<readonly string[]>([]);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const uploading = uploadingKeys.length > 0;
  const replacementCount = useMemo(() => groups.flatMap((group) => group.slots).filter((slot) => slot.mediaId).length, [groups]);

  function updateSlot(key: string, update: (slot: HomepageMediaSlot) => HomepageMediaSlot) {
    setGroups((current) => current.map((group) => ({ ...group, slots: group.slots.map((slot) => slot.key === key ? update(slot) : slot) })));
  }

  async function uploadImage(slot: HomepageMediaSlot, file: File | undefined) {
    if (!file) return;
    setUploadingKeys((current) => [...current, slot.key]);
    setErrors((current) => ({ ...current, [slot.key]: "" }));
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("alt", slot.fallbackMedia.alt);
      form.set("purpose", "home");
      const response = await fetch("/api/admin/site-media", { method: "POST", body: form });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("asset" in payload)) throw new Error(responseError(payload));
      const candidate = payload.asset as Partial<UploadedAsset>;
      if (typeof candidate.id !== "string" || typeof candidate.src !== "string") throw new Error("The uploaded image response was incomplete.");
      const asset: UploadedAsset = {
        id: candidate.id,
        src: candidate.src,
        alt: typeof candidate.alt === "string" ? candidate.alt : slot.fallbackMedia.alt,
        width: typeof candidate.width === "number" ? candidate.width : undefined,
        height: typeof candidate.height === "number" ? candidate.height : undefined,
      };
      updateSlot(slot.key, (current) => ({ ...current, mediaId: asset.id, media: imageFromUpload(current.media, asset) }));
    } catch (cause) {
      setErrors((current) => ({ ...current, [slot.key]: cause instanceof Error ? cause.message : "The image could not be uploaded." }));
    } finally {
      setUploadingKeys((current) => current.filter((key) => key !== slot.key));
    }
  }

  function restoreOriginal(slot: HomepageMediaSlot) {
    updateSlot(slot.key, (current) => ({ ...current, mediaId: "", media: current.fallbackMedia }));
    setErrors((current) => ({ ...current, [slot.key]: "" }));
  }

  return <form action={saveHomepageMedia} className={styles.editor}>
    <aside className={styles.guide}>
      <div><strong>{replacementCount}</strong><span>custom images selected</span></div>
      <p>Upload JPG, PNG, WebP or AVIF images, review every preview, then publish all sections together. Empty slots continue using the original website image.</p>
    </aside>

    <nav className={styles.sectionNav} data-count={groups.length} aria-label="Home Page media sections">
      {groups.map((group) => <a href={`#home-admin-${group.id}`} key={group.id}><span>{group.number}</span><strong>{group.title}</strong><small>{group.slots.length} {group.slots.length === 1 ? "image" : "images"}</small></a>)}
    </nav>

    {groups.map((group) => <section className={styles.section} id={`home-admin-${group.id}`} key={group.id}>
      <header className={styles.sectionHeader}>
        <span>{group.number}</span>
        <div><p>Home Page media</p><h2>{group.title}</h2><small>{group.description}</small></div>
        <b>{group.slots.length} {group.slots.length === 1 ? "image" : "images"}</b>
      </header>
      <div className={styles.grid} data-count={group.slots.length}>
        {group.slots.map((slot) => {
          const isUploading = uploadingKeys.includes(slot.key);
          return <article className={styles.card} key={slot.key}>
            <input name={slot.fieldName} type="hidden" value={slot.mediaId} />
            <div className={styles.preview}>
              {slot.media.src ? <Image alt={slot.media.alt} fill sizes="(max-width: 760px) 100vw, 34vw" src={slot.media.src} style={{ objectFit: "cover", objectPosition: slot.media.position ?? "50% 50%" }} unoptimized={!slot.media.src.startsWith("/")} /> : <span>No preview available</span>}
              <i className={slot.mediaId ? styles.custom : styles.original}>{slot.mediaId ? "Custom image" : "Original image"}</i>
            </div>
            <div className={styles.cardBody}>
              <p className={styles.slotLabel}>{slot.label}</p>
              <h3>{slot.title}</h3>
              <p>{slot.description}</p>
              <small>{slot.recommendation}</small>
              <div className={styles.controls}>
                <label className={styles.uploadButton}>
                  <AdminIcon name="plus" />
                  <span>{isUploading ? "Uploading…" : slot.mediaId ? "Replace image" : "Upload image"}</span>
                  <input accept="image/jpeg,image/png,image/webp,image/avif" disabled={isUploading} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; void uploadImage(slot, file); }} type="file" />
                </label>
                {slot.mediaId ? <button className={styles.restore} disabled={isUploading} onClick={() => restoreOriginal(slot)} type="button">Restore original</button> : null}
              </div>
              {errors[slot.key] ? <p className={styles.error} role="alert">{errors[slot.key]}</p> : null}
            </div>
          </article>;
        })}
      </div>
    </section>)}

    <footer className={styles.actions}>
      <div><strong>Ready to publish?</strong><span>The public homepage changes only after you save.</span></div>
      <SaveButton uploading={uploading} />
    </footer>
  </form>;
}
