import Link from "next/link";

import { AdminDeleteForm } from "@/components/admin/admin-delete-form";
import { AdminIcon } from "@/components/admin/admin-icons";
import listStyles from "@/components/admin/admin-list.module.css";
import { AdminEmptyState, AdminPageHeader, AdminTableShell } from "@/components/admin/admin-ui";
import { SizeMasterEditor } from "@/components/admin/size-master-editor";
import styles from "@/components/admin/size-master.module.css";
import { deleteSize } from "@/server/admin/size-actions";
import { getSizeMaster } from "@/server/admin/size-master";
import { requireAdmin } from "@/server/auth/session";

export const dynamic = "force-dynamic";

type Query = Readonly<{ editor?: string; error?: string; saved?: string; deleted?: string }>;

export default async function AdminSizesPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  await requireAdmin();
  const query = await searchParams;
  let sizes: Awaited<ReturnType<typeof getSizeMaster>> = [];
  let unavailable = false;
  try { sizes = await getSizeMaster(); }
  catch (cause) { console.error("Size master could not be loaded", cause); unavailable = true; }
  const editor = typeof query.editor === "string" ? query.editor.slice(0, 64) : "";
  const selected = sizes.find(size => size.id === editor);
  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Catalog" title="Sizes" description="Manage the shared Size library used by all products." action={<Link className={listStyles.primaryButton} href="/admin/sizes?editor=new"><AdminIcon name="plus" />Add size</Link>} />
    {typeof query.error === "string" ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 300)}</p> : null}
    {query.saved ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">{query.saved === "existing" ? "This Size already exists in the library. Its existing record was kept." : "Size saved. Existing product assignments were preserved."}</p> : null}
    {query.deleted === "1" ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Unused Size deleted.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">The Size library is unavailable. No changes have been made.</p> : <>
      {editor === "new" || selected ? <SizeMasterEditor key={editor} size={selected} /> : editor ? <p className={listStyles.notice} role="alert">This Size no longer exists.</p> : null}
      <p className={styles.note}>Existing product sizes are already part of this library. Select multiple sizes using checkboxes in the product form; thickness is saved separately for each product size. Sizes assigned to products cannot be deleted.</p>
      <AdminTableShell><div className={listStyles.tableScroll}><table className={`${listStyles.table} ${styles.table}`}>
        <thead><tr><th>Size</th><th>Width (mm)</th><th>Length (mm)</th><th>Product variants</th><th>Actions</th></tr></thead>
        <tbody>{sizes.length ? sizes.map(size => <tr key={size.id}>
          <td><strong>{size.label}</strong></td><td>{size.widthMm}</td><td>{size.lengthMm}</td><td>{size.assignments}</td>
          <td><div className={styles.rowActions}>
            <Link aria-label={`Edit ${size.label}`} href={`/admin/sizes?editor=${encodeURIComponent(size.id)}`}>Edit</Link>
            {size.assignments ? <button disabled title="Assigned Sizes cannot be deleted." type="button">Delete (in use)</button> : <AdminDeleteForm action={deleteSize} id={size.id} label="Delete" message={`Delete ${size.label} from the Size library?`} />}
          </div></td>
        </tr>) : <tr><td colSpan={5}><AdminEmptyState title="No Sizes yet.">Add a Size to make it available in the product form.</AdminEmptyState></td></tr>}</tbody>
      </table></div></AdminTableShell>
    </>}
  </main>;
}
