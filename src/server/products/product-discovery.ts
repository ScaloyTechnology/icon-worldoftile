import "server-only";

import { cache } from "react";
import { productCollections, productIntroTiles, products } from "@/content/products";
import { managedProductFilterTaxonomy } from "@/lib/products/product-filter-taxonomy";
import { getPublicCollections } from "@/server/collections/public-collections";
import { getDb } from "@/server/db";
import { mapProductRow, productListInclude } from "./product-mapper";
import type { HomeMedia } from "@/types/home";
import type { Product, ProductCollection, ProductDiscoveryData, ProductFilterGroup, ProductFilterKey } from "@/types/products";

const filterDefinitions: readonly [ProductFilterKey, string, string, string][] = [
  ["applications", "Application", "application", "Published application mappings."],
  ["looks", "Look & feel", "look", "Published visual classifications."],
  ["colors", "Colours", "colour", "Published colour classifications."],
  ["sizes", "Size", "size", "Published product dimensions."],
  ["surfaces", "Surface", "surface", "Published surface classifications."],
];

const requestedOptions: Partial<Record<ProductFilterKey, readonly string[]>> = Object.fromEntries(
  managedProductFilterTaxonomy.map((filter) => [filter.key, filter.options]),
);

function filtersFrom(publicProducts: readonly Product[]): readonly ProductFilterGroup[] {
  return filterDefinitions.map(([key, label, param, description]) => {
    const requested = requestedOptions[key] ?? [];
    const discovered = publicProducts.flatMap((product) => product[key]);
    const requestedKeys = new Set(requested.map((value) => value.toLocaleLowerCase()));
    const discoveredExtras = [...new Map(discovered
      .filter((value) => !requestedKeys.has(value.toLocaleLowerCase()))
      .map((value) => [value.toLocaleLowerCase(), value])).values()].sort((a, b) => a.localeCompare(b));
    const values = [...requested, ...discoveredExtras];
    return { key, label, param, description, options: values.map((value) => ({ value, label: value })) };
  });
}

export const fallbackProductDiscovery: ProductDiscoveryData = {
  products, collections: productCollections, filterGroups: filtersFrom(products),
  introTiles: productIntroTiles, source: "development-fallback",
};

function collectionMedia(image: HomeMedia | null, name: string): HomeMedia {
  return image ?? { src: null, alt: name, placeholderLabel: name, tone: "stone" };
}

async function readDatabase(): Promise<ProductDiscoveryData> {
  const [rows, publicCollections] = await Promise.all([
    getDb().product.findMany({
      where: { state: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], include: productListInclude,
    }),
    getPublicCollections(),
  ]);
  const mapped = rows.flatMap((row, index) => mapProductRow(row, index) ?? []);
  const collections: ProductCollection[] = publicCollections.collections.map((collection) => ({
    id: collection.id, slug: collection.slug, name: collection.name,
    description: collection.description, media: collectionMedia(collection.image, collection.name),
    featured: collection.featured,
  }));
  return { products: mapped, collections, filterGroups: filtersFrom(mapped), introTiles: productIntroTiles, source: "database" };
}

export const getProductDiscovery = cache(async (): Promise<ProductDiscoveryData> => {
  // Local development can still use the reviewed image-study preview when no
  // database is configured. A configured but empty production DB stays empty.
  if (!process.env.DATABASE_URL) return fallbackProductDiscovery;
  try {
    return await readDatabase();
  } catch (error) {
    console.error("Public products could not be loaded", error);
    return { products: [], collections: [], filterGroups: filtersFrom([]), introTiles: productIntroTiles, source: "database" };
  }
});
