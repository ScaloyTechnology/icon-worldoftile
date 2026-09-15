import "server-only";

import { cache } from "react";

import { clientAssets } from "@/content/assets";
import { clientSurfaceTaxonomy } from "@/content/product-taxonomy";
import { fallbackProductDiscovery, getProductDiscovery } from "@/server/products/product-discovery";
import type { HomepageContentData, HomepageSurfacePreview } from "@/types/homepage-content";

const preferredFallbackCollections = ["austin", "marmi", "travertino", "mystone", "star", "editorial", "200x1200"];

function collectionHref(slug: string) {
  return `/products?collection=${encodeURIComponent(slug)}`;
}

function surfaceHref(param: string, value: string) {
  return `/products?${encodeURIComponent(param)}=${encodeURIComponent(value)}`;
}

export const getHomepageContent = cache(async (): Promise<HomepageContentData> => {
  const discovery = await getProductDiscovery();
  const collectionPool = discovery.collections.length
    ? discovery.collections
    : fallbackProductDiscovery.collections;
  const preferredCollections = discovery.source === "development-fallback" || !discovery.collections.length
    ? preferredFallbackCollections.flatMap((id) => collectionPool.find((collection) => collection.id === id) ?? [])
    : [...collectionPool].sort((a, b) => Number(b.featured) - Number(a.featured)).slice(0, 7);
  const orderedCollections = preferredCollections.length
    ? preferredCollections
    : collectionPool.slice(0, 7);
  const collections = orderedCollections.map((collection) => ({
    id: collection.id,
    slug: collection.slug,
    name: collection.name,
    image: collection.media,
    href: collectionHref(collection.slug),
  }));

  const surfaceGroup = discovery.filterGroups.find((group) => group.key === "surfaces");
  const surfaceOptions = surfaceGroup?.options.length
    ? surfaceGroup.options
    : clientSurfaceTaxonomy.map((value) => ({ value, label: value }));
  const surfaceParam = surfaceGroup?.param ?? "surface";
  const surfaces: HomepageSurfacePreview[] = surfaceOptions.map((option, index) => {
    const representative = discovery.products.find((product) => product.surfaces.includes(option.value));
    return {
      id: `surface-${index + 1}`,
      value: option.value,
      name: option.label,
      image: representative?.primaryMedia ?? null,
      href: surfaceHref(surfaceParam, option.value),
    };
  });

  return {
    discover: {
      heading: "Where imagination begins.",
      intro: "ICON crafts concepts shaped by nature and refined by design, advancing surfaces through new textures, techniques and thinking.",
      image: clientAssets.crossCut,
      // Sources: Company Profile_Updated.pdf pages 4, 5 and 11.
      stats: [
        { value: "90,000", label: "sq. mtr. per day" },
        { value: "60+", label: "countries", note: "Global presence" },
        { value: "33%", label: "of production energy", note: "Supported by solar power" },
      ],
      cta: { label: "Know More", href: "/meet-icon" },
    },
    collections,
    surfaces,
    surfaceArchiveImage: clientAssets.travertino,
    source: discovery.source,
  };
});
