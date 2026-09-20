import Link from "next/link";
import { AdminFormSubmit } from "@/components/admin/admin-form-submit";
import { AdminMediaPicker, type AdminSelectableMedia } from "@/components/admin/admin-media-picker";
import type { Application, AttributeDefinition, AttributeValue, Collection, MediaAsset, Product, ProductCategory, Prisma, Size, SpecificationDefinition } from "@/generated/prisma/client";
import { mediaUrl } from "@/lib/media";
import { saveProduct } from "@/server/admin/product-actions";
import { getDb } from "@/server/db";
import shared from "@/components/admin/admin-form.module.css";
import styles from "./products.module.css";

type Query = { edit?: string; action?: string; page?: string; error?: string; saved?: string };
const editorInclude = {
  collections: { orderBy: { sortOrder: "asc" }, select: { collectionId: true } },
  attributes: { select: { valueId: true } }, variants: { select: { id: true, sizeId: true, thicknessMm: true } },
  applications: { select: { applicationId: true } }, images: { orderBy: { sortOrder: "asc" }, select: { mediaId: true } },
  documents: { orderBy: { sortOrder: "asc" }, select: { mediaId: true, title: true } },
  specifications: { select: { definitionId: true, value: true } },
} as const satisfies Prisma.ProductInclude;
type EditorProduct = Prisma.ProductGetPayload<{ include: typeof editorInclude }>;
export const dynamic = "force-dynamic";

export default async function AdminProductsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(query.page) || 1));
  let rows: Product[] = [];
  let total = 0;
  let selected: EditorProduct | null = null;
  let categories: ProductCategory[] = [];
  let collections: Collection[] = [];
  let definitions: Array<AttributeDefinition & { values: AttributeValue[] }> = [];
  let sizes: Size[] = [];
  let applications: Application[] = [];
  let media: MediaAsset[] = [];
  let specs: SpecificationDefinition[] = [];
  let unavailable = false;
  try {
    const db = getDb();
    [rows, total, categories, collections, definitions, sizes, applications, media, specs, selected] = await Promise.all([
      db.product.findMany({ orderBy: [{ updatedAt: "desc" }, { id: "asc" }], skip: (page - 1) * 50, take: 50 }),
      db.product.count(), db.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      db.collection.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      db.attributeDefinition.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { values: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] } } }),
      db.size.findMany({ orderBy: { label: "asc" } }),
      db.application.findMany({ orderBy: [{ sortOrder: "asc" }, { id: "asc" }] }),
      db.mediaAsset.findMany({ where: { approved: true }, orderBy: { updatedAt: "desc" } }),
      db.specificationDefinition.findMany({ orderBy: { label: "asc" } }),
      query.edit ? db.product.findUnique({ where: { id: query.edit }, include: editorInclude }) : null,
    ]);
  } catch (error) { console.error("Admin products could not be loaded", error); unavailable = true; }
  const editing = Boolean(selected) || query.action === "new";
  const selectedCollections = new Set(selected?.collections.map((item) => item.collectionId) ?? []);
  const selectedAttributes = new Set(selected?.attributes.map((item) => item.valueId) ?? []);
  const selectedSizes = new Set(selected?.variants.map((item) => item.sizeId) ?? []);
  const selectedApplications = new Set(selected?.applications.map((item) => item.applicationId) ?? []);
  const selectableMedia: AdminSelectableMedia[] = media.flatMap((asset) => {
    try { return [{ id: asset.id, filename: asset.originalFilename, alt: asset.alt, src: mediaUrl(asset.storageKey), mimeType: asset.mimeType }]; }
    catch { return []; }
  });
  const imageMedia = selectableMedia.filter((asset) => asset.mimeType.startsWith("image/"));
  const pdfMedia = selectableMedia.filter((asset) => asset.mimeType === "application/pdf");
  const gallerySlots = Math.min(20, Math.max(4, (selected?.images.length ?? 0) + 2));
  const specificationValues = new Map(selected?.specifications.map((item) => [item.definitionId, item.value]) ?? []);
  return <main className={shared.main}>
    <header className={shared.header}><div><p className={shared.eyebrow}>Content studio / Catalogue</p><h1>Products</h1><p>Publish controlled product information and approved material imagery.</p></div><Link className={shared.action} href="/admin/products/new">Add product <span aria-hidden="true">↗</span></Link></header>
    {unavailable ? <p className={shared.notice} role="alert">Products are unavailable. No changes have been made.</p> : null}
    {query.error ? <p className={shared.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved ? <p className={shared.success} role="status">Product saved. Public product pages have been refreshed.</p> : null}
    {!unavailable ? <div className={shared.layout}>
      <section className={shared.list} aria-labelledby="products-list-heading"><div className={shared.sectionHeading}><h2 id="products-list-heading">Product records</h2><span>{total} total</span></div>
        {rows.length ? <ul>{rows.map((row) => <li key={row.id}><Link href={`/admin/products?edit=${encodeURIComponent(row.id)}&page=${page}`} aria-current={selected?.id === row.id ? "page" : undefined}><span className={shared.order}>{String(row.sortOrder).padStart(2, "0")}</span><span className={shared.recordName}><strong>{row.name}</strong><small>/{row.slug}</small></span><span className={shared.state}>{row.state.toLowerCase()}</span><span aria-hidden="true">↗</span></Link></li>)}</ul> : <p className={shared.empty}>No products on this page. Add a Product after configuring its taxonomy and approved media.</p>}
        <nav className={styles.pagination} aria-label="Product pages">{page > 1 ? <Link href={`/admin/products?page=${page - 1}`}>Previous</Link> : null}<span>Page {page}</span>{page * 50 < total ? <Link href={`/admin/products?page=${page + 1}`}>Next</Link> : null}</nav>
      </section>
      {editing ? <section className={shared.editor} aria-labelledby="product-editor-heading"><div className={shared.sectionHeading}><h2 id="product-editor-heading">{selected ? "Edit Product" : "Add Product"}</h2><Link href="/admin/products">Close</Link></div><form action={saveProduct}>
        {selected ? <input name="id" type="hidden" value={selected.id} /> : null}
        <label>Name<input name="name" required maxLength={160} defaultValue={selected?.name ?? ""} /></label>
        <label>Slug<input name="slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={Boolean(selected)} defaultValue={selected?.slug ?? ""} /><small>Stable after creation. Use lowercase words separated by hyphens.</small></label>
        <div className={shared.fields}><label>Product code<input name="code" maxLength={100} defaultValue={selected?.code ?? ""} /></label><label>Display order<input name="sortOrder" type="number" min={0} max={100000} required defaultValue={selected?.sortOrder ?? total} /></label></div>
        <label>Description<textarea name="description" rows={5} maxLength={5000} defaultValue={selected?.description ?? ""} /></label>
        <div className={shared.fields}><label>Status<select name="state" defaultValue={selected?.state ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select></label><label>Category<select name="categoryId" defaultValue={selected?.categoryId ?? ""}><option value="">No category</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <div className={shared.fields}><label className={shared.checkbox}><input name="isFeatured" type="checkbox" defaultChecked={selected?.isFeatured ?? false} /> Featured product</label><label className={shared.checkbox}><input name="homepageHeroEligible" type="checkbox" defaultChecked={selected?.homepageHeroEligible ?? false} /> Homepage eligible</label></div>
        <fieldset className={styles.group}><legend>Collections</legend><div className={styles.choices}>{collections.map((item) => <label key={item.id}><input name="collectionId" type="checkbox" value={item.id} defaultChecked={selectedCollections.has(item.id)} />{item.name}<small>{item.state.toLowerCase()}</small></label>)}</div></fieldset>
        {definitions.map((definition) => <fieldset className={styles.group} key={definition.id}><legend>{definition.name}</legend><div className={styles.choices}>{definition.values.map((item) => <label key={item.id}><input name="attributeId" type="checkbox" value={item.id} defaultChecked={selectedAttributes.has(item.id)} />{item.label}</label>)}</div></fieldset>)}
        <fieldset className={styles.group}><legend>Sizes and variants</legend><div className={styles.choices}>{sizes.map((item) => <label key={item.id}><input name="sizeId" type="checkbox" value={item.id} defaultChecked={selectedSizes.has(item.id)} />{item.label}</label>)}</div><p>Unselecting a size removes its Product variant. Existing variants retain their IDs and SKU when selected.</p>
          {selected?.variants.map((variant) => <label key={variant.id}>Thickness for {sizes.find((item) => item.id === variant.sizeId)?.label ?? "existing variant"} (mm)<input name={`variant:${variant.id}`} type="number" step="0.01" min="0.01" defaultValue={variant.thicknessMm ? Number(variant.thicknessMm) : ""} /></label>)}
          <label>Thickness for newly selected sizes (mm)<input name="newThicknessMm" type="number" step="0.01" min="0.01" /></label>
        </fieldset>
        <fieldset className={styles.group}><legend>Applications</legend><div className={styles.choices}>{applications.map((item) => <label key={item.id}><input name="applicationId" type="checkbox" value={item.id} defaultChecked={selectedApplications.has(item.id)} />{item.name}<small>{item.state.toLowerCase()}</small></label>)}</div></fieldset>
        <AdminMediaPicker key={`texture-${selected?.id ?? "new"}`} name="primaryTextureId" label="Primary tile texture" assets={imageMedia} initialId={selected?.primaryTextureId ?? ""} help="Use a tile-face image for the material inspector." />
        <AdminMediaPicker key={`preview-${selected?.id ?? "new"}`} name="previewMediaId" label="Preview image" assets={imageMedia} initialId={selected?.previewMediaId ?? ""} help="Used on Product cards when supplied." />
        <fieldset className={styles.group}><legend>Ordered image gallery</legend>{Array.from({ length: gallerySlots }, (_, index) => <AdminMediaPicker key={`${selected?.id ?? "new"}-gallery-${index}`} name="galleryMediaId" label={`Image ${index + 1}`} assets={imageMedia} initialId={selected?.images[index]?.mediaId ?? ""} />)}</fieldset>
        <fieldset className={styles.group}><legend>Product document</legend><AdminMediaPicker key={`document-${selected?.id ?? "new"}`} name="documentMediaId" label="Approved PDF" assets={pdfMedia} initialId={selected?.documents[0]?.mediaId ?? ""} /><label>Document title<input name="documentTitle" maxLength={120} defaultValue={selected?.documents[0]?.title ?? ""} /></label></fieldset>
        {specs.length ? <fieldset className={styles.group}><legend>Verified specifications</legend>{specs.map((item) => <label key={item.id}>{item.label}{item.unit ? ` (${item.unit})` : ""}<input name={`spec:${item.id}`} maxLength={500} defaultValue={specificationValues.get(item.id) ?? ""} /></label>)}</fieldset> : null}
        {!imageMedia.length ? <p className={shared.hint}>No approved images are registered. A Product can be saved as Draft, but publishing requires an approved image.</p> : null}
        <AdminFormSubmit className={shared.action} label="Save Product" />
      </form></section> : null}
    </div> : null}
  </main>;
}
