import "server-only";

import { clientSurfaceTaxonomy } from "@/content/product-taxonomy";
import { productCollections, productFilterGroups, productIntroTiles, products } from "@/content/products";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { HomeMedia } from "@/types/home";
import type { Product, ProductCollection, ProductDiscoveryData, ProductFilterGroup, ProductFilterKey } from "@/types/products";

export const fallbackProductDiscovery: ProductDiscoveryData = {
  products,
  collections: productCollections,
  filterGroups: productFilterGroups,
  introTiles: productIntroTiles,
  source: "development-fallback",
};

// The optional catalogue models may not exist in a minimal generated client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;
const kindToKey: Record<string, ProductFilterKey | undefined> = {
  FINISH: "finishes", SURFACE: "surfaces", COLOUR: "colors", LOOK: "looks",
};

function mapMedia(record: Row | null | undefined, fallbackAlt: string): HomeMedia | null {
  if (!record?.approved || !record.storageKey) return null;
  try {
    return {
      src: mediaUrl(record.storageKey), alt: record.alt || fallbackAlt,
      placeholderLabel: fallbackAlt, tone: "stone", width: record.width ?? undefined, height: record.height ?? undefined,
    };
  } catch { return null; }
}

function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }

function filtersFrom(productsToIndex: readonly Product[]): readonly ProductFilterGroup[] {
  const definitions: Array<[ProductFilterKey, string, string, string]> = [
    ["sizes", "Size", "size", "Published product dimensions."],
    ["finishes", "Finish", "finish", "Published finish classifications."],
    ["surfaces", "Surface", "surface", "Published surface classifications."],
    ["colors", "Colour", "colour", "Published colour classifications."],
    ["looks", "Look", "look", "Published visual classifications."],
    ["applications", "Application", "application", "Published application mappings."],
  ];
  return definitions.map(([key, label, param, description]) => {
    const publishedValues = unique(productsToIndex.flatMap((product) => [...product[key]]));
    const values = key === "surfaces"
      ? unique([...clientSurfaceTaxonomy, ...publishedValues])
      : publishedValues;
    return {
      key, label, param, description,
      options: values.sort().map((value) => ({ value, label: value })),
    };
  });
}

function mapRow(row: Row, index: number): Product | null {
  const primary = mapMedia(row.previewMedia, row.name)
    ?? mapMedia(row.primaryTexture, row.name)
    ?? mapMedia(row.images?.[0]?.media, row.name);
  if (!primary) return null;
  const attributes: Record<ProductFilterKey, string[]> = {
    sizes: [], finishes: [], surfaces: [], colors: [], looks: [], applications: [],
  };
  for (const item of row.attributes ?? []) {
    const key = kindToKey[item.value?.definition?.kind];
    if (key && item.value?.label) attributes[key].push(item.value.label);
  }
  for (const variant of row.variants ?? []) {
    if (variant.size?.label) attributes.sizes.push(variant.size.label);
    for (const item of variant.attributes ?? []) {
      const key = kindToKey[item.value?.definition?.kind];
      if (key && item.value?.label) attributes[key].push(item.value.label);
    }
  }
  attributes.applications.push(...(row.applications ?? []).map((item: Row) => item.application?.name).filter(Boolean));
  const relation = row.collections?.[0]?.collection;
  const thicknesses = unique((row.variants ?? []).map((variant: Row) => variant.thicknessMm ? `${Number(variant.thicknessMm)} mm` : ""));
  return {
    id: row.id, name: row.name, slug: row.slug, collectionId: relation?.id ?? "uncollected",
    category: row.category?.name ?? "Material", primaryMedia: primary,
    gallery: (row.images ?? []).slice(1).flatMap((item: Row) => mapMedia(item.media, row.name) ?? []),
    sizes: unique(attributes.sizes), finishes: unique(attributes.finishes), surfaces: unique(attributes.surfaces),
    colors: unique(attributes.colors), looks: unique(attributes.looks), applications: unique(attributes.applications),
    thickness: thicknesses.join(", ") || null,
    technicalSpecifications: (row.specifications ?? []).map((item: Row) => ({ label: item.definition?.label ?? "Specification", value: item.value })),
    relatedProductSlugs: [], technicalSheetHref: null,
    keywords: [row.code, row.description, relation?.name].filter(Boolean), sortOrder: row.sortOrder ?? index,
    publishedAt: row.publishedAt?.toISOString?.() ?? null, source: "database", sourcePath: null,
  };
}

async function readDatabase(): Promise<ProductDiscoveryData> {
  const db = getDb() as unknown as Record<string, Row>;
  if (!db.product?.findMany || !db.collection?.findMany) throw new Error("Product catalogue models are unavailable");
  const include = {
    previewMedia: true, primaryTexture: true, category: true,
    images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, include: { media: true } },
    collections: { where: { collection: { state: "PUBLISHED" } }, orderBy: { sortOrder: "asc" }, include: { collection: true } },
    attributes: { include: { value: { include: { definition: true } } } },
    variants: { orderBy: { sortOrder: "asc" }, include: { size: true, attributes: { include: { value: { include: { definition: true } } } } } },
    applications: { include: { application: true } }, specifications: { include: { definition: true } },
  };
  const rows: Row[] = await db.product.findMany({ where: { state: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include });
  const mapped = rows.map(mapRow).filter((item): item is Product => Boolean(item));
  if (!mapped.length) throw new Error("No published products with approved media");
  const collectionRows: Row[] = await db.collection.findMany({ where: { state: "PUBLISHED" }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { coverMedia: true, heroMedia: true } });
  const collections: ProductCollection[] = collectionRows.flatMap((collection) => {
    const representative = mapped.find((product) => product.collectionId === collection.id);
    const image = mapMedia(collection.coverMedia, collection.name) ?? mapMedia(collection.heroMedia, collection.name) ?? representative?.primaryMedia;
    return image ? [{ id: collection.id, name: collection.name, slug: collection.slug, description: collection.description ?? "", media: image, featured: Boolean(collection.isFeatured) }] : [];
  });
  if (!collections.length) throw new Error("No published collections with approved media");
  return { products: mapped, collections, filterGroups: filtersFrom(mapped), introTiles: productIntroTiles, source: "database" };
}

export async function getProductDiscovery(): Promise<ProductDiscoveryData> {
  if (!process.env.DATABASE_URL) return fallbackProductDiscovery;
  try {
    return await Promise.race([readDatabase(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Product data timeout")), 1200))]);
  } catch { return fallbackProductDiscovery; }
}
