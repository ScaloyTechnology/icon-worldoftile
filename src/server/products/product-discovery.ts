import "server-only";

import { cache } from "react";
import { productCollections, productFilterGroups, productIntroTiles, products } from "@/content/products";
import { getPublicCollections } from "@/server/collections/public-collections";
import { getDb } from "@/server/db";
import { mapProductRow, productListInclude } from "./product-mapper";
import type { HomeMedia } from "@/types/home";
import type { Product, ProductCollection, ProductDiscoveryData, ProductFilterGroup, ProductFilterKey } from "@/types/products";

export const fallbackProductDiscovery: ProductDiscoveryData = {
  products, collections: productCollections, filterGroups: productFilterGroups,
  introTiles: productIntroTiles, source: "development-fallback",
};

const filterDefinitions: readonly [ProductFilterKey, string, string, string][] = [
  ["locations", "Location", "location", "Room and project contexts."],
  ["sizes", "Size", "size", "Published product dimensions."],
  ["finishes", "Finish", "finish", "Published finish classifications."],
  ["surfaces", "Surface", "surface", "Published surface classifications."],
  ["colors", "Colours", "colour", "Published colour classifications."],
  ["looks", "Look & feel", "look", "Published visual classifications."],
  ["applications", "Application", "application", "Published application mappings."],
];

function filtersFrom(publicProducts: readonly Product[]): readonly ProductFilterGroup[] {
  return filterDefinitions.map(([key, label, param, description]) => {
    const values = [...new Set(publicProducts.flatMap((product) => product[key]))].sort((a, b) => a.localeCompare(b));
    return { key, label, param, description, options: values.map((value) => ({ value, label: value })) };
  });
}

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
