import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { mediaUrl } from "@/lib/media";
import type { HomeMedia } from "@/types/home";
import type { Product, ProductFilterKey } from "@/types/products";

export const mediaSelect = { approved: true, storageKey: true, alt: true, width: true, height: true, mimeType: true } as const;

export const productListInclude = {
  previewMedia: { select: mediaSelect },
  primaryTexture: { select: mediaSelect },
  images: { where: { media: { approved: true } }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], take: 1, select: { media: { select: mediaSelect } } },
  collections: { where: { collection: { state: "PUBLISHED" } }, orderBy: { sortOrder: "asc" }, select: { collection: { select: { id: true, name: true } } } },
  attributes: { select: { value: { select: { label: true, definition: { select: { kind: true, filterable: true } } } } } },
  variants: { orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { size: { select: { label: true } }, thicknessMm: true } },
} as const satisfies Prisma.ProductInclude;

export type ProductListRow = Prisma.ProductGetPayload<{ include: typeof productListInclude }>;
type MediaRow = { approved: boolean; storageKey: string; alt: string; width: number | null; height: number | null; mimeType: string };

export function mappedProductMedia(record: MediaRow | null | undefined, fallbackAlt: string): HomeMedia | null {
  if (!record?.approved || !record.mimeType.startsWith("image/")) return null;
  try {
    return {
      src: mediaUrl(record.storageKey), alt: record.alt.trim() || fallbackAlt,
      placeholderLabel: fallbackAlt, tone: "stone", width: record.width ?? undefined, height: record.height ?? undefined,
    };
  } catch { return null; }
}

function unique(values: readonly string[]) { return [...new Set(values.map((value) => value.trim()).filter(Boolean))]; }

const attributeKey: Partial<Record<string, ProductFilterKey>> = {
  FINISH: "finishes", SURFACE: "surfaces", COLOUR: "colors", LOOK: "looks", ROOM: "locations", USAGE: "applications",
};

export function mapProductRow(row: ProductListRow, index: number): Product | null {
  const primary = mappedProductMedia(row.previewMedia, row.name)
    ?? mappedProductMedia(row.primaryTexture, row.name)
    ?? mappedProductMedia(row.images[0]?.media, row.name);
  if (!primary) return null;
  const fields: Record<ProductFilterKey, string[]> = {
    locations: [], sizes: [], finishes: [], surfaces: [], colors: [], looks: [], applications: [],
  };
  const materials: string[] = [];
  for (const relation of row.attributes) {
    if (relation.value.definition.kind === "MATERIAL") materials.push(relation.value.label);
    const key = relation.value.definition.filterable ? attributeKey[relation.value.definition.kind] : undefined;
    if (key) fields[key].push(relation.value.label);
  }
  for (const variant of row.variants) {
    fields.sizes.push(variant.size.label);
  }
  const collection = row.collections[0]?.collection;
  const material = unique(materials);
  const thickness = unique(row.variants.map((variant) => variant.thicknessMm ? `${Number(variant.thicknessMm)} mm` : "")).join(" / ") || null;
  return {
    id: row.id, name: row.name, slug: row.slug, collectionId: collection?.id ?? "uncollected",
    collectionIds: row.collections.map((relation) => relation.collection.id),
    category: material[0] ?? "Material", primaryMedia: primary, gallery: [],
    locations: unique(fields.locations), sizes: unique(fields.sizes), finishes: unique(fields.finishes),
    surfaces: unique(fields.surfaces), colors: unique(fields.colors), looks: unique(fields.looks),
    applications: unique(fields.applications), material: material.join(" / ") || null, thickness, technicalSpecifications: [],
    relatedProductSlugs: [], technicalSheetHref: null,
    keywords: unique([row.code ?? "", row.description ?? "", collection?.name ?? ""]),
    sortOrder: row.sortOrder ?? index, isFeatured: row.isFeatured, publishedAt: row.publishedAt?.toISOString() ?? null,
    source: "database", sourcePath: null,
  };
}
