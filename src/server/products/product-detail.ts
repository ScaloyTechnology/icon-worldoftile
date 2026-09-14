import "server-only";

import { cache } from "react";
import { products as fallbackProducts } from "@/content/products";
import { getProductDiscovery } from "@/server/products/product-discovery";
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
  if (product.collectionId === candidate.collectionId) score += 12;
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
    .sort((a, b) => b.score - a.score || (a.candidate.sortOrder ?? 0) - (b.candidate.sortOrder ?? 0))
    .slice(0, 5)
    .map(({ candidate }) => candidate);
}

export const getProductDetail = cache(async (slug: string): Promise<ProductDetailData | null> => {
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
    ...field("Collection", collection?.name ?? null),
    ...field("Category", product.category),
    ...field("Size", product.sizes),
    ...field("Thickness", product.thickness),
    ...field("Finish", product.finishes),
    ...field("Surface", product.surfaces),
    ...field("Colour", product.colors),
    ...field("Look", product.looks),
    ...field("Applications", product.applications),
  ];
  const descriptionParts = [
    collection?.name ? `${product.name} from the ${collection.name}` : product.name,
    product.looks.length ? `${product.looks.join(" and ")} character` : null,
    product.colors.length ? `in ${product.colors.join(" and ")}` : null,
  ].filter(Boolean);

  return {
    product,
    collectionName: collection?.name ?? null,
    description: `${descriptionParts.join(", ")}.`,
    sizes,
    details,
    specifications: [
      ...field("Dimensions", product.sizes),
      ...field("Thickness", product.thickness),
      ...field("Finish", product.finishes),
      ...field("Surface", product.surfaces),
      ...product.technicalSpecifications,
    ],
    documents: product.technicalSheetHref ? [{ label: "Download technical sheet", href: product.technicalSheetHref }] : [],
    detailMedia,
    applicationMedia,
    relatedProducts: selectRelated(product, discovery.products),
    imageAspect,
    thicknessMm: parseThickness(product.thickness),
  };
});

export function getFallbackProductSlugs() {
  return fallbackProducts.map((product) => ({ slug: product.slug }));
}
