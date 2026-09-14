import { createEmptyProductFilters, serializeProductDiscoveryState } from "@/lib/products/filter-products";
import type { ApplicationContent, ApplicationDatabaseRow } from "@/types/applications";
import type { ProductCollection, ProductFilterGroup } from "@/types/products";

function cleanText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maximum) : "";
}

export function normalizePublishedApplications(
  rows: readonly ApplicationDatabaseRow[],
  fallbacks: readonly ApplicationContent[],
) {
  const fallbackBySlug = new Map(fallbacks.map((application) => [application.slug, application]));
  const published = new Map<string, ApplicationDatabaseRow>();

  rows.forEach((row) => {
    const slug = cleanText(row.slug, 80).toLocaleLowerCase();
    if (row.state !== "PUBLISHED" || !fallbackBySlug.has(slug as ApplicationContent["slug"]) || published.has(slug)) return;
    published.set(slug, row);
  });

  return fallbacks.flatMap((fallback) => {
    const row = published.get(fallback.slug);
    if (!row) return [];
    return [{
      ...fallback,
      id: cleanText(row.id, 120) || fallback.id,
      name: cleanText(row.name, 100) || fallback.name,
      shortDescription: cleanText(row.introduction, 420) || fallback.shortDescription,
    }];
  });
}

export function buildApplicationProductHref(
  value: string,
  groups: readonly ProductFilterGroup[],
  collections: readonly ProductCollection[] = [],
) {
  const group = groups.find((item) => item.key === "applications");
  const option = group?.options.find((item) => item.value.localeCompare(value, undefined, { sensitivity: "accent" }) === 0);
  if (!group || !option) return "/products";

  const filters = createEmptyProductFilters();
  filters.applications = [option.value];
  const query = serializeProductDiscoveryState({ filters, collectionId: null, query: "", sort: "featured" }, groups, collections);
  return query ? `/products?${query}` : "/products";
}

export function applicationMediaAreUnique(applications: readonly ApplicationContent[]) {
  const sources = applications.flatMap((application) => [application.heroMedia.src, ...application.galleryMedia.map((media) => media.src)]);
  return new Set(sources).size === sources.length;
}
