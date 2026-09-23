import "server-only";

import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";

export type ProductEditorOption = Readonly<{ id: string; label: string; state?: string }>;
export type ProductEditorMedia = Readonly<{ id: string; label: string; src: string | null; mimeType: string }>;
export type ProductEditorAttribute = Readonly<{ id: string; name: string; kind: string; values: readonly ProductEditorOption[] }>;
export type ProductEditorVariant = Readonly<{ id: string | null; sizeId: string; sku: string; thicknessMm: string; attributeValueIds: readonly string[] }>;
export type ProductEditorDocument = Readonly<{ mediaId: string; title: string }>;
export type ProductEditorRecord = Readonly<{
  id: string; name: string; slug: string; code: string; description: string; applicationDescription: string; technicalDescription: string; technicalMediaId: string; categoryId: string;
  collectionIds: readonly string[]; attributeValueIds: readonly string[]; applicationIds: readonly string[];
  variants: readonly ProductEditorVariant[]; previewMediaId: string; primaryTextureId: string;
  galleryIds: readonly string[]; documents: readonly ProductEditorDocument[]; specifications: Readonly<Record<string, string>>;
  state: "DRAFT" | "PUBLISHED" | "ARCHIVED"; isFeatured: boolean; homepageHeroEligible: boolean; sortOrder: number;
  seoTitle: string; seoDescription: string; seoImageId: string; seoNoIndex: boolean;
}>;
export type ProductEditorData = Readonly<{
  product: ProductEditorRecord | null; categories: readonly ProductEditorOption[]; collections: readonly ProductEditorOption[];
  attributes: readonly ProductEditorAttribute[]; applications: readonly ProductEditorOption[]; sizes: readonly ProductEditorOption[];
  specifications: readonly ProductEditorOption[]; images: readonly ProductEditorMedia[]; documents: readonly ProductEditorMedia[];
}>;

function publicMediaUrl(storageKey: string) {
  try { return mediaUrl(storageKey); } catch { return null; }
}

export async function getProductEditorData(productId?: string): Promise<ProductEditorData> {
  const db = getDb();
  const [categories, collections, definitions, applications, sizes, specificationDefinitions, media, product] = await Promise.all([
    db.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    db.collection.findMany({
      where: productId ? { OR: [{ state: "PUBLISHED" }, { products: { some: { productId } } }] } : { state: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, state: true },
    }),
    db.attributeDefinition.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, kind: true, values: { orderBy: [{ sortOrder: "asc" }, { label: "asc" }], select: { id: true, label: true } } } }),
    db.application.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, state: true } }),
    db.size.findMany({ orderBy: [{ widthMm: "asc" }, { lengthMm: "asc" }], select: { id: true, label: true } }),
    db.specificationDefinition.findMany({ orderBy: { label: "asc" }, select: { id: true, label: true, unit: true } }),
    db.mediaAsset.findMany({ where: { approved: true, OR: [{ mimeType: { startsWith: "image/" } }, { mimeType: "application/pdf" }] }, orderBy: [{ updatedAt: "desc" }, { originalFilename: "asc" }], select: { id: true, originalFilename: true, alt: true, storageKey: true, mimeType: true } }),
    productId ? db.product.findUnique({ where: { id: productId }, include: {
      collections: { orderBy: { sortOrder: "asc" }, select: { collectionId: true } }, attributes: { select: { valueId: true } },
      applications: { select: { applicationId: true } }, variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: { attributes: { select: { valueId: true } } } },
      images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { mediaId: true } },
      documents: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { mediaId: true, title: true } },
      specifications: { select: { definitionId: true, value: true } }, seo: true,
    } }) : null,
  ]);
  const images = media.filter((item) => item.mimeType.startsWith("image/"));
  const pdfs = media.filter((item) => item.mimeType === "application/pdf");
  const seoImageId = product?.seo?.socialImageKey ? images.find((item) => item.storageKey === product.seo?.socialImageKey)?.id ?? "" : "";
  return {
    categories: categories.map((item) => ({ id: item.id, label: item.name })),
    collections: collections.map((item) => ({ id: item.id, label: item.name, state: item.state })),
    attributes: definitions.map((item) => ({ id: item.id, name: item.name, kind: item.kind, values: item.values.map((value) => ({ id: value.id, label: value.label })) })),
    applications: applications.map((item) => ({ id: item.id, label: item.name, state: item.state })),
    sizes: sizes.map((item) => ({ id: item.id, label: item.label })),
    specifications: specificationDefinitions.map((item) => ({ id: item.id, label: item.unit ? `${item.label} (${item.unit})` : item.label })),
    images: images.map((item) => ({ id: item.id, label: item.alt.trim() || item.originalFilename, src: publicMediaUrl(item.storageKey), mimeType: item.mimeType })),
    documents: pdfs.map((item) => ({ id: item.id, label: item.originalFilename, src: publicMediaUrl(item.storageKey), mimeType: item.mimeType })),
    product: product ? {
      id: product.id, name: product.name, slug: product.slug, code: product.code ?? "", description: product.description ?? "", applicationDescription: product.applicationDescription ?? "", technicalDescription: product.technicalDescription ?? "", technicalMediaId: product.technicalMediaId ?? "", categoryId: product.categoryId ?? "",
      collectionIds: product.collections.map((item) => item.collectionId), attributeValueIds: product.attributes.map((item) => item.valueId), applicationIds: product.applications.map((item) => item.applicationId),
      variants: product.variants.map((item) => ({ id: item.id, sizeId: item.sizeId, sku: item.sku ?? "", thicknessMm: item.thicknessMm?.toString() ?? "", attributeValueIds: item.attributes.map((attribute) => attribute.valueId) })),
      previewMediaId: product.previewMediaId ?? "", primaryTextureId: product.primaryTextureId ?? "", galleryIds: product.images.map((item) => item.mediaId), documents: product.documents,
      specifications: Object.fromEntries(product.specifications.map((item) => [item.definitionId, item.value])), state: product.state, isFeatured: product.isFeatured,
      homepageHeroEligible: product.homepageHeroEligible, sortOrder: product.sortOrder, seoTitle: product.seo?.title ?? "", seoDescription: product.seo?.description ?? "", seoImageId, seoNoIndex: product.seo?.noIndex ?? false,
    } : null,
  };
}
