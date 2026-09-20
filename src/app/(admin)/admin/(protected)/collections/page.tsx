import Link from "next/link";

import { AdminCollectionMediaFields } from "@/components/admin/admin-collection-media-fields";
import { AdminFormSubmit } from "@/components/admin/admin-form-submit";
import type { AdminSelectableMedia } from "@/components/admin/admin-media-picker";
import type { Collection } from "@/generated/prisma/client";
import { mediaUrl } from "@/lib/media";
import { archiveCollection, saveCollection } from "@/server/admin/collection-actions";
import { getDb } from "@/server/db";

import styles from "@/components/admin/admin-form.module.css";

type PageQuery = { edit?: string; action?: string; error?: string; saved?: string };

export const dynamic = "force-dynamic";

export default async function AdminCollectionsPage({ searchParams }: Readonly<{ searchParams: Promise<PageQuery> }>) {
  const query = await searchParams;
  let records: Collection[] = [];
  let media: AdminSelectableMedia[] = [];
  let databaseError = false;
  try {
    const db = getDb();
    const [collectionRows, mediaRows] = await Promise.all([
      db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { homepageOrder: "asc" }, { id: "asc" }] }),
      db.mediaAsset.findMany({ where: { approved: true, mimeType: { startsWith: "image/" } }, orderBy: { updatedAt: "desc" }, select: { id: true, originalFilename: true, alt: true, storageKey: true, mimeType: true } }),
    ]);
    records = collectionRows;
    media = mediaRows.flatMap((asset) => {
      try { return [{ id: asset.id, filename: asset.originalFilename, alt: asset.alt, src: mediaUrl(asset.storageKey), mimeType: asset.mimeType }]; }
      catch { return []; }
    });
  } catch (error) {
    console.error("Admin collections could not be loaded", error);
    databaseError = true;
  }
  const selected = query.edit ? records.find((record) => record.id === query.edit) : null;
  const showEditor = query.action === "new" || Boolean(selected);

  return <main className={styles.main}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>Content studio / Collections</p><h1>Collections</h1><p>Manage the material groups shown on the public website.</p></div>
      <Link className={styles.action} href="/admin/collections?action=new">Add collection <span aria-hidden="true">↗</span></Link>
    </header>

    {databaseError ? <p className={styles.notice} role="alert">Collections are unavailable. Check the database connection; no changes have been made.</p> : null}
    {query.error ? <p className={styles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved ? <p className={styles.success} role="status">Collection saved. Public pages have been refreshed.</p> : null}

    {!databaseError ? <div className={styles.layout}>
      <section className={styles.list} aria-labelledby="collections-list-title">
        <div className={styles.sectionHeading}><h2 id="collections-list-title">Collection records</h2><span>{records.length} total</span></div>
        {records.length ? <ul>{records.map((record) => <li key={record.id}>
          <Link aria-current={selected?.id === record.id ? "page" : undefined} href={`/admin/collections?edit=${encodeURIComponent(record.id)}`}>
            <span className={styles.order}>{String(record.sortOrder).padStart(2, "0")}</span>
            <span className={styles.recordName}><strong>{record.name}</strong><small>/{record.slug}</small></span>
            <span className={styles.state}>{record.state.toLowerCase()}{record.isFeatured ? " / homepage" : ""}</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </li>)}</ul> : <p className={styles.empty}>No collections yet. Add the first collection, attach an approved image, and publish it when ready.</p>}
      </section>

      {showEditor ? <section className={`${styles.editor} ${styles.collectionEditor}`} aria-labelledby="collection-editor-title">
        <div className={styles.sectionHeading}><h2 id="collection-editor-title">{selected ? "Edit collection" : "New collection"}</h2><Link href="/admin/collections">Close</Link></div>
        <form action={saveCollection}>
          {selected ? <input name="id" type="hidden" value={selected.id} /> : null}
          <div className={styles.formSection}><div className={styles.formSectionTitle}><span>01 / Details</span><h3>Collection identity</h3></div>
            <label><span>Name *</span><input autoComplete="off" defaultValue={selected?.name ?? ""} maxLength={120} name="name" required /></label>
            <label><span>Slug *</span><input autoComplete="off" defaultValue={selected?.slug ?? ""} maxLength={120} name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selected)} required /><small>{selected ? "Stable after creation so public links keep working." : "Lowercase letters, numbers and hyphens only."}</small></label>
            <label>Description<textarea defaultValue={selected?.description ?? ""} maxLength={1500} name="description" rows={3} /></label>
          </div>
          <div className={styles.formSection}><div className={styles.formSectionTitle}><span>02 / Visibility</span><h3>Publishing</h3></div>
            <div className={styles.fields}><label>Status<select defaultValue={selected?.state ?? "DRAFT"} name="state"><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select><small>Published Collections are available to Products filtering.</small></label>
              <label className={styles.checkboxRow}><input defaultChecked={selected?.isFeatured ?? false} name="isFeatured" type="checkbox" /><span><strong>Show on homepage</strong><small>Requires Published status and an approved image.</small></span></label></div>
            <div className={styles.fields}><label>List order<input defaultValue={selected?.sortOrder ?? records.length} max={100000} min={0} name="sortOrder" required type="number" /><small>Controls public Collection order.</small></label>
              <label>Homepage order<input defaultValue={selected?.homepageOrder ?? records.length} max={100000} min={0} name="homepageOrder" required type="number" /><small>Controls Material Desk order.</small></label></div>
          </div>
          <div className={styles.formSection}><div className={styles.formSectionTitle}><span>03 / Imagery</span><h3>Collection media</h3></div><AdminCollectionMediaFields key={selected?.id ?? "new"} assets={media} coverId={selected?.coverMediaId} heroId={selected?.heroMediaId} error={query.error?.includes("image") ? query.error.slice(0, 240) : undefined} /></div>
          <div className={styles.formActions}><AdminFormSubmit className={styles.action} label="Save collection" /><Link href="/admin/collections">Cancel</Link></div>
        </form>
        {selected && selected.state !== "ARCHIVED" ? <form className={styles.archiveForm} action={archiveCollection}><input type="hidden" name="id" value={selected.id} /><p>Archiving removes this Collection from public selection without deleting its record or relationships.</p><button type="submit">Archive collection</button></form> : null}
      </section> : null}
    </div> : null}
  </main>;
}
