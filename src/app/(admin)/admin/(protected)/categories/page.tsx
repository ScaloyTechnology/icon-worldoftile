import Link from "next/link";
import { AdminFormSubmit } from "@/components/admin/admin-form-submit";
import type { ProductCategory } from "@/generated/prisma/client";
import { saveCategory } from "@/server/admin/category-actions";
import { getDb } from "@/server/db";
import styles from "@/components/admin/admin-form.module.css";

type Query = { edit?: string; action?: string; error?: string; saved?: string };
export const dynamic = "force-dynamic";

export default async function CategoriesPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let rows: Array<ProductCategory & { _count: { products: number; children: number } }> = [];
  let unavailable = false;
  try {
    rows = await getDb().productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { _count: { select: { products: true, children: true } } } });
  } catch (error) { console.error("Categories could not be loaded", error); unavailable = true; }
  const selected = rows.find((row) => row.id === query.edit);
  return <main className={styles.main}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Content studio / Product taxonomy</p><h1>Categories</h1><p>Controlled product grouping. Existing categories remain editable without removing linked products.</p></div><Link className={styles.action} href="/admin/categories?action=new">Add category <span aria-hidden="true">↗</span></Link></header>
    {unavailable ? <p className={styles.notice} role="alert">Categories are unavailable. No changes have been made.</p> : null}
    {query.error ? <p className={styles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved ? <p className={styles.success} role="status">Category saved.</p> : null}
    {!unavailable ? <div className={styles.layout}>
      <section className={styles.list} aria-labelledby="categories-title"><div className={styles.sectionHeading}><h2 id="categories-title">Category records</h2><span>{rows.length} total</span></div>
        {rows.length ? <ul>{rows.map((row) => <li key={row.id}><Link href={`/admin/categories?edit=${encodeURIComponent(row.id)}`} aria-current={selected?.id === row.id ? "page" : undefined}><span className={styles.order}>{String(row.sortOrder).padStart(2, "0")}</span><span className={styles.recordName}><strong>{row.name}</strong><small>/{row.slug}</small></span><span className={styles.state}>{row._count.products} products</span><span aria-hidden="true">↗</span></Link></li>)}</ul> : <p className={styles.empty}>No categories yet. Add a category to organise products.</p>}
      </section>
      {selected || query.action === "new" ? <section className={styles.editor} aria-labelledby="category-editor-title"><div className={styles.sectionHeading}><h2 id="category-editor-title">{selected ? "Edit category" : "New category"}</h2><Link href="/admin/categories">Close</Link></div><form action={saveCategory}>
        {selected ? <input name="id" type="hidden" value={selected.id} /> : null}
        <label>Name<input name="name" defaultValue={selected?.name ?? ""} maxLength={120} required /></label>
        <label>Slug<input name="slug" defaultValue={selected?.slug ?? ""} maxLength={120} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selected)} required /><small>Stable after creation.</small></label>
        <label>Display order<input name="sortOrder" type="number" min={0} max={100000} defaultValue={selected?.sortOrder ?? rows.length} required /></label>
        <label>Parent category<select name="parentId" defaultValue={selected?.parentId ?? ""}><option value="">None</option>{rows.filter((row) => row.id !== selected?.id && row.parentId !== selected?.id).map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
        <p className={styles.hint}>This schema has no category status or archive field. Linked categories are not deleted in this phase.</p>
        <AdminFormSubmit className={styles.action} label="Save category" />
      </form></section> : null}
    </div> : null}
  </main>;
}
