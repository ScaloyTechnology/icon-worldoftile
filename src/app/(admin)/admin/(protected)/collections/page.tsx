import Image from "next/image";
import Link from "next/link";

import { AdminSuccessToast } from "@/components/admin/admin-success-toast";
import { CollectionEditorModal } from "@/components/admin/collection-editor-modal";
import { mediaUrl } from "@/lib/media";
import { archiveCollection } from "@/server/admin/collection-actions";
import { getCollectionEditorData, type CollectionEditorData } from "@/server/admin/collection-editor-data";
import { getDb } from "@/server/db";
import styles from "./collections.module.css";

export const dynamic = "force-dynamic";

type Query = Readonly<{
  q?: string;
  status?: string;
  editor?: string;
  error?: string;
  archived?: string;
  saved?: string;
}>;

const states = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

function validState(value: string | undefined): (typeof states)[number] | null {
  return states.find((state) => state === value) ?? null;
}

function imageUrl(key: string | undefined) {
  if (!key) return null;
  try { return mediaUrl(key); } catch { return null; }
}

function collectionsHref(parameters: Record<string, string | undefined>) {
  const values = new URLSearchParams();
  Object.entries(parameters).forEach(([key, value]) => { if (value) values.set(key, value); });
  const suffix = values.toString();
  return suffix ? `/admin/collections?${suffix}` : "/admin/collections";
}

export default async function AdminCollectionsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = validState(query.status);
  const editorId = typeof query.editor === "string" ? query.editor.trim().slice(0, 100) : "";
  let unavailable = false;
  let collections: Awaited<ReturnType<typeof readCollections>> = [];
  let editorData: CollectionEditorData | null = null;
  let editorIssue = "";

  try { collections = await readCollections(search, status); } catch (error) {
    console.error("Admin Collections could not be loaded", error);
    unavailable = true;
  }

  if (editorId) {
    try {
      editorData = await getCollectionEditorData(editorId === "new" ? undefined : editorId);
      if (editorId !== "new" && !editorData.collection) {
        editorData = null;
        editorIssue = "The selected Collection no longer exists.";
      }
    } catch (error) {
      console.error("Collection editor data could not be loaded", error);
      editorIssue = "The Collection editor is temporarily unavailable. No changes have been made.";
    }
  }

  const listHref = collectionsHref({ q: search || undefined, status: status ?? undefined });
  const editorHref = (id: string) => collectionsHref({ q: search || undefined, status: status ?? undefined, editor: id });
  const statusHref = (next: string | null) => collectionsHref({ q: search || undefined, status: next ?? undefined });

  return <main className={styles.page}>
    <header className={styles.header}>
      <div><p>Content studio / Collections</p><h1>Collections</h1><span>Manage Product groupings, public filters and homepage material stories.</span></div>
      <Link className={styles.add} data-add-collection href={editorHref("new")}>Add collection <span aria-hidden="true">+</span></Link>
    </header>

    {query.error && !editorId ? <p className={styles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.archived ? <p className={`${styles.notice} ${styles.success}`} role="status">Collection archived. Product relationships were preserved.</p> : null}
    {unavailable ? <p className={styles.notice} role="alert">Collections are unavailable. No changes have been made.</p> : null}
    {editorIssue ? <p className={styles.notice} role="alert">{editorIssue}</p> : null}
    {query.saved === "1" ? <AdminSuccessToast className={styles.toast} detail="Public Collection filters and homepage eligibility were updated." returnHref={listHref} title="Collection saved." /> : null}

    <div className={styles.tools}>
      <form className={styles.search}>
        <input aria-label="Search Collections" name="q" defaultValue={search} placeholder="Search name or slug" />
        <button type="submit">Search</button>
        {status ? <input name="status" type="hidden" value={status} /> : null}
      </form>
      <nav className={styles.statuses} aria-label="Collection status">
        <Link className={!status ? styles.active : ""} href={statusHref(null)}>All</Link>
        {states.map((state) => <Link className={status === state ? styles.active : ""} href={statusHref(state)} key={state}>{state.toLowerCase()}</Link>)}
      </nav>
    </div>

    {!unavailable ? <div className={styles.table}>
      <div className={`${styles.row} ${styles.head}`}><span>Image</span><span>Collection name</span><span>Products</span><span>Status</span><span>Featured</span><span>Display order</span><span>Updated</span><span>Actions</span></div>
      {collections.length ? collections.map((collection) => {
        const src = imageUrl(collection.coverMedia?.approved ? collection.coverMedia.storageKey : collection.heroMedia?.approved ? collection.heroMedia.storageKey : undefined);
        const publishedProducts = collection.products.filter((relation) => relation.product.state === "PUBLISHED").length;
        return <article className={styles.row} key={collection.id}>
          <span className={styles.thumb}>{src ? <Image alt="" fill sizes="56px" src={src} unoptimized={!src.startsWith("/")} /> : <i aria-hidden="true" />}</span>
          <span className={styles.identity}><strong>{collection.name}</strong><small>/{collection.slug}</small></span>
          <span className={styles.productCount}><strong>{collection.products.length}</strong><small>{publishedProducts} published</small></span>
          <span className={styles.state}>{collection.state.toLowerCase()}</span>
          <span className={styles.featured}>{collection.isFeatured ? "Yes" : "No"}{collection.state === "PUBLISHED" && collection.isFeatured && !src ? <small>Image required</small> : null}</span>
          <span className={styles.order}>{collection.sortOrder}<small>Home {collection.homepageOrder}</small></span>
          <time className={styles.updated} dateTime={collection.updatedAt.toISOString()}>{collection.updatedAt.toLocaleDateString("en-IN")}</time>
          <span className={styles.actions}>
            <Link href={editorHref(collection.id)}>Edit</Link>
            {collection.state !== "ARCHIVED" ? <form action={archiveCollection}><input name="id" type="hidden" value={collection.id} /><button type="submit">Archive</button></form> : null}
          </span>
        </article>;
      }) : <div className={styles.empty}><strong>No Collections found.</strong><span>Add the first Collection or adjust the current search and status filter.</span></div>}
    </div> : null}

    {editorData ? <CollectionEditorModal data={editorData} error={query.error?.slice(0, 240)} returnHref={listHref} /> : null}
  </main>;
}

async function readCollections(search: string, status: (typeof states)[number] | null) {
  return getDb().collection.findMany({
    where: {
      ...(status ? { state: status } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ] } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }, { id: "asc" }],
    select: {
      id: true, name: true, slug: true, state: true, isFeatured: true, sortOrder: true, homepageOrder: true, updatedAt: true,
      coverMedia: { select: { approved: true, storageKey: true } },
      heroMedia: { select: { approved: true, storageKey: true } },
      products: { select: { product: { select: { state: true } } } },
    },
  });
}
