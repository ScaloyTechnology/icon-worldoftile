import Image from "next/image";
import Link from "next/link";
import { AdminFormSubmit } from "@/components/admin/admin-form-submit";
import { AdminMediaPicker, type AdminSelectableMedia } from "@/components/admin/admin-media-picker";
import { mediaUrl } from "@/lib/media";
import { getDeployedMediaCandidates } from "@/server/admin/deployed-media";
import { saveMediaAsset } from "@/server/admin/media-actions";
import { getDb } from "@/server/db";
import styles from "@/components/admin/admin-form.module.css";
import mediaStyles from "./media.module.css";

type Query = { edit?: string; action?: string; error?: string; saved?: string };
async function mediaRows() { return getDb().mediaAsset.findMany({ orderBy: { updatedAt: "desc" }, include: { _count: true } }); }
type MediaRow = Awaited<ReturnType<typeof mediaRows>>[number];
export const dynamic = "force-dynamic";

function publicUrl(key: string) { try { return mediaUrl(key); } catch { return null; } }

export default async function MediaPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let rows: MediaRow[] = [];
  let candidates: AdminSelectableMedia[] = [];
  let unavailable = false;
  try {
    rows = await mediaRows();
    if (query.action === "new") candidates = await getDeployedMediaCandidates(new Set(rows.map((row) => row.storageKey)));
  } catch (error) { console.error("Media records could not be loaded", error); unavailable = true; }
  const selected = rows.find((row) => row.id === query.edit);
  return <main className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Content studio / Assets</p><h1>Media</h1><p>Register deployed imagery, review metadata and control public approval. Runtime uploads require verified persistent storage.</p></div><Link className={styles.action} href="/admin/media?action=new">Register deployed asset <span aria-hidden="true">↗</span></Link></header>
    {unavailable ? <p className={styles.notice} role="alert">Media records or deployed assets are unavailable. No changes have been made.</p> : null}
    {query.error ? <p className={styles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved ? <p className={styles.success} role="status">Media record saved.</p> : null}
    {!unavailable ? <div className={styles.layout}>
      <section className={styles.list} aria-labelledby="media-heading"><div className={styles.sectionHeading}><h2 id="media-heading">Media records</h2><span>{rows.length} total</span></div>
        {rows.length ? <ul className={mediaStyles.list}>{rows.map((row) => {
          const src = row.mimeType.startsWith("image/") ? publicUrl(row.storageKey) : null;
          const usage = Object.values(row._count).reduce((sum, count) => sum + count, 0);
          return <li key={row.id}><Link className={mediaStyles.row} href={`/admin/media?edit=${encodeURIComponent(row.id)}`} aria-current={selected?.id === row.id ? "page" : undefined}>
            <span className={mediaStyles.thumb}>{src ? <Image alt="" fill sizes="72px" src={src} unoptimized={!src.startsWith("/")} /> : <span>{row.mimeType === "application/pdf" ? "PDF" : "IMG"}</span>}</span>
            <span className={styles.recordName}><strong>{row.originalFilename}</strong><small>{row.mimeType} / {usage} uses</small><small>{row.storageKey}</small></span>
            <span className={styles.state}>{row.approved ? "approved" : "private"}</span><span aria-hidden="true">↗</span>
          </Link></li>;
        })}</ul> : <p className={styles.empty}>No media records yet. Register a file already deployed under public/media or public/assets.</p>}
      </section>
      {selected || query.action === "new" ? <section className={styles.editor} aria-labelledby="media-editor-heading"><div className={styles.sectionHeading}><h2 id="media-editor-heading">{selected ? "Edit media" : "Register media"}</h2><Link href="/admin/media">Close</Link></div><form action={saveMediaAsset}>
        {selected ? <><input name="id" type="hidden" value={selected.id} /><label>Storage key<input name="storageKey" required readOnly value={selected.storageKey} /><small>The deployed file path stays stable.</small></label></>
          : <AdminMediaPicker name="storageKey" label="Deployed file *" assets={candidates} statusLabel="Known public asset folders" selectionStatus="Ready to register" emptyText="Browse deployed files" help="Search files in public/media and public/assets. Only one selected file is registered; no bulk import occurs." />}
        {selected && selected.mimeType.startsWith("image/") && publicUrl(selected.storageKey) ? <div className={mediaStyles.editorPreview}><Image alt={selected.alt} fill sizes="480px" src={publicUrl(selected.storageKey) ?? ""} unoptimized={!publicUrl(selected.storageKey)?.startsWith("/")} /></div> : null}
        <label>Alt text / document description *<textarea name="alt" required maxLength={300} rows={3} defaultValue={selected?.alt ?? ""} /><small>Describe what the image shows; avoid generic SEO phrases.</small></label>
        <label className={styles.checkboxRow}><input name="approved" type="checkbox" defaultChecked={selected?.approved ?? true} /><span><strong>Approved for public use</strong><small>Only approved media can be selected for public Collection and Product imagery.</small></span></label>
        {selected ? <p className={styles.hint}>{selected.mimeType} / {Number(selected.byteSize).toLocaleString()} bytes{selected.width && selected.height ? ` / ${selected.width} × ${selected.height}px` : ""} / {Object.values(selected._count).reduce((sum, count) => sum + count, 0)} associations</p> : null}
        {selected && publicUrl(selected.storageKey) ? <a className={mediaStyles.view} href={publicUrl(selected.storageKey) ?? "#"} target="_blank" rel="noopener noreferrer">View deployed file ↗</a> : null}
        <p className={styles.hint}>This registers an existing deployed file; it does not upload one. New browser uploads remain unavailable until persistent storage is configured.</p>
        <AdminFormSubmit className={styles.action} label="Save media record" />
      </form></section> : null}
    </div> : null}
  </main>;
}
