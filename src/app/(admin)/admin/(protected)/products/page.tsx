import Image from "next/image";
import Link from "next/link";

import { AdminIcon } from "@/components/admin/admin-icons";
import { AdminToggleForm } from "@/components/admin/admin-table-controls";
import { AdminActionMenu, AdminBadge, AdminEmptyState, AdminFilter, AdminPageHeader, AdminSearch, AdminTableShell } from "@/components/admin/admin-ui";
import { AdminSuccessToast } from "@/components/admin/admin-success-toast";
import { ProductEditorModal } from "@/components/admin/product-editor-modal";
import listStyles from "@/components/admin/admin-list.module.css";
import { mediaUrl } from "@/lib/media";
import { archiveProduct, toggleProductFeatured, toggleProductPublished } from "@/server/admin/product-actions";
import { getProductEditorData, type ProductEditorData } from "@/server/admin/product-editor-data";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

type Query = Readonly<{ q?: string; status?: string; category?: string; collection?: string; featured?: string; editor?: string; error?: string; archived?: string; saved?: string }>;
const states = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

function validState(value: string | undefined): (typeof states)[number] | null { return states.find((state) => state === value) ?? null; }
function validFeatured(value: string | undefined) { return value === "yes" || value === "no" ? value : null; }
function cleanId(value: string | undefined) { return typeof value === "string" ? value.trim().slice(0, 64) : ""; }
function imageUrl(key: string | undefined) { if (!key) return null; try { return mediaUrl(key); } catch { return null; } }
function tone(state: (typeof states)[number]) { return state === "PUBLISHED" ? "success" : state === "ARCHIVED" ? "danger" : "warning"; }
function productsHref(parameters: Record<string, string | undefined>) { const values = new URLSearchParams(); Object.entries(parameters).forEach(([key, value]) => { if (value) values.set(key, value); }); const suffix = values.toString(); return suffix ? `/admin/products?${suffix}` : "/admin/products"; }

export default async function AdminProductsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = validState(query.status);
  const categoryId = cleanId(query.category);
  const collectionId = cleanId(query.collection);
  const featured = validFeatured(query.featured);
  const editorId = cleanId(query.editor);
  let unavailable = false;
  let products: Awaited<ReturnType<typeof readProducts>> = [];
  let filters: Awaited<ReturnType<typeof readFilters>> = { categories: [], collections: [] };
  let editorData: ProductEditorData | null = null;
  let editorIssue = "";

  try { [products, filters] = await Promise.all([readProducts(search, status, categoryId, collectionId, featured), readFilters()]); }
  catch (error) { console.error("Admin Products could not be loaded", error); unavailable = true; }

  if (editorId) {
    try {
      editorData = await getProductEditorData(editorId === "new" ? undefined : editorId);
      if (editorId !== "new" && !editorData.product) { editorData = null; editorIssue = "The selected Product no longer exists."; }
    } catch (error) { console.error("Product editor data could not be loaded", error); editorIssue = "The Product editor is temporarily unavailable. No changes have been made."; }
  }

  const preserved = { q: search || undefined, status: status ?? undefined, category: categoryId || undefined, collection: collectionId || undefined, featured: featured ?? undefined };
  const listHref = productsHref(preserved);
  const editorHref = (id: string) => productsHref({ ...preserved, editor: id });

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Catalog" title="Products" description="Manage your product catalogue." action={<Link className={listStyles.primaryButton} data-add-product href={editorHref("new")}><AdminIcon name="plus" />Add product</Link>} />

    {query.error && !editorId ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.archived ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Product archived and removed from public Product routes.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">Products are unavailable. No changes have been made.</p> : null}
    {editorIssue ? <p className={listStyles.notice} role="alert">{editorIssue}</p> : null}
    {query.saved === "1" ? <AdminSuccessToast className={listStyles.toast} detail="The catalogue and public Product routes were updated." returnHref={listHref} title="Product saved." /> : null}

    <form className={listStyles.filters}>
      <AdminSearch label="Search Products" defaultValue={search} placeholder="Search by product name, code or slug" />
      <AdminFilter label="Filter by Category" name="category" defaultValue={categoryId}><option value="">All categories</option>{filters.categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</AdminFilter>
      <AdminFilter label="Filter by Collection" name="collection" defaultValue={collectionId}><option value="">All collections</option>{filters.collections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</AdminFilter>
      <AdminFilter label="Filter by status" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{states.map((item) => <option key={item} value={item}>{item.toLowerCase()}</option>)}</AdminFilter>
      <AdminFilter label="Filter by Featured state" name="featured" defaultValue={featured ?? ""}><option value="">Featured: all</option><option value="yes">Featured</option><option value="no">Not featured</option></AdminFilter>
      <button type="submit">Apply</button><Link className={listStyles.reset} href="/admin/products">Reset</Link>
    </form>

    <div className={listStyles.results}><span><strong>{products.length}</strong> {products.length === 1 ? "product" : "products"}</span><span>Live database records</span></div>
    {!unavailable ? <AdminTableShell><div className={listStyles.tableScroll}><table className={listStyles.table}>
      <thead><tr><th>Product</th><th>Category</th><th>Collections</th><th>Status</th><th>Published</th><th>Featured</th><th>Updated</th><th><span className={listStyles.visuallyHidden}>Actions</span></th></tr></thead>
      <tbody>{products.length ? products.map((product) => {
        const src = imageUrl(product.previewMedia?.storageKey ?? product.primaryTexture?.storageKey ?? product.images[0]?.media.storageKey);
        return <tr key={product.id}>
          <td><span className={listStyles.productCell}><span className={listStyles.thumb}>{src ? <Image alt="" fill sizes="42px" src={src} unoptimized={!src.startsWith("/")} /> : <i>IMG</i>}</span><span className={listStyles.identity}><strong>{product.name}</strong><small>{product.code || `/${product.slug}`}</small></span></span></td>
          <td>{product.category?.name ?? <span className={listStyles.secondary}>Unassigned</span>}</td>
          <td><span className={listStyles.truncate}>{product.collections.map((item) => item.collection.name).join(", ") || "Unassigned"}</span></td>
          <td><AdminBadge tone={tone(product.state)}>{product.state.toLowerCase()}</AdminBadge></td>
          <td className={listStyles.toggleCell}><AdminToggleForm action={toggleProductPublished} checked={product.state === "PUBLISHED"} disabled={product.state === "ARCHIVED"} id={product.id} label={`${product.state === "PUBLISHED" ? "Move" : "Publish"} ${product.name}${product.state === "PUBLISHED" ? " to Draft" : ""}`} /></td>
          <td className={listStyles.toggleCell}><AdminToggleForm action={toggleProductFeatured} checked={product.isFeatured} id={product.id} label={`${product.isFeatured ? "Remove" : "Mark"} ${product.name} ${product.isFeatured ? "from" : "as"} Featured`} /></td>
          <td><time className={listStyles.updated} dateTime={product.updatedAt.toISOString()}>{product.updatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time></td>
          <td className={listStyles.menuCell}><AdminActionMenu label={`Actions for ${product.name}`}><Link href={editorHref(product.id)}>Edit</Link>{product.state === "PUBLISHED" ? <Link href={`/products/${product.slug}`} target="_blank">View product</Link> : null}{product.state !== "ARCHIVED" ? <form action={archiveProduct}><input name="id" type="hidden" value={product.id} /><button type="submit">Archive</button></form> : null}</AdminActionMenu></td>
        </tr>;
      }) : <tr className={listStyles.emptyRow}><td colSpan={8}><AdminEmptyState title="No Products found.">Add the first Product or adjust the current search and filters.</AdminEmptyState></td></tr>}</tbody>
    </table></div></AdminTableShell> : null}
    {editorData ? <ProductEditorModal data={editorData} error={query.error?.slice(0, 240)} returnHref={listHref} /> : null}
  </main>;
}

async function readFilters() {
  const db = getDb();
  const [categories, collections] = await Promise.all([
    db.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
  ]);
  return { categories, collections };
}

async function readProducts(search: string, status: (typeof states)[number] | null, categoryId: string, collectionId: string, featured: "yes" | "no" | null) {
  return getDb().product.findMany({
    where: {
      ...(status ? { state: status } : {}), ...(categoryId ? { categoryId } : {}), ...(collectionId ? { collections: { some: { collectionId } } } : {}), ...(featured ? { isFeatured: featured === "yes" } : {}),
      ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { code: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] } : {}),
    },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: {
      id: true, name: true, slug: true, code: true, state: true, isFeatured: true, updatedAt: true,
      category: { select: { name: true } }, collections: { orderBy: { sortOrder: "asc" }, select: { collection: { select: { name: true } } } },
      previewMedia: { select: { storageKey: true } }, primaryTexture: { select: { storageKey: true } },
      images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, take: 1, select: { media: { select: { storageKey: true } } } },
    },
  });
}
