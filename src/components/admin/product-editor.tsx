"use client";

import Image from "next/image";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { saveProduct } from "@/server/admin/product-actions";
import type { ProductEditorData, ProductEditorMedia, ProductEditorOption, ProductEditorVariant } from "@/server/admin/product-editor-data";
import styles from "./product-editor.module.css";

type VariantState = ProductEditorVariant & { clientKey: string };

type ProductEditorProps = Readonly<{
  data: ProductEditorData;
  error?: string;
  saved?: boolean;
  onCancel?: () => void;
  onDirty?: () => void;
  onPendingChange?: (pending: boolean) => void;
}>;

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function PendingBridge({ onChange }: Readonly<{ onChange?: (pending: boolean) => void }>) {
  const { pending } = useFormStatus();
  useEffect(() => onChange?.(pending), [onChange, pending]);
  return null;
}

function SubmitControls({ published, onCancel }: Readonly<{ published: boolean; onCancel?: () => void }>) {
  const { pending } = useFormStatus();
  return <>
    <button className={styles.tertiary} disabled={pending} name="intent" type="submit" value="draft">Save draft</button>
    <button className={styles.primary} disabled={pending} name="intent" type="submit" value={published ? "save" : "publish"}>{pending ? "Saving…" : published ? "Save changes" : "Publish product"}</button>
    <button className={styles.cancel} disabled={pending} onClick={onCancel} type="button">Cancel</button>
  </>;
}

function responseAsset(value: unknown): ProductEditorMedia | null {
  if (typeof value !== "object" || value === null || !("asset" in value)) return null;
  const asset = value.asset;
  if (typeof asset !== "object" || asset === null || !("id" in asset) || !("label" in asset) || !("src" in asset) || !("mimeType" in asset)) return null;
  return typeof asset.id === "string" && typeof asset.label === "string" && (typeof asset.src === "string" || asset.src === null) && typeof asset.mimeType === "string"
    ? { id: asset.id, label: asset.label, src: asset.src, mimeType: asset.mimeType }
    : null;
}

function responseError(value: unknown) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : "The file could not be uploaded.";
}

function responseSize(value: unknown): ProductEditorOption | null {
  if (typeof value !== "object" || value === null || !("size" in value)) return null;
  const size = value.size;
  if (typeof size !== "object" || size === null || !("id" in size) || !("label" in size)) return null;
  return typeof size.id === "string" && typeof size.label === "string" ? { id: size.id, label: size.label } : null;
}

function responseMessage(value: unknown) {
  return typeof value === "object" && value !== null && "error" in value && typeof value.error === "string"
    ? value.error
    : "The Size could not be created. Please try again.";
}

type LocalUpload = Readonly<{
  id: string;
  name: string;
  preview: string;
  status: "uploading" | "complete" | "error";
  message: string;
}>;

function LocalMediaUpload({ onUploaded, allowPdf = false, multiple = false, altPlaceholder }: Readonly<{ onUploaded: (asset: ProductEditorMedia) => void; allowPdf?: boolean; multiple?: boolean; altPlaceholder?: string }>) {
  const fileInputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextUploadId = useRef(0);
  const controllers = useRef(new Map<string, AbortController>());
  const previews = useRef(new Set<string>());
  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [alt, setAlt] = useState("");
  const uploading = uploads.some((item) => item.status === "uploading");

  useEffect(() => () => {
    controllers.current.forEach((controller) => controller.abort());
    previews.current.forEach((preview) => URL.revokeObjectURL(preview));
  }, []);

  const updateUpload = (id: string, patch: Partial<LocalUpload>) => {
    setUploads((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const clearUpload = (id: string) => {
    controllers.current.get(id)?.abort();
    controllers.current.delete(id);
    setUploads((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
        previews.current.delete(removed.preview);
      }
      return current.filter((item) => item.id !== id);
    });
  };

  const upload = async (file: File, id: string): Promise<ProductEditorMedia | null> => {
    const controller = new AbortController();
    controllers.current.set(id, controller);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("alt", alt.trim() || file.name.replace(/\.[^.]+$/, ""));
      const response = await fetch("/api/admin/product-media", { method: "POST", body, signal: controller.signal });
      const payload: unknown = await response.json();
      const asset = responseAsset(payload);
      if (!response.ok || !asset) {
        updateUpload(id, { status: "error", message: responseError(payload) });
        return null;
      }
      updateUpload(id, { status: "complete", message: "Uploaded and selected" });
      return asset;
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return null;
      updateUpload(id, { status: "error", message: "Upload interrupted. Please try this file again." });
      return null;
    } finally {
      controllers.current.delete(id);
    }
  };

  const chooseFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files, (file) => {
      const id = `${Date.now()}-${nextUploadId.current++}`;
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
      if (preview) previews.current.add(preview);
      return { file, item: { id, name: file.name, preview, status: "uploading" as const, message: "Uploading securely…" } };
    });
    if (!multiple) uploads.forEach((item) => clearUpload(item.id));
    setUploads((current) => multiple ? [...current, ...selected.map(({ item }) => item)] : selected.map(({ item }) => item));
    void Promise.all(selected.map(({ file, item }) => upload(file, item.id))).then((assets) => {
      assets.forEach((asset) => { if (asset) onUploaded(asset); });
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return <div className={styles.upload}>
    <label className={styles.altField}>Alternative text
      <input maxLength={300} value={alt} onChange={(event) => setAlt(event.target.value)} placeholder={altPlaceholder ?? (allowPdf ? "Name this technical file" : "Describe the surface or room")} />
    </label>
    <div className={styles.uploadControl}>
      <label className={styles.filePicker} htmlFor={fileInputId} aria-disabled={uploading}>
        <input
          accept={allowPdf ? "image/jpeg,image/png,image/webp,image/avif,application/pdf" : "image/jpeg,image/png,image/webp,image/avif"}
          disabled={uploading}
          id={fileInputId}
          multiple={multiple}
          onChange={(event) => chooseFiles(event.target.files)}
          ref={fileInputRef}
          type="file"
        />
        <span>{uploading ? "Uploading…" : multiple ? "Choose images from computer" : "Choose from computer"}</span>
      </label>
      {uploads.length ? <div className={styles.localSelections} aria-live="polite">
        {uploads.map((item) => <div className={styles.localSelection} data-status={item.status} key={item.id}>
          {item.preview ? <img alt="" src={item.preview} /> : <span className={styles.pdfPreview}>PDF</span>}
          <span><strong title={item.name}>{item.name}</strong><small>{item.message}</small>{item.status === "uploading" ? <progress aria-label={`Uploading ${item.name}`} /> : null}</span>
          <button aria-label={`${item.status === "uploading" ? "Cancel" : "Dismiss"} ${item.name}`} onClick={() => clearUpload(item.id)} type="button">×</button>
        </div>)}
      </div> : null}
    </div>
    <small>{allowPdf ? "JPG, PNG, WebP, AVIF or PDF." : "JPG, PNG, WebP or AVIF."} {multiple ? "Select multiple images in one batch. " : ""}Upload starts immediately after selection.</small>
  </div>;
}

type MediaBrowserProps = Readonly<{
  assets: readonly ProductEditorMedia[];
  selected: readonly string[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onUpload: (asset: ProductEditorMedia) => void;
  multiple?: boolean;
  allowPdf?: boolean;
  altPlaceholder?: string;
  empty: string;
}>;

export function AdminMediaPicker({ assets, selected, onSelect, onRemove, onUpload, multiple = false, allowPdf = false, altPlaceholder, empty }: MediaBrowserProps) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => assets.filter((asset) => asset.label.toLowerCase().includes(query.toLowerCase())), [assets, query]);
  const selectedAssets = selected
    .map((id) => assets.find((asset) => asset.id === id))
    .filter((asset): asset is ProductEditorMedia => Boolean(asset));
  return <div className={styles.mediaBrowser}>
    {selectedAssets.length ? <div className={styles.selectedMedia} aria-label="Selected media">
      {selectedAssets.map((asset, index) => <figure key={asset.id}>
        <span>{asset.src && asset.mimeType.startsWith("image/") ? <Image alt="" fill sizes="110px" src={asset.src} unoptimized={!asset.src.startsWith("/")} /> : <i>PDF</i>}</span>
        <figcaption>{asset.label}<small>{multiple ? String(index + 1).padStart(2, "0") : "Selected"}</small></figcaption>
        <button aria-label={`Remove ${asset.label}`} onClick={() => onRemove(asset.id)} type="button">×</button>
      </figure>)}
    </div> : null}
    <LocalMediaUpload allowPdf={allowPdf} altPlaceholder={altPlaceholder} multiple={multiple} onUploaded={(asset) => { onUpload(asset); onSelect(asset.id); }} />
    <details className={styles.approvedMedia}>
      <summary>Choose from approved media <span>{assets.length}</span></summary>
      {!assets.length ? <p className={styles.empty}>{empty}</p> : <>
        <label className={styles.mediaSearch}>Search media<input value={query} onChange={(event) => setQuery(event.target.value)} type="search" /></label>
        <div className={styles.mediaGrid}>{visible.map((asset) => {
          const active = selected.includes(asset.id);
          return <button aria-pressed={active} className={active ? styles.mediaSelected : ""} key={asset.id} onClick={() => active ? onRemove(asset.id) : onSelect(asset.id)} type="button">
            <span>{asset.src && asset.mimeType.startsWith("image/") ? <Image alt="" fill sizes="96px" src={asset.src} unoptimized={!asset.src.startsWith("/")} /> : <i>PDF</i>}</span>
            <small>{asset.label}</small><b>{active ? "Selected" : "Choose"}</b>
          </button>;
        })}</div>
      </>}
    </details>
  </div>;
}

type ProductSizeFieldProps = Readonly<{
  options: readonly ProductEditorOption[];
  selected: readonly string[];
  onToggle: (id: string, checked: boolean) => void;
  onCreated: (size: ProductEditorOption) => void;
}>;

function ProductSizeField({ options, selected, onToggle, onCreated }: ProductSizeFieldProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [label, setLabel] = useState("");
  const [widthMm, setWidthMm] = useState("");
  const [lengthMm, setLengthMm] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const selectedLabels = options.filter((option) => selected.includes(option.id)).map((option) => option.label);

  const closeDialog = () => {
    if (pending) return;
    dialogRef.current?.close();
    setOpen(false);
    setError("");
    addButtonRef.current?.focus();
  };

  const createSize = async () => {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/admin/sizes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, widthMm, lengthMm }),
      });
      const payload: unknown = await response.json();
      const size = responseSize(payload);
      if (!response.ok || !size) {
        setError(responseMessage(payload));
        return;
      }
      onCreated(size);
      setLabel("");
      setWidthMm("");
      setLengthMm("");
      dialogRef.current?.close();
      setOpen(false);
      addButtonRef.current?.focus();
    } catch {
      setError("The Size could not be created. Please try again.");
    } finally {
      setPending(false);
    }
  };

  return <div className={styles.sizeField}>
    <div className={styles.sizeFieldHeader}>
      <span>Size</span>
      <button
        aria-label="Add a new Size"
        className={styles.sizeAdd}
        onClick={() => { setError(""); setOpen(true); dialogRef.current?.showModal(); }}
        ref={addButtonRef}
        title="Add a new Size"
        type="button"
      >+</button>
    </div>
    <details className={styles.sizeDropdown}>
      <summary><span>{selectedLabels.length ? selectedLabels.join(", ") : "Choose size"}</span><small>{selected.length ? `${selected.length} selected` : "None selected"}</small></summary>
      <div className={styles.sizeOptions}>
        {options.length ? options.map((option) => <label key={option.id}>
          <input checked={selected.includes(option.id)} onChange={(event) => onToggle(option.id, event.target.checked)} type="checkbox" />
          <span>{option.label}</span>
        </label>) : <p>No Sizes have been added yet. Use the plus button to create one.</p>}
      </div>
    </details>
    <small>Choose one or more sizes used by the public Product filter.</small>

    <dialog
      aria-labelledby="add-size-title"
      className={styles.sizeDialog}
      onCancel={(event) => { event.preventDefault(); closeDialog(); }}
      onKeyDown={(event) => { if (event.key === "Enter" && event.target instanceof HTMLInputElement) { event.preventDefault(); void createSize(); } }}
      ref={dialogRef}
    >
      <div className={styles.sizeDialogHeader}>
        <div><span>Size library</span><h3 id="add-size-title">Add a new Size</h3></div>
        <button aria-label="Close Size popup" disabled={pending} onClick={closeDialog} type="button">×</button>
      </div>
      <div className={styles.sizeDialogFields}>
        <label>Size label *<input autoFocus disabled={!open} maxLength={100} onChange={(event) => setLabel(event.target.value)} placeholder="600 × 1200 mm" required value={label} /></label>
        <label>Width (mm) *<input disabled={!open} min="0.01" onChange={(event) => setWidthMm(event.target.value)} required step="0.01" type="number" value={widthMm} /></label>
        <label>Length (mm) *<input disabled={!open} min="0.01" onChange={(event) => setLengthMm(event.target.value)} required step="0.01" type="number" value={lengthMm} /></label>
      </div>
      {error ? <p className={styles.sizeDialogError} role="alert">{error}</p> : null}
      <div className={styles.sizeDialogActions}>
        <button disabled={pending} onClick={closeDialog} type="button">Cancel</button>
        <button disabled={pending || !label.trim() || !widthMm || !lengthMm} onClick={() => void createSize()} type="button">{pending ? "Adding…" : "Add size"}</button>
      </div>
    </dialog>
  </div>;
}

function ProductFilterField({ definition, selected }: Readonly<{
  definition: ProductEditorData["attributes"][number];
  selected: readonly string[];
}>) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(selected.filter((id) => definition.values.some((option) => option.id === id))));
  const selectedLabels = definition.values.filter((option) => selectedIds.has(option.id)).map((option) => option.label);

  return <div className={styles.filterField}>
    <span>{definition.name}</span>
    <details className={styles.sizeDropdown}>
      <summary>
        <span>{selectedLabels.length ? selectedLabels.join(", ") : `Choose ${definition.name.toLowerCase()}`}</span>
        <small>{selectedLabels.length ? `${selectedLabels.length} selected` : "All"}</small>
      </summary>
      <div className={styles.sizeOptions}>
        {definition.values.map((option) => <label key={option.id}>
          <input
            checked={selectedIds.has(option.id)}
            name="attributeValueId"
            onChange={(event) => setSelectedIds((current) => {
              const next = new Set(current);
              if (event.target.checked) next.add(option.id); else next.delete(option.id);
              return next;
            })}
            type="checkbox"
            value={option.id}
          />
          <span>{option.label}</span>
        </label>)}
      </div>
    </details>
    <small>Select one or more values used by the public Product filter.</small>
  </div>;
}

export function ProductEditor({ data, error, saved, onCancel, onDirty, onPendingChange }: ProductEditorProps) {
  const product = data.product;
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [mainImage, setMainImage] = useState(product?.previewMediaId ?? "");
  const [images, setImages] = useState<ProductEditorMedia[]>([...data.images]);
  const [gallery, setGallery] = useState<string[]>([...(product?.galleryIds ?? [])]);
  const [variants, setVariants] = useState<VariantState[]>(() => (product?.variants ?? []).map((item, index) => ({ ...item, clientKey: item.id ?? `existing-${index}` })));
  const [sizes, setSizes] = useState<ProductEditorOption[]>([...data.sizes]);
  const editableAttributes = data.attributes;
  const editableAttributeIds = new Set(data.managedAttributeValueIds);
  const retainedAttributeIds = (product?.attributeValueIds ?? []).filter((id) => !editableAttributeIds.has(id));
  const addImage = (asset: ProductEditorMedia) => setImages((current) => current.some((item) => item.id === asset.id) ? current : [asset, ...current]);
  const selectGallery = (id: string) => setGallery((current) => current.includes(id) ? current : [...current, id]);
  const removeGallery = (id: string) => setGallery((current) => current.filter((item) => item !== id));
  const selectSize = (sizeId: string, checked: boolean) => {
    setVariants((current) => checked
      ? current.some((variant) => variant.sizeId === sizeId) ? current : [...current, { clientKey: `new-${sizeId}`, id: null, sizeId, sku: "", thicknessMm: "", attributeValueIds: [] }]
      : current.filter((variant) => variant.sizeId !== sizeId));
  };
  const touch = () => onDirty?.();
  const addSize = (size: ProductEditorOption) => {
    setSizes((current) => current.some((item) => item.id === size.id) ? current : [...current, size]);
    selectSize(size.id, true);
    touch();
  };

  return <div className={styles.editor}>
    <header className={styles.header}>
      <div><p>Content studio / Products</p><h1 id="product-editor-title">{product ? `Edit ${product.name}` : "Add product"}</h1><span>A concise Product record for the public catalogue.</span></div>
      <button autoFocus aria-label="Close product editor" className={styles.close} onClick={onCancel} type="button">×</button>
    </header>
    {error ? <p className={styles.error} role="alert">{error}</p> : null}
    {saved ? <p className={styles.success} role="status">Product saved and public Product routes revalidated.</p> : null}
    <form action={saveProduct} className={styles.form} onChange={touch}>
      <PendingBridge onChange={onPendingChange} />
      <input name="id" type="hidden" value={product?.id ?? ""} />
      <input name="previewMediaId" type="hidden" value={mainImage} />
      <input name="primaryTextureId" type="hidden" value={product?.primaryTextureId ?? ""} />
      <input name="gallery" type="hidden" value={JSON.stringify(gallery)} />
      <input name="variants" type="hidden" value={JSON.stringify(variants.map((variant) => ({ id: variant.id, sizeId: variant.sizeId, sku: variant.sku, thicknessMm: variant.thicknessMm, attributeValueIds: variant.attributeValueIds })))} />
      <input name="seoTitle" type="hidden" value={product?.seoTitle ?? ""} />
      <input name="seoDescription" type="hidden" value={product?.seoDescription ?? ""} />
      <input name="seoImageId" type="hidden" value={product?.seoImageId ?? ""} />
      <input name="seoNoIndex" type="hidden" value={product?.seoNoIndex ? "on" : ""} />
      {retainedAttributeIds.map((id) => <input key={id} name="attributeValueId" type="hidden" value={id} />)}

      <div className={styles.formBody}>
        <section>
          <div className={styles.sectionTitle}><span>01</span><div><h2>Basic details</h2><p>Name, code and public description.</p></div></div>
          <div className={styles.fields}>
            <label>Product name *<input name="name" required maxLength={160} value={name} onChange={(event) => { const next = event.target.value; setName(next); if (!slugTouched) setSlug(slugify(next)); }} /></label>
            <label>Product code<input name="code" maxLength={100} defaultValue={product?.code ?? ""} /></label>
            <label className={styles.wide}>Short description<textarea name="description" rows={3} maxLength={5000} defaultValue={product?.description ?? ""} /></label>
            <label className={styles.slugField}>Public slug *<input name="slug" required maxLength={160} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugTouched(true); setSlug(event.target.value.toLowerCase()); }} /><small>Generated for new Products; existing slugs stay unchanged unless edited.</small></label>
          </div>
        </section>

        <section>
          <div className={styles.sectionTitle}><span>02</span><div><h2>Classification</h2><p>Collections, sizes and the public catalogue filters.</p></div></div>
          <div className={styles.classification}>
            <fieldset><legend>Collection</legend><div className={styles.choiceGrid}>{data.collections.map((item) => <label key={item.id}><input defaultChecked={product?.collectionIds.includes(item.id)} name="collectionId" type="checkbox" value={item.id} /><span>{item.label}<small>{item.state?.toLowerCase()}</small></span></label>)}</div><small>Multiple published Collections may be assigned. Existing archived links remain visible while editing.</small></fieldset>
            <ProductSizeField options={sizes} selected={variants.map((variant) => variant.sizeId)} onToggle={(id, checked) => { selectSize(id, checked); touch(); }} onCreated={addSize} />
            {editableAttributes.map((definition) => <ProductFilterField definition={definition} key={`${product?.id ?? "new"}-${definition.id}`} selected={product?.attributeValueIds ?? []} />)}
          </div>
        </section>

        <section>
          <div className={styles.sectionTitle}><span>03</span><div><h2>Images</h2><p>Upload immediately or choose approved media.</p></div></div>
          <div className={styles.mediaSection}><h3>Main image</h3><p>Required before publishing and used by Product cards.</p><AdminMediaPicker assets={images} selected={mainImage ? [mainImage] : []} onSelect={(id) => { setMainImage(id); touch(); }} onRemove={() => { setMainImage(""); touch(); }} onUpload={addImage} empty="No approved images are available." /></div>
          <div className={styles.mediaSection}><h3>Gallery</h3><p>Selected images retain the displayed order. Use the remove button to unlink an image.</p><AdminMediaPicker assets={images} selected={gallery} onSelect={(id) => { selectGallery(id); touch(); }} onRemove={(id) => { removeGallery(id); touch(); }} onUpload={addImage} multiple empty="No approved images are available." /></div>
        </section>

        <section>
          <div className={styles.sectionTitle}><span>04</span><div><h2>Publishing</h2><p>Visibility, featured state and deterministic ordering.</p></div></div>
          <div className={styles.fields}>
            <label>Status<select name="state" defaultValue={product?.state ?? "DRAFT"}><option value="DRAFT">Draft</option><option value="PUBLISHED">Published</option><option value="ARCHIVED">Archived</option></select><small>Publishing requires an approved Main Image.</small></label>
            <label>Display order<input name="sortOrder" type="number" min={0} max={100000} defaultValue={product?.sortOrder ?? 0} /></label>
            <label className={styles.toggle}><input name="isFeatured" type="checkbox" defaultChecked={product?.isFeatured} /><span><strong>Featured</strong><small>Prioritised in public sorting.</small></span></label>
            <label className={styles.toggle}><input name="homepageHeroEligible" type="checkbox" defaultChecked={product?.homepageHeroEligible} /><span><strong>Homepage eligible</strong><small>May be selected for homepage Product imagery.</small></span></label>
          </div>
        </section>
      </div>

      <footer className={styles.actions}><SubmitControls published={product?.state === "PUBLISHED"} onCancel={onCancel} /></footer>
    </form>
  </div>;
}
