"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveProduct } from "@/server/admin/product-actions";
import type { ProductEditorData, ProductEditorDocument, ProductEditorMedia, ProductEditorVariant } from "@/server/admin/product-editor-data";
import styles from "./product-editor.module.css";

type VariantState = ProductEditorVariant & { clientKey: string };

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className={styles.primary} disabled={pending} type="submit">{pending ? "Saving…" : "Save product"}</button>;
}

function responseAsset(value: unknown): ProductEditorMedia | null {
  if (typeof value !== "object" || value === null || !("asset" in value)) return null;
  const asset = value.asset;
  if (typeof asset !== "object" || asset === null || !("id" in asset) || !("label" in asset) || !("src" in asset) || !("mimeType" in asset)) return null;
  return typeof asset.id === "string" && typeof asset.label === "string" && (typeof asset.src === "string" || asset.src === null) && typeof asset.mimeType === "string" ? { id: asset.id, label: asset.label, src: asset.src, mimeType: asset.mimeType } : null;
}

function responseError(value: unknown) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string" ? value.error : "The file could not be uploaded.";
}

function LocalMediaUpload({ onUploaded, allowPdf = false }: Readonly<{ onUploaded: (asset: ProductEditorMedia) => void; allowPdf?: boolean }>) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const upload = async () => {
    if (!file) { setError(`Choose ${allowPdf ? "an image or PDF" : "an image"} from your computer.`); return; }
    setUploading(true); setError("");
    try {
      const body = new FormData(); body.set("file", file); body.set("alt", alt);
      const response = await fetch("/api/admin/product-media", { method: "POST", body });
      const payload: unknown = await response.json();
      const asset = responseAsset(payload);
      if (!response.ok || !asset) { setError(responseError(payload)); return; }
      onUploaded(asset); setFile(null); setAlt("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch { setError("The file upload was interrupted. Please try again."); }
    finally { setUploading(false); }
  };
  const clearFile = () => {
    setFile(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  return <div className={styles.upload}>
    <div><div className={styles.fileField}><label htmlFor={fileInputId}>Choose {allowPdf ? "image or PDF" : "image"} from computer</label><span className={styles.fileControl}><input accept={allowPdf ? "image/jpeg,image/png,image/webp,image/avif,application/pdf" : "image/jpeg,image/png,image/webp,image/avif"} id={fileInputId} ref={fileInputRef} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} type="file" />{file ? <button aria-label={`Remove ${file.name}`} onClick={clearFile} type="button">Delete</button> : null}</span>{file ? <small className={styles.fileName} title={file.name}>{file.name}</small> : null}</div><label>Alternative text<input maxLength={300} value={alt} onChange={(event) => setAlt(event.target.value)} placeholder={allowPdf ? "Describe or name this technical file" : "Describe the surface or room"} /></label></div>
    <button disabled={uploading} onClick={upload} type="button">{uploading ? "Uploading…" : "Upload file"}</button>
    {error ? <p role="alert">{error}</p> : null}<small>{allowPdf ? "JPG, PNG, WebP, AVIF or PDF." : "JPG, PNG, WebP or AVIF."}</small>
  </div>;
}

function MediaBrowser({ assets, selected, onSelect, onUpload, multiple = false, allowPdf = false, empty }: Readonly<{ assets: readonly ProductEditorMedia[]; selected: readonly string[]; onSelect: (id: string) => void; onUpload: (asset: ProductEditorMedia) => void; multiple?: boolean; allowPdf?: boolean; empty: string }>) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => assets.filter((asset) => asset.label.toLowerCase().includes(query.toLowerCase())), [assets, query]);
  return <div className={styles.mediaBrowser}>
    <LocalMediaUpload allowPdf={allowPdf} onUploaded={(asset) => { onUpload(asset); onSelect(asset.id); }} />
    {!assets.length ? <p className={styles.empty}>{empty}</p> : <>
    <label className={styles.mediaSearch}>Search approved media<input value={query} onChange={(event) => setQuery(event.target.value)} type="search" /></label>
    <div className={styles.mediaGrid}>{visible.map((asset) => {
      const active = selected.includes(asset.id);
      return <button aria-pressed={active} className={active ? styles.mediaSelected : ""} key={asset.id} onClick={() => onSelect(asset.id)} type="button">
        <span>{asset.src && asset.mimeType.startsWith("image/") ? <Image alt="" fill sizes="120px" src={asset.src} unoptimized={!asset.src.startsWith("/")} /> : <i>PDF</i>}</span>
        <small>{asset.label}</small><b>{active ? (multiple ? "Selected" : "Active") : "Select"}</b>
      </button>;
    })}</div></>}
  </div>;
}

export function ProductEditor({ data, error, saved }: Readonly<{ data: ProductEditorData; error?: string; saved?: boolean }>) {
  const product = data.product;
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [mainImage, setMainImage] = useState(product?.previewMediaId ?? "");
  const [texture, setTexture] = useState(product?.primaryTextureId ?? "");
  const [images, setImages] = useState<ProductEditorMedia[]>([...data.images]);
  const [technicalMediaId, setTechnicalMediaId] = useState(product?.technicalMediaId ?? "");
  const [technicalAssets, setTechnicalAssets] = useState<ProductEditorMedia[]>(() => [...data.images, ...data.documents.filter((document) => !data.images.some((image) => image.id === document.id))]);
  const [seoImage, setSeoImage] = useState(product?.seoImageId ?? "");
  const [gallery, setGallery] = useState<string[]>([...(product?.galleryIds ?? [])]);
  const [variants, setVariants] = useState<VariantState[]>(() => (product?.variants ?? []).map((item, index) => ({ ...item, clientKey: item.id ?? `existing-${index}` })));
  const [documents] = useState<ProductEditorDocument[]>([...(product?.documents ?? [])]);
  const [specifications] = useState<Record<string, string>>({ ...(product?.specifications ?? {}) });
  const variantAttributeOptions = data.attributes.flatMap((definition) => definition.values.map((item) => ({ ...item, group: definition.name })));
  const addImage = (asset: ProductEditorMedia) => setImages((current) => current.some((item) => item.id === asset.id) ? current : [asset, ...current]);
  const addTechnicalAsset = (asset: ProductEditorMedia) => {
    setTechnicalAssets((current) => current.some((item) => item.id === asset.id) ? current : [asset, ...current]);
    if (asset.mimeType.startsWith("image/")) addImage(asset);
  };

  const updateVariant = (key: string, patch: Partial<ProductEditorVariant>) => setVariants((current) => current.map((variant) => variant.clientKey === key ? { ...variant, ...patch } : variant));
  const toggleGallery = (id: string) => setGallery((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const moveGallery = (index: number, direction: -1 | 1) => setGallery((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; const item = next[index]; const other = next[target];
    if (!item || !other) return current;
    next[index] = other; next[target] = item; return next;
  });

  return <main className={styles.page}>
    <header className={styles.header}><div><p>Content studio / Products</p><h1>{product ? `Edit ${product.name}` : "Add product"}</h1><span>One database record drives discovery, filters and the public Product detail.</span></div><Link href="/admin/products">Back to products</Link></header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}{saved ? <p className={styles.success} role="status">Product saved and public Product routes revalidated.</p> : null}
    <form action={saveProduct} className={styles.form}>
      <input name="id" type="hidden" value={product?.id ?? ""} /><input name="previewMediaId" type="hidden" value={mainImage} /><input name="primaryTextureId" type="hidden" value={texture} /><input name="technicalMediaId" type="hidden" value={technicalMediaId} />
      <input name="gallery" type="hidden" value={JSON.stringify(gallery)} /><input name="variants" type="hidden" value={JSON.stringify(variants.map(({ clientKey, ...variant }) => variant))} />
      <input name="documents" type="hidden" value={JSON.stringify(documents)} /><input name="specifications" type="hidden" value={JSON.stringify(specifications)} />

      <section><div className={styles.sectionTitle}><span>01</span><div><h2>Basic information</h2><p>Public identity and description.</p></div></div><div className={styles.fields}>
        <label>Product name *<input name="name" required maxLength={160} value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugTouched) setSlug(slugify(next)); }} /></label>
        <label>Slug *<input name="slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value.toLowerCase()); }} /><small>Stable public URL. Edit deliberately.</small></label>
        <label>Product code<input name="code" maxLength={100} defaultValue={product?.code ?? ""} /></label>
        <label className={styles.wide}>Description<textarea name="description" rows={5} maxLength={5000} defaultValue={product?.description ?? ""} /></label>
      </div></section>

      <section><div className={styles.sectionTitle}><span>02</span><div><h2>Classification</h2><p>Select existing master records only.</p></div></div><div className={styles.fields}>
        <label>Category<select name="categoryId" defaultValue={product?.categoryId ?? ""}><option value="">No category</option>{data.categories.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select>{!data.categories.length ? <small>No categories available.</small> : null}</label>
        <fieldset><legend>Collections</legend>{data.collections.length ? <div className={styles.checks}>{data.collections.map((item) => <label key={item.id}><input defaultChecked={product?.collectionIds.includes(item.id)} name="collectionId" type="checkbox" value={item.id} /><span>{item.label}<small>{item.state?.toLowerCase()}</small></span></label>)}</div> : <p className={styles.empty}>No collections are currently available.</p>}</fieldset>
      </div></section>

      <section><div className={styles.sectionTitle}><span>03</span><div><h2>Product attributes</h2><p>Values populate public Refine filters and Product details.</p></div></div><div className={styles.attributeGrid}>{data.attributes.length ? data.attributes.map((definition) => <fieldset key={definition.id}><legend>{definition.name}<small>{definition.kind.toLowerCase()}</small></legend>{definition.values.length ? <div className={styles.checks}>{definition.values.map((item) => <label key={item.id}><input defaultChecked={product?.attributeValueIds.includes(item.id)} name="attributeValueId" type="checkbox" value={item.id} /><span>{item.label}</span></label>)}</div> : <p className={styles.empty}>No values available.</p>}</fieldset>) : <p className={styles.empty}>No attribute definitions are currently available.</p>}</div></section>

      <section><div className={styles.sectionTitle}><span>04</span><div><h2>Sizes and variants</h2><p>Variants power Size filtering, SKU and thickness.</p></div></div>
        <div className={styles.repeaters}>{variants.map((variant, index) => <div className={styles.variant} key={variant.clientKey}><header><strong>Variant {String(index + 1).padStart(2, "0")}</strong><button type="button" onClick={() => setVariants((current) => current.filter((item) => item.clientKey !== variant.clientKey))}>Remove</button></header><div className={styles.fields}>
          <label>Size *<select required value={variant.sizeId} onChange={(event) => updateVariant(variant.clientKey, { sizeId: event.target.value })}><option value="">Choose size</option>{data.sizes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>SKU<input maxLength={100} value={variant.sku} onChange={(event) => updateVariant(variant.clientKey, { sku: event.target.value })} /></label>
          <label>Thickness (mm)<input min="0.01" step="0.01" type="number" value={variant.thicknessMm} onChange={(event) => updateVariant(variant.clientKey, { thicknessMm: event.target.value })} /></label>
          <label>Variant attributes<select multiple value={[...variant.attributeValueIds]} onChange={(event) => updateVariant(variant.clientKey, { attributeValueIds: Array.from(event.target.selectedOptions, (option) => option.value) })}>{variantAttributeOptions.map((item) => <option key={item.id} value={item.id}>{item.group} — {item.label}</option>)}</select><small>Use Ctrl/Cmd to select multiple.</small></label>
        </div></div>)}</div>
        {!data.sizes.length ? <p className={styles.empty}>No sizes are currently available.</p> : <button className={styles.secondary} type="button" onClick={() => setVariants((current) => [...current, { clientKey: `new-${Date.now()}-${current.length}`, id: null, sizeId: "", sku: "", thicknessMm: "", attributeValueIds: [] }])}>Add variant</button>}
      </section>

      <section><div className={styles.sectionTitle}><span>05</span><div><h2>Media</h2><p>Choose an approved asset or upload a new Product image from your computer.</p></div></div>
        <div className={styles.mediaSection}><h3>Main image</h3><p>Required for publishing and used by Product cards.</p><MediaBrowser assets={images} selected={mainImage ? [mainImage] : []} onSelect={(id) => setMainImage((current) => current === id ? "" : id)} onUpload={addImage} empty="No approved image assets are available. Upload the first image from your computer." /></div>
        <div className={styles.mediaSection}><h3>Material texture</h3><p>Optional repeatable surface image retained for material-aware consumers.</p><MediaBrowser assets={images} selected={texture ? [texture] : []} onSelect={(id) => setTexture((current) => current === id ? "" : id)} onUpload={addImage} empty="No approved image assets are available. Upload an image from your computer." /></div>
        <div className={styles.mediaSection}><h3>Other images</h3><p>Select and order the Product detail gallery.</p><MediaBrowser assets={images} selected={gallery} onSelect={toggleGallery} onUpload={addImage} multiple empty="No approved image assets are available. Upload an image from your computer." />
          {gallery.length ? <ol className={styles.orderList}>{gallery.map((id, index) => <li key={id}><span>{images.find((item) => item.id === id)?.label ?? "Approved image"}</span><div><button disabled={index === 0} type="button" onClick={() => moveGallery(index, -1)}>Up</button><button disabled={index === gallery.length - 1} type="button" onClick={() => moveGallery(index, 1)}>Down</button><button type="button" onClick={() => toggleGallery(id)}>Remove</button></div></li>)}</ol> : null}
        </div>
      </section>

      <section><div className={styles.sectionTitle}><span>06</span><div><h2>Applications</h2><p>Describe recommended applications and optionally assign existing Application records.</p></div></div>
        <div className={styles.technicalCopy}><label>Applications text<textarea name="applicationDescription" rows={8} maxLength={10000} defaultValue={product?.applicationDescription ?? ""} placeholder="Describe suitable spaces, installation contexts and recommended uses for this product." /></label></div>
        {data.applications.length ? <div className={styles.checks}>{data.applications.map((item) => <label key={item.id}><input defaultChecked={product?.applicationIds.includes(item.id)} name="applicationId" type="checkbox" value={item.id} /><span>{item.label}<small>{item.state?.toLowerCase()}</small></span></label>)}</div> : <p className={styles.empty}>No applications are currently available. You can still save the Applications text above.</p>}
      </section>

      <section><div className={styles.sectionTitle}><span>07</span><div><h2>Technical information</h2><p>Add the technical narrative and one supporting image or PDF shown in the public Technical dropdown.</p></div></div>
        <div className={styles.technicalCopy}><label>Technical text<textarea name="technicalDescription" rows={8} maxLength={10000} defaultValue={product?.technicalDescription ?? ""} placeholder="Add installation guidance, material performance, technical notes or specification context." /></label></div>
        <div className={styles.mediaSection}><h3>Technical media</h3><p>Choose or upload one approved image or PDF. Select the active item again to remove it.</p><MediaBrowser allowPdf assets={technicalAssets} selected={technicalMediaId ? [technicalMediaId] : []} onSelect={(id) => setTechnicalMediaId((current) => current === id ? "" : id)} onUpload={addTechnicalAsset} empty="No approved technical media is available. Upload an image or PDF from your computer." /></div>
      </section>

      <section><div className={styles.sectionTitle}><span>08</span><div><h2>Publishing</h2><p>Controls public visibility and deterministic ordering.</p></div></div><div className={styles.fields}>
        <label>Status<select name="state" defaultValue={product?.state ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select><small>Published products require an approved Main Image.</small></label>
        <label>Display order<input name="sortOrder" type="number" min={0} max={100000} defaultValue={product?.sortOrder ?? 0} /></label>
        <label className={styles.toggle}><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured} /><span><strong>Featured</strong><small>Prioritized by public Featured sorting.</small></span></label>
        <label className={styles.toggle}><input name="homepageHeroEligible" type="checkbox" defaultChecked={product?.homepageHeroEligible} /><span><strong>Homepage eligible</strong><small>Preserves the existing homepage eligibility signal.</small></span></label>
      </div></section>

      <section><div className={styles.sectionTitle}><span>09</span><div><h2>SEO</h2><p>Optional metadata with Product content fallbacks.</p></div></div><div className={styles.fields}>
        <label>SEO title<input name="seoTitle" maxLength={160} defaultValue={product?.seoTitle ?? ""} /></label><label>SEO description<textarea name="seoDescription" maxLength={320} rows={3} defaultValue={product?.seoDescription ?? ""} /></label>
        <label>Social image<select name="seoImageId" value={seoImage} onChange={(event) => setSeoImage(event.target.value)}><option value="">Use main image</option>{images.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label className={styles.toggle}><input name="seoNoIndex" type="checkbox" defaultChecked={product?.seoNoIndex} /><span><strong>Hide from search engines</strong><small>Sets the existing no-index metadata flag.</small></span></label>
      </div><div className={styles.seoUpload}><LocalMediaUpload onUploaded={(asset) => { addImage(asset); setSeoImage(asset.id); }} /></div></section>

      <footer className={styles.actions}><SubmitButton /><Link href="/admin/products">Cancel</Link></footer>
    </form>
  </main>;
}
