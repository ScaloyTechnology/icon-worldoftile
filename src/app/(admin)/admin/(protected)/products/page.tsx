import Image from "next/image";
import Link from "next/link";
import { mediaUrl } from "@/lib/media";
import { archiveProduct } from "@/server/admin/product-actions";
import { getDb } from "@/server/db";
import styles from "./products.module.css";

export const dynamic = "force-dynamic";
type Query = Readonly<{ q?: string; status?: string; error?: string; archived?: string }>;
const states = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
function validState(value: string | undefined): (typeof states)[number] | null { return states.find((state) => state === value) ?? null; }
function imageUrl(key: string | undefined) { if (!key) return null; try { return mediaUrl(key); } catch { return null; } }

export default async function AdminProductsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const search = typeof query.q === "string" ? query.q.trim().slice(0, 100) : "";
  const status = validState(query.status);
  let unavailable = false;
  let products: Awaited<ReturnType<typeof readProducts>> = [];
  try { products = await readProducts(search, status); } catch (error) { console.error("Admin products could not be loaded", error); unavailable = true; }
  const statusHref = (next: string | null) => `/admin/products?${new URLSearchParams({ ...(search ? { q: search } : {}), ...(next ? { status: next } : {}) })}`;
  return <main className={styles.page}>
    <header className={styles.header}><div><p>Content studio / Module 01</p><h1>Products</h1><span>Database-backed Product records for discovery and detail pages.</span></div><Link className={styles.add} href="/admin/products/new">Add product <span aria-hidden="true">↗</span></Link></header>
    {query.error ? <p className={styles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}{query.archived ? <p className={`${styles.notice} ${styles.success}`} role="status">Product archived and removed from public Product routes.</p> : null}{unavailable ? <p className={styles.notice} role="alert">Products are unavailable. No changes have been made.</p> : null}
    <div className={styles.tools}><form className={styles.search}><input aria-label="Search products" name="q" defaultValue={search} placeholder="Search name, code or slug" /><button type="submit">Search</button>{status ? <input name="status" type="hidden" value={status} /> : null}</form><nav className={styles.statuses} aria-label="Product status"><Link className={!status ? styles.active : ""} href={statusHref(null)}>All</Link>{states.map((state) => <Link className={status === state ? styles.active : ""} href={statusHref(state)} key={state}>{state.toLowerCase()}</Link>)}</nav></div>
    {!unavailable ? <div className={styles.table}><div className={`${styles.row} ${styles.head}`}><span>Image</span><span>Product</span><span>Category</span><span>Collections</span><span>Status</span><span>Featured</span><span>Updated</span><span>Actions</span></div>
      {products.length ? products.map((product) => { const src = imageUrl(product.previewMedia?.storageKey ?? product.primaryTexture?.storageKey ?? product.images[0]?.media.storageKey); return <article className={styles.row} key={product.id}><span className={styles.thumb}>{src ? <Image alt="" fill sizes="64px" src={src} unoptimized={!src.startsWith("/")} /> : null}</span><span className={styles.identity}><strong>{product.name}</strong><small>{product.code || `/${product.slug}`}</small></span><span className={styles.muted}>{product.category?.name ?? "—"}</span><span className={styles.collections}>{product.collections.map((item) => item.collection.name).join(", ") || "—"}</span><span className={styles.state}>{product.state.toLowerCase()}</span><span className={styles.featured}>{product.isFeatured ? "Yes" : "No"}</span><time className={styles.muted} dateTime={product.updatedAt.toISOString()}>{product.updatedAt.toLocaleDateString("en-IN")}</time><span className={styles.actions}><Link href={`/admin/products/${product.id}/edit`}>Edit</Link>{product.state !== "ARCHIVED" ? <form action={archiveProduct}><input name="id" type="hidden" value={product.id} /><button type="submit">Archive</button></form> : null}</span></article>; }) : <div className={styles.empty}><strong>No products found.</strong><span>Add the first Product or adjust the current search and status filter.</span></div>}
    </div> : null}
  </main>;
}

async function readProducts(search: string, status: (typeof states)[number] | null) {
  return getDb().product.findMany({
    where: { ...(status ? { state: status } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }, { slug: { contains: search, mode: "insensitive" } }] } : {}) },
    orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    select: { id: true, name: true, slug: true, code: true, state: true, isFeatured: true, updatedAt: true, category: { select: { name: true } }, collections: { orderBy: { sortOrder: "asc" }, select: { collection: { select: { name: true } } } }, previewMedia: { select: { storageKey: true } }, primaryTexture: { select: { storageKey: true } }, images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, take: 1, select: { media: { select: { storageKey: true } } } } },
  });
}
