import Image from "next/image";
import Link from "next/link";

import { AdminIcon } from "@/components/admin/admin-icons";
import listStyles from "@/components/admin/admin-list.module.css";
import { AdminActionMenu, AdminBadge, AdminEmptyState, AdminPageHeader, AdminTableShell } from "@/components/admin/admin-ui";
import { CatalogueEditor } from "@/components/admin/catalogue-editor";
import { mediaUrl } from "@/lib/media";
import { archiveCatalogue } from "@/server/admin/catalogue-actions";
import { getDb } from "@/server/db";
import type { CatalogueAdminAsset, CatalogueAdminRecord } from "@/types/catalogues-admin";

export const dynamic = "force-dynamic";

type Query = Readonly<{ editor?: string; saved?: string; archived?: string; error?: string }>;

function cleanId(value: string | undefined) {
  return typeof value === "string" ? value.trim().slice(0, 64) : "";
}

function asset(record: {
  id: string;
  storageKey: string;
  alt: string;
  originalFilename: string;
  byteSize: bigint;
  mimeType: string;
  width: number | null;
  height: number | null;
} | null): CatalogueAdminAsset | null {
  if (!record) return null;
  try {
    return {
      id: record.id,
      src: mediaUrl(record.storageKey),
      alt: record.alt,
      filename: record.originalFilename,
      byteSize: record.byteSize.toString(),
      mimeType: record.mimeType,
      width: record.width,
      height: record.height,
    };
  } catch {
    return null;
  }
}

export default async function AdminCataloguesPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const editorId = cleanId(query.editor);
  let unavailable = false;
  let records: CatalogueAdminRecord[] = [];
  try {
    const rows = await getDb().catalogue.findMany({
      where: { state: { not: "ARCHIVED" } },
      orderBy: [{ updatedAt: "desc" }, { title: "asc" }],
      include: { cover: true, pdf: true },
    });
    records = rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      state: row.state === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
      updatedAt: row.updatedAt.toISOString(),
      cover: asset(row.cover),
      pdf: asset(row.pdf),
    }));
  } catch (cause) {
    console.error("Admin catalogues could not be loaded", cause);
    unavailable = true;
  }

  const selectedCatalogue = editorId && editorId !== "new" ? records.find((record) => record.id === editorId) ?? null : null;
  const editorOpen = editorId === "new" || Boolean(selectedCatalogue);

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Content" title="Catalogues" description="Manage catalogue covers and gated PDF downloads on the public website." action={<Link className={listStyles.primaryButton} href="/admin/catalogues?editor=new"><AdminIcon name="plus" />Add catalogue</Link>} />
    {query.error && !editorOpen ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved === "1" ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Catalogue saved. Published changes are now available on the public page.</p> : null}
    {query.archived === "1" ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Catalogue archived and removed from the public library.</p> : null}
    {editorId && editorId !== "new" && !selectedCatalogue && !unavailable ? <p className={listStyles.notice} role="alert">The selected catalogue no longer exists.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">Catalogues are temporarily unavailable. No changes have been made.</p> : null}

    <div className={listStyles.results}><span><strong>{records.length}</strong> {records.length === 1 ? "catalogue" : "catalogues"}</span><span>Cover and PDF records</span></div>
    {!unavailable ? <AdminTableShell><div className={listStyles.tableScroll}><table className={listStyles.table}>
      <thead><tr><th>Catalogue</th><th>PDF file</th><th>Status</th><th>Updated</th><th><span className={listStyles.visuallyHidden}>Actions</span></th></tr></thead>
      <tbody>{records.length ? records.map((record) => {
        const pdfSize = record.pdf ? Number(record.pdf.byteSize) / (1024 * 1024) : 0;
        return <tr key={record.id}>
          <td><span className={listStyles.productCell}><span className={listStyles.thumb}>{record.cover ? <Image alt="" fill sizes="42px" src={record.cover.src} style={{ objectFit: "cover" }} unoptimized={!record.cover.src.startsWith("/")} /> : <i>IMG</i>}</span><span className={listStyles.identity}><strong>{record.title}</strong><small>/{record.slug}</small></span></span></td>
          <td>{record.pdf ? <span className={listStyles.identity}><strong>{record.pdf.filename}</strong><small>{pdfSize.toFixed(pdfSize >= 10 ? 0 : 1)} MB</small></span> : <span className={listStyles.warning}>PDF required</span>}</td>
          <td><AdminBadge tone={record.state === "PUBLISHED" ? "success" : "warning"}>{record.state.toLowerCase()}</AdminBadge></td>
          <td><time className={listStyles.updated} dateTime={record.updatedAt}>{new Date(record.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time></td>
          <td className={listStyles.menuCell}><AdminActionMenu label={`Actions for ${record.title}`}><Link href={`/admin/catalogues?editor=${encodeURIComponent(record.id)}`}>Edit</Link>{record.state === "PUBLISHED" ? <Link href="/catalogues" target="_blank">View public page</Link> : null}<form action={archiveCatalogue.bind(null, record.id)}><button type="submit">Archive</button></form></AdminActionMenu></td>
        </tr>;
      }) : <tr className={listStyles.emptyRow}><td colSpan={5}><AdminEmptyState title="No catalogues added yet.">Add a cover and PDF to publish the first digital catalogue.</AdminEmptyState></td></tr>}</tbody>
    </table></div></AdminTableShell> : null}

    {editorOpen ? <CatalogueEditor catalogue={selectedCatalogue} error={query.error?.slice(0, 240)} returnHref="/admin/catalogues" /> : null}
  </main>;
}
