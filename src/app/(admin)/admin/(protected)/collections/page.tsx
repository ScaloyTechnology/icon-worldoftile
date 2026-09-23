import Image from "next/image";
import Link from "next/link";

import { AdminIcon } from "@/components/admin/admin-icons";
import listStyles from "@/components/admin/admin-list.module.css";
import { AdminSuccessToast } from "@/components/admin/admin-success-toast";
import { AdminToggleForm } from "@/components/admin/admin-table-controls";
import { AdminActionMenu, AdminBadge, AdminEmptyState, AdminFilter, AdminPageHeader, AdminSearch, AdminTableShell } from "@/components/admin/admin-ui";
import { CollectionEditorModal } from "@/components/admin/collection-editor-modal";
import { mediaUrl } from "@/lib/media";
import { archiveCollection, toggleCollectionFeatured, toggleCollectionPublished } from "@/server/admin/collection-actions";
import { getCollectionEditorData, type CollectionEditorData } from "@/server/admin/collection-editor-data";
import { getDb } from "@/server/db";

export const dynamic = "force-dynamic";

type Query = Readonly<{ q?: string; status?: string; featured?: string; editor?: string; error?: string; archived?: string; saved?: string }>;
const states = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
function validState(value: string | undefined): (typeof states)[number] | null { return states.find((state) => state === value) ?? null; }
function validFeatured(value: string | undefined) { return value === "yes" || value === "no" ? value : null; }
function cleanId(value: string | undefined) { return typeof value === "string" ? value.trim().slice(0, 64) : ""; }
function imageUrl(key: string | undefined) { if (!key) return null; try { return mediaUrl(key); } catch { return null; } }
function tone(state: (typeof states)[number]) { return state === "PUBLISHED" ? "success" : state === "ARCHIVED" ? "danger" : "warning"; }
function collectionsHref(parameters: Record<string, string | undefined>) { const values = new URLSearchParams(); Object.entries(parameters).forEach(([key, value]) => { if (value) values.set(key, value); }); const suffix = values.toString(); return suffix ? `/admin/collections?${suffix}` : "/admin/collections"; }

export default async function AdminCollectionsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = validState(query.status);
  const featured = validFeatured(query.featured);
  const editorId = cleanId(query.editor);
  let unavailable = false;
  let collections: Awaited<ReturnType<typeof readCollections>> = [];
  let editorData: CollectionEditorData | null = null;
  let editorIssue = "";
  try { collections = await readCollections(search, status, featured); }
  catch (error) { console.error("Admin Collections could not be loaded", error); unavailable = true; }

  if (editorId) {
    try {
      editorData = await getCollectionEditorData(editorId === "new" ? undefined : editorId);
      if (editorId !== "new" && !editorData.collection) { editorData = null; editorIssue = "The selected Collection no longer exists."; }
    } catch (error) { console.error("Collection editor data could not be loaded", error); editorIssue = "The Collection editor is temporarily unavailable. No changes have been made."; }
  }

  const preserved = { q: search || undefined, status: status ?? undefined, featured: featured ?? undefined };
  const listHref = collectionsHref(preserved);
  const editorHref = (id: string) => collectionsHref({ ...preserved, editor: id });

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Catalog" title="Collections" description="Organize and manage your product collections." action={<Link className={listStyles.primaryButton} data-add-collection href={editorHref("new")}><AdminIcon name="plus" />Add collection</Link>} />
    {query.error && !editorId ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.archived ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Collection archived. Product relationships were preserved.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">Collections are unavailable. No changes have been made.</p> : null}
    {editorIssue ? <p className={listStyles.notice} role="alert">{editorIssue}</p> : null}
    {query.saved === "1" ? <AdminSuccessToast className={listStyles.toast} detail="Public Collection filters and homepage eligibility were updated." returnHref={listHref} title="Collection saved." /> : null}

    <form className={`${listStyles.filters} ${listStyles.collectionFilters}`}>
      <AdminSearch label="Search Collections" defaultValue={search} placeholder="Search by collection name or slug" />
      <AdminFilter label="Filter by status" name="status" defaultValue={status ?? ""}><option value="">All statuses</option>{states.map((item) => <option key={item} value={item}>{item.toLowerCase()}</option>)}</AdminFilter>
      <AdminFilter label="Filter by Featured state" name="featured" defaultValue={featured ?? ""}><option value="">Featured: all</option><option value="yes">Featured</option><option value="no">Not featured</option></AdminFilter>
      <button type="submit">Apply</button><Link className={listStyles.reset} href="/admin/collections">Reset</Link>
    </form>
    <div className={listStyles.results}><span><strong>{collections.length}</strong> {collections.length === 1 ? "collection" : "collections"}</span><span>Live database records</span></div>

    {!unavailable ? <AdminTableShell><div className={listStyles.tableScroll}><table className={listStyles.table}>
      <thead><tr><th>Collection</th><th>Products</th><th>Status</th><th>Published</th><th>Featured</th><th>Display order</th><th>Updated</th><th><span className={listStyles.visuallyHidden}>Actions</span></th></tr></thead>
      <tbody>{collections.length ? collections.map((collection) => {
        const coverSrc = imageUrl(collection.coverMedia?.approved ? collection.coverMedia.storageKey : undefined);
        const src = coverSrc ?? imageUrl(collection.heroMedia?.approved ? collection.heroMedia.storageKey : undefined);
        const publishedProducts = collection.products.filter((relation) => relation.product.state === "PUBLISHED").length;
        return <tr key={collection.id}>
          <td><span className={listStyles.productCell}><span className={listStyles.thumb}>{src ? <Image alt="" fill sizes="42px" src={src} unoptimized={!src.startsWith("/")} /> : <i>IMG</i>}</span><span className={listStyles.identity}><strong>{collection.name}</strong><small>/{collection.slug}</small></span></span></td>
          <td><span>{collection.products.length}</span><small className={listStyles.secondary}> · {publishedProducts} published</small></td>
          <td><AdminBadge tone={tone(collection.state)}>{collection.state.toLowerCase()}</AdminBadge></td>
          <td className={listStyles.toggleCell}><AdminToggleForm action={toggleCollectionPublished} checked={collection.state === "PUBLISHED"} disabled={collection.state === "ARCHIVED"} id={collection.id} label={`${collection.state === "PUBLISHED" ? "Move" : "Publish"} ${collection.name}${collection.state === "PUBLISHED" ? " to Draft" : ""}`} /></td>
          <td className={listStyles.toggleCell}><AdminToggleForm action={toggleCollectionFeatured} checked={collection.isFeatured} id={collection.id} label={`${collection.isFeatured ? "Remove" : "Mark"} ${collection.name} ${collection.isFeatured ? "from" : "as"} Featured`} />{collection.isFeatured && !coverSrc ? <small className={listStyles.warning}>Main image required to publish</small> : null}</td>
          <td>{collection.sortOrder}<small className={listStyles.secondary}> · Home {collection.homepageOrder}</small></td>
          <td><time className={listStyles.updated} dateTime={collection.updatedAt.toISOString()}>{collection.updatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</time></td>
          <td className={listStyles.menuCell}><AdminActionMenu label={`Actions for ${collection.name}`}><Link href={editorHref(collection.id)}>Edit</Link>{collection.state === "PUBLISHED" ? <Link href={`/products?collection=${encodeURIComponent(collection.slug)}`} target="_blank">View products</Link> : null}{collection.state !== "ARCHIVED" ? <form action={archiveCollection}><input name="id" type="hidden" value={collection.id} /><button type="submit">Archive</button></form> : null}</AdminActionMenu></td>
        </tr>;
      }) : <tr className={listStyles.emptyRow}><td colSpan={8}><AdminEmptyState title="No Collections found.">Add the first Collection or adjust the current search and filters.</AdminEmptyState></td></tr>}</tbody>
    </table></div></AdminTableShell> : null}
    {editorData ? <CollectionEditorModal data={editorData} error={query.error?.slice(0, 240)} returnHref={listHref} /> : null}
  </main>;
}

async function readCollections(search: string, status: (typeof states)[number] | null, featured: "yes" | "no" | null) {
  return getDb().collection.findMany({
    where: { ...(status ? { state: status } : {}), ...(featured ? { isFeatured: featured === "yes" } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { slug: { contains: search, mode: "insensitive" as const } }] } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, slug: true, state: true, isFeatured: true, sortOrder: true, homepageOrder: true, updatedAt: true,
      coverMedia: { select: { approved: true, storageKey: true } }, heroMedia: { select: { approved: true, storageKey: true } },
      products: { select: { product: { select: { state: true } } } },
    },
  });
}
