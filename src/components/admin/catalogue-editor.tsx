"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import { AdminIcon } from "@/components/admin/admin-icons";
import { saveCatalogue } from "@/server/admin/catalogue-actions";
import type { CatalogueAdminAsset, CatalogueAdminRecord } from "@/types/catalogues-admin";
import styles from "./catalogue-editor.module.css";

function responseError(payload: unknown) {
  if (typeof payload === "object" && payload !== null && "error" in payload && typeof payload.error === "string") return payload.error;
  return "The file could not be uploaded.";
}

function SaveButton({ disabled }: Readonly<{ disabled: boolean }>) {
  const { pending } = useFormStatus();
  return <button className={styles.save} disabled={disabled || pending} type="submit">{pending ? "Saving…" : "Save catalogue"}</button>;
}

function slugify(value: string) {
  return value.toLocaleLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
}

export function CatalogueEditor({ catalogue, error, returnHref }: Readonly<{ catalogue: CatalogueAdminRecord | null; error?: string; returnHref: string }>) {
  const [title, setTitle] = useState(catalogue?.title ?? "");
  const [slug, setSlug] = useState(catalogue?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(catalogue?.slug));
  const [state, setState] = useState<"DRAFT" | "PUBLISHED">(catalogue?.state ?? "DRAFT");
  const [cover, setCover] = useState<CatalogueAdminAsset | null>(catalogue?.cover ?? null);
  const [pdf, setPdf] = useState<CatalogueAdminAsset | null>(catalogue?.pdf ?? null);
  const [uploading, setUploading] = useState<"cover" | "pdf" | null>(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  async function upload(kind: "cover" | "pdf", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setUploadError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("kind", kind);
      form.set("alt", kind === "cover" ? `${title || "ICON"} catalogue cover` : file.name);
      const response = await fetch("/api/admin/catalogue-media", { method: "POST", body: form });
      const payload: unknown = await response.json();
      if (!response.ok || typeof payload !== "object" || payload === null || !("asset" in payload)) throw new Error(responseError(payload));
      const candidate = payload.asset as Partial<CatalogueAdminAsset>;
      if (!candidate.id || !candidate.src || !candidate.mimeType) throw new Error("The uploaded file response was incomplete.");
      const asset: CatalogueAdminAsset = {
        id: candidate.id,
        src: candidate.src,
        alt: candidate.alt ?? "",
        filename: candidate.filename ?? file.name,
        byteSize: candidate.byteSize ?? String(file.size),
        mimeType: candidate.mimeType,
        width: candidate.width ?? null,
        height: candidate.height ?? null,
      };
      if (kind === "cover") setCover(asset); else setPdf(asset);
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "The file could not be uploaded.");
    } finally {
      setUploading(null);
    }
  }

  const pdfMegabytes = pdf ? Number(pdf.byteSize) / (1024 * 1024) : 0;

  return <div aria-labelledby="catalogue-editor-title" aria-modal="true" className={styles.backdrop} role="dialog">
    <div className={styles.modal}>
      <header>
        <div><p>Content / Catalogues</p><h2 id="catalogue-editor-title">{catalogue ? `Edit ${catalogue.title}` : "Add catalogue"}</h2><span>Upload a cover and PDF, then publish it directly to the public catalogue library.</span></div>
        <Link aria-label="Close catalogue editor" href={returnHref}><AdminIcon name="close" /></Link>
      </header>
      <form action={saveCatalogue}>
        <input name="id" type="hidden" value={catalogue?.id ?? ""} />
        <input name="coverId" type="hidden" value={cover?.id ?? ""} />
        <input name="pdfId" type="hidden" value={pdf?.id ?? ""} />

        {(error || uploadError) ? <p className={styles.error} role="alert">{uploadError || error}</p> : null}

        <section className={styles.identity}>
          <div className={styles.sectionTitle}><span>01</span><div><h3>Catalogue identity</h3><p>The public title and stable URL identifier.</p></div></div>
          <div className={styles.fields}>
            <label><span>Catalogue title</span><input name="title" onChange={(event) => { const next = event.target.value; setTitle(next); if (!slugTouched) setSlug(slugify(next)); }} placeholder="Surface Collection" required value={title} /></label>
            <label><span>URL slug</span><input name="slug" onChange={(event) => { setSlugTouched(true); setSlug(slugify(event.target.value)); }} placeholder="surface-collection" required value={slug} /></label>
            <label><span>Publishing status</span><select name="state" onChange={(event) => setState(event.target.value as "DRAFT" | "PUBLISHED")} value={state}><option value="DRAFT">Save as draft</option><option value="PUBLISHED">Publish on website</option></select></label>
          </div>
        </section>

        <section>
          <div className={styles.sectionTitle}><span>02</span><div><h3>Catalogue files</h3><p>The cover appears in the public grid; the PDF is released after the enquiry form.</p></div></div>
          <div className={styles.mediaGrid}>
            <article className={styles.mediaCard}>
              <div className={styles.coverPreview}>{cover ? <Image alt={cover.alt} fill sizes="260px" src={cover.src} style={{ objectFit: "cover" }} unoptimized={!cover.src.startsWith("/")} /> : <span>Cover preview</span>}</div>
              <div><p>Cover image</p><h4>{cover?.filename ?? "No cover selected"}</h4><small>JPG, PNG, WebP or AVIF · portrait artwork recommended</small><label className={styles.upload}><AdminIcon name="plus" />{uploading === "cover" ? "Uploading…" : cover ? "Replace cover" : "Upload cover"}<input accept="image/jpeg,image/png,image/webp,image/avif" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; void upload("cover", file); }} type="file" /></label></div>
            </article>
            <article className={styles.mediaCard}>
              <div className={styles.pdfPreview}><span>PDF</span><i>{pdf ? `${pdfMegabytes.toFixed(pdfMegabytes >= 10 ? 0 : 1)} MB` : "Digital publication"}</i></div>
              <div><p>Download file</p><h4>{pdf?.filename ?? "No PDF selected"}</h4><small>The public form unlocks this file after submission.</small><label className={styles.upload}><AdminIcon name="plus" />{uploading === "pdf" ? "Uploading…" : pdf ? "Replace PDF" : "Upload PDF"}<input accept="application/pdf" disabled={Boolean(uploading)} onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; void upload("pdf", file); }} type="file" /></label></div>
            </article>
          </div>
        </section>

        <footer><Link href={returnHref}>Cancel</Link><div><span>{state === "PUBLISHED" ? "This catalogue will appear immediately." : "This catalogue will remain hidden from visitors."}</span><SaveButton disabled={Boolean(uploading) || !cover || !pdf || !title || !slug} /></div></footer>
      </form>
    </div>
  </div>;
}
