import "server-only";

import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { products as fallbackProducts } from "@/content/products";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import { getProductDiscovery } from "@/server/products/product-discovery";
import { mapProductRow, mappedProductMedia, mediaSelect, productListInclude } from "@/server/products/product-mapper";
import type { ProductDetailData, ProductDetailField, ProductSizeOption } from "@/types/product-detail";
import type { Product } from "@/types/products";

function unique(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function parseProductSize(label: string): ProductSizeOption | null {
  label = label.replace(/\u00d7/g, "x");
  const match = label.match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second) || first <= 0 || second <= 0) return null;
  return { label, widthMm: Math.max(first, second), heightMm: Math.min(first, second) };
}

function parseThickness(value: string | null) {
  const match = value?.match(/(\d+(?:\.\d+)?)\s*mm/i);
  const thickness = match ? Number(match[1]) : NaN;
  return Number.isFinite(thickness) && thickness > 0 ? thickness : null;
}

function field(label: string, values: readonly string[] | string | null): ProductDetailField[] {
  const value = typeof values === "string" ? values.trim() : values ? unique(values).join(" / ") : "";
  return value ? [{ label, value }] : [];
}

function isArchitecturalPreview(product: Product) {
  return /(interior|living|bedroom|cafe|reception|boutique|courtyard|architectural|space)/i.test(product.primaryMedia.alt)
    && !/tile face/i.test(product.primaryMedia.alt);
}

function relatedScore(product: Product, candidate: Product) {
  let score = 0;
  if (product.relatedProductSlugs.includes(candidate.slug)) score += 100;
  if ((product.collectionIds ?? [product.collectionId]).some((id) => (candidate.collectionIds ?? [candidate.collectionId]).includes(id))) score += 12;
  if (product.category !== "Material" && product.category === candidate.category) score += 3;
  score += product.looks.filter((value) => candidate.looks.includes(value)).length * 5;
  score += product.surfaces.filter((value) => candidate.surfaces.includes(value)).length * 4;
  score += product.colors.filter((value) => candidate.colors.includes(value)).length * 2;
  score += product.applications.filter((value) => candidate.applications.includes(value)).length * 2;
  return score;
}

function selectRelated(product: Product, products: readonly Product[]) {
  return products
    .filter((candidate) => candidate.id !== product.id && candidate.primaryMedia.src !== product.primaryMedia.src)
    .map((candidate) => ({ candidate, score: relatedScore(product, candidate) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (a.candidate.sortOrder ?? 0) - (b.candidate.sortOrder ?? 0))
    .slice(0, 5)
    .map(({ candidate }) => candidate);
}

const detailInclude = {
  ...productListInclude,
  images: { where: { media: { approved: true } }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { media: { select: mediaSelect } } },
  seo: { select: { title: true, description: true, socialImageKey: true, noIndex: true } },
} as const satisfies Prisma.ProductInclude;

export const getProductDetail = cache(async (slug: string): Promise<ProductDetailData | null> => {
  if (process.env.DATABASE_URL) {
    try {
      const db = getDb();
      const row = await db.product.findFirst({ where: { slug, state: "PUBLISHED" }, include: detailInclude });
      if (!row) return null;
      const mapped = mapProductRow(row, 0);
      if (!mapped) return null;
      const texture = mappedProductMedia(row.primaryTexture, row.name);
      const gallery = row.images.flatMap((image) => mappedProductMedia(image.media, row.name) ?? []);
      const product: Product = { ...mapped, gallery };
      const collectionName = row.collections[0]?.collection.name ?? null;
      const relatedWhere: Prisma.ProductWhereInput[] = [];
      const collectionIds = row.collections.map((relation) => relation.collection.id);
      if (collectionIds.length) relatedWhere.push({ collections: { some: { collectionId: { in: collectionIds } } } });
      const relatedRows = await db.product.findMany({
        where: { state: "PUBLISHED", id: { not: row.id }, ...(relatedWhere.length ? { OR: relatedWhere } : {}) },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 24, include: productListInclude,
      });
      const related = selectRelated(product, relatedRows.flatMap((candidate, index) => mapProductRow(candidate, index) ?? []));
      const sizes = product.sizes.flatMap((size) => parseProductSize(size) ?? []);
      const details = [
        ...field("Collection", row.collections.map((relation) => relation.collection.name)), ...field("Size", product.sizes),
        ...field("Application", product.applications), ...field("Look & Feel", product.looks),
        ...field("Colours", product.colors), ...field("Surface", product.surfaces),
      ];
      const imageAspect = product.primaryMedia.width && product.primaryMedia.height
        ? product.primaryMedia.width / product.primaryMedia.height : sizes[0] ? sizes[0].widthMm / sizes[0].heightMm : 1;
      const preview = mappedProductMedia(row.previewMedia, row.name);
      const applicationMedia = preview && isArchitecturalPreview({ ...product, primaryMedia: preview }) ? preview : null;
      let seoImageSrc: string | null = null;
      if (row.seo?.socialImageKey) {
        try { seoImageSrc = mediaUrl(row.seo.socialImageKey); } catch { seoImageSrc = null; }
      }
      return {
        product, productCode: row.code?.trim() || null, collectionName, description: row.description?.trim() || `${row.name}.`, sizes, details,
        detailMedia: gallery[0] ?? product.primaryMedia, applicationMedia,
        relatedProducts: related, imageAspect, thicknessMm: parseThickness(product.thickness), inspectorTextureSrc: texture?.src ?? null,
        seo: row.seo ? { title: row.seo.title?.trim() || null, description: row.seo.description?.trim() || null, imageSrc: seoImageSrc, noIndex: row.seo.noIndex } : null,
      };
    } catch (error) {
      console.error("Public product detail could not be loaded", error);
      return null;
    }
  }
  const discovery = await getProductDiscovery();
  const product = discovery.products.find((item) => item.slug === slug);
  if (!product) return null;

  const collection = discovery.collections.find((item) => item.id === product.collectionId) ?? null;
  const sizes = product.sizes.flatMap((size) => parseProductSize(size) ?? []);
  const activeSize = sizes[0] ?? null;
  const imageAspect = product.primaryMedia.width && product.primaryMedia.height
    ? product.primaryMedia.width / product.primaryMedia.height
    : activeSize ? activeSize.widthMm / activeSize.heightMm : 1.8;
  const detailMedia = product.gallery[0] ?? product.primaryMedia;
  const applicationMedia = product.gallery[1]
    ?? (product.applications.length || isArchitecturalPreview(product) ? product.primaryMedia : null);
  const details = [
    ...field("Collection", discovery.collections.filter((item) => (product.collectionIds ?? [product.collectionId]).includes(item.id)).map((item) => item.name)),
    ...field("Size", product.sizes),
    ...field("Application", product.applications),
    ...field("Look & Feel", product.looks),
    ...field("Colours", product.colors),
    ...field("Surface", product.surfaces),
  ];
  const descriptionParts = [
    collection?.name ? `${product.name} from the ${collection.name}` : product.name,
    product.looks.length ? `${product.looks.join(" and ")} character` : null,
    product.colors.length ? `in ${product.colors.join(" and ")}` : null,
  ].filter(Boolean);

  return {
    product,
    productCode: null,
    collectionName: collection?.name ?? null,
    description: `${descriptionParts.join(", ")}.`,
    sizes,
    details,
    detailMedia,
    applicationMedia,
    relatedProducts: selectRelated(product, discovery.products),
    imageAspect,
    thicknessMm: parseThickness(product.thickness),
    inspectorTextureSrc: product.primaryMedia.src,
    seo: null,
  };
});

export function getFallbackProductSlugs() {
  return process.env.DATABASE_URL ? [] : fallbackProducts.map((product) => ({ slug: product.slug }));
}
