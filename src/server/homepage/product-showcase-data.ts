import "server-only";

import { cache } from "react";

import { curatedShowcaseMedia } from "@/content/home-product-showcase";
import { productCollections, products as fallbackProducts } from "@/content/products";
import { getProductDiscovery } from "@/server/products/product-discovery";
import type { ProductShowcaseField, ProductShowcaseItem, ProductShowcaseMedia } from "@/types/home-product-showcase";
import type { Product, ProductCollection } from "@/types/products";

function firstSize(product: Product) {
  const match = product.sizes[0]?.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);
  if (!match) return { widthMm: null, heightMm: null };
  const first = Number(match[1]);
  const second = Number(match[2]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return { widthMm: null, heightMm: null };
  // Match Product Detail's approved landscape presentation while retaining
  // the product's real ratio (for example, 1200 x 200 remains 6:1).
  return { widthMm: Math.max(first, second), heightMm: Math.min(first, second) };
}

function readThickness(product: Product) {
  const value = product.thickness?.match(/(\d+(?:\.\d+)?)\s*mm/i)?.[1];
  const parsed = value ? Number(value) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function productFields(product: Product, collection: ProductCollection | null): ProductShowcaseField[] {
  const entries: Array<[string, string | null]> = [
    ["Collection", collection?.name ?? null],
    ["Size", product.sizes.join(" / ") || null],
    ["Finish", product.finishes.join(" / ") || null],
    ["Surface", product.surfaces.join(" / ") || null],
    ["Colour", product.colors.join(" / ") || null],
    ["Look", product.looks.join(" / ") || null],
    ["Thickness", product.thickness],
    ["Applications", product.applications.join(" / ") || null],
  ];
  return entries.flatMap(([label, value]) => value ? [{ label, value }] : []);
}

function mapProduct(
  product: Product,
  collections: readonly ProductCollection[],
  source: ProductShowcaseItem["source"],
  texture?: ProductShowcaseMedia,
): ProductShowcaseItem {
  const collection = collections.find((item) => item.id === product.collectionId) ?? null;
  const dimensions = firstSize(product);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    collection: collection?.name ?? null,
    texture: texture ?? {
      src: product.primaryMedia.src,
      alt: product.primaryMedia.alt,
      width: product.primaryMedia.width ?? null,
      height: product.primaryMedia.height ?? null,
    },
    inspectorMedia: {
      src: product.primaryMedia.src || texture?.src || "",
      alt: product.primaryMedia.alt || texture?.alt || product.name,
      width: product.primaryMedia.width ?? texture?.width ?? null,
      height: product.primaryMedia.height ?? texture?.height ?? null,
    },
    widthMm: dimensions.widthMm,
    heightMm: dimensions.heightMm,
    thicknessMm: readThickness(product),
    finish: product.finishes[0] ?? null,
    fields: productFields(product, collection),
    source,
  };
}

export const getHomepageHeroProducts = cache(async (): Promise<readonly ProductShowcaseItem[]> => {
  const discovery = await getProductDiscovery();
  const selected: ProductShowcaseItem[] = [];

  for (const curated of curatedShowcaseMedia) {
    const liveProduct = discovery.products.find((item) => item.slug === curated.slug);
    const product = liveProduct ?? fallbackProducts.find((item) => item.slug === curated.slug);
    if (!product) continue;
    selected.push(mapProduct(
      product,
      liveProduct ? discovery.collections : productCollections,
      liveProduct ? discovery.source : "development-fallback",
      curated.media,
    ));
  }

  return selected;
});
