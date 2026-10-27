import "server-only";

import type { AttributeKind } from "@/generated/prisma/enums";
import { mediaUrl } from "@/lib/media";
import { managedProductFilterTaxonomy, productFilterValueSlug } from "@/lib/products/product-filter-taxonomy";
import { getDb } from "@/server/db";

export type ProductEditorOption = Readonly<{ id: string; label: string; state?: string }>;
export type ProductEditorMedia = Readonly<{ id: string; label: string; src: string | null; mimeType: string; width?: number | null; height?: number | null }>;
export type ProductEditorAttribute = Readonly<{ id: string; name: string; kind: string; values: readonly ProductEditorOption[] }>;
export type ProductEditorVariant = Readonly<{ id: string | null; sizeId: string; sku: string; thicknessMm: string }>;
export type ProductEditorRecord = Readonly<{
  id: string; name: string; slug: string; code: string; description: string;
  collectionIds: readonly string[]; attributeValueIds: readonly string[];
  variants: readonly ProductEditorVariant[]; previewMediaId: string; primaryTextureId: string;
  galleryIds: readonly string[];
  state: "DRAFT" | "PUBLISHED" | "ARCHIVED"; isFeatured: boolean; homepageHeroEligible: boolean; sortOrder: number;
  seoTitle: string; seoDescription: string; seoImageId: string; seoNoIndex: boolean;
}>;
export type ProductEditorData = Readonly<{
  product: ProductEditorRecord | null; collections: readonly ProductEditorOption[];
  attributes: readonly ProductEditorAttribute[]; managedAttributeValueIds: readonly string[]; sizes: readonly ProductEditorOption[];
  images: readonly ProductEditorMedia[];
}>;

async function ensureManagedProductFilters() {
  const db = getDb();
  const definitions: ProductEditorAttribute[] = [];
  for (const [definitionIndex, filter] of managedProductFilterTaxonomy.entries()) {
    const existing = await db.attributeDefinition.findFirst({
      where: { OR: [{ kind: filter.kind as AttributeKind }, { slug: filter.definitionSlug }] },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    const definition = existing
      ? await db.attributeDefinition.update({
          where: { id: existing.id },
          data: { name: filter.definitionName, kind: filter.kind as AttributeKind, filterable: true, sortOrder: definitionIndex },
          select: { id: true, name: true, kind: true },
        })
      : await db.attributeDefinition.create({
          data: { name: filter.definitionName, slug: filter.definitionSlug, kind: filter.kind as AttributeKind, filterable: true, sortOrder: definitionIndex },
          select: { id: true, name: true, kind: true },
        });
    await Promise.all(filter.options.map((label, sortOrder) => db.attributeValue.upsert({
      where: { definitionId_slug: { definitionId: definition.id, slug: productFilterValueSlug(label) } },
      create: { definitionId: definition.id, slug: productFilterValueSlug(label), label, sortOrder },
      update: { label, sortOrder },
    })));
    const values = await db.attributeValue.findMany({
      where: { definitionId: definition.id, slug: { in: filter.options.map(productFilterValueSlug) } },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
      select: { id: true, label: true },
    });
    definitions.push({ id: definition.id, name: filter.label, kind: definition.kind, values: values.map((value) => ({ id: value.id, label: value.label })) });
  }
  return definitions;
}

export async function getProductEditorData(productId?: string): Promise<ProductEditorData> {
  const db = getDb();
  const definitions = await ensureManagedProductFilters();
  const managedKinds = managedProductFilterTaxonomy.map((filter) => filter.kind as AttributeKind);
  const [collections, managedAttributeValues, sizes, product] = await Promise.all([
    db.collection.findMany({
      where: productId ? { OR: [{ state: "PUBLISHED" }, { products: { some: { productId } } }] } : { state: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, state: true },
    }),
    db.attributeValue.findMany({ where: { definition: { kind: { in: managedKinds } } }, select: { id: true } }),
    db.size.findMany({ orderBy: [{ widthMm: "asc" }, { lengthMm: "asc" }], select: { id: true, label: true } }),
    productId ? db.product.findUnique({ where: { id: productId }, include: {
      collections: { orderBy: { sortOrder: "asc" }, select: { collectionId: true } }, attributes: { select: { valueId: true } },
      variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }] },
      images: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { mediaId: true } }, seo: true,
    } }) : null,
  ]);
  // Load only this product's attachments; there is no shared media browser.
  const mediaIds = product ? [product.previewMediaId, product.primaryTextureId, ...product.images.map((image) => image.mediaId)].filter((id): id is string => Boolean(id)) : [];
  const images = product ? await db.mediaAsset.findMany({
    where: { approved: true, OR: [{ id: { in: mediaIds } }, ...(product.seo?.socialImageKey ? [{ storageKey: product.seo.socialImageKey }] : [])] },
    select: { id: true, originalFilename: true, alt: true, storageKey: true, mimeType: true },
  }) : [];
  const seoImageId = images.find((image) => image.storageKey === product?.seo?.socialImageKey)?.id ?? "";
  return {
    collections: collections.map((item) => ({ id: item.id, label: item.name, state: item.state })),
    attributes: definitions,
    managedAttributeValueIds: managedAttributeValues.map((item) => item.id),
    sizes: sizes.map((item) => ({ id: item.id, label: item.label })),
    images: images.map((image) => ({ id: image.id, label: image.alt.trim() || image.originalFilename, src: mediaUrl(image.storageKey), mimeType: image.mimeType })),
    product: product ? {
      id: product.id, name: product.name, slug: product.slug, code: product.code ?? "", description: product.description ?? "",
      collectionIds: product.collections.map((item) => item.collectionId), attributeValueIds: product.attributes.map((item) => item.valueId),
      variants: product.variants.map((item) => ({ id: item.id, sizeId: item.sizeId, sku: item.sku ?? "", thicknessMm: item.thicknessMm?.toString() ?? "" })),
      previewMediaId: product.previewMediaId ?? "", primaryTextureId: product.primaryTextureId ?? "", galleryIds: product.images.map((item) => item.mediaId), state: product.state, isFeatured: product.isFeatured,
      homepageHeroEligible: product.homepageHeroEligible, sortOrder: product.sortOrder, seoTitle: product.seo?.title ?? "", seoDescription: product.seo?.description ?? "", seoImageId, seoNoIndex: product.seo?.noIndex ?? false,
    } : null,
  };
}
