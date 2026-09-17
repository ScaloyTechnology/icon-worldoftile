import "server-only";

import { cache } from "react";

import { clientAssets } from "@/content/assets";
import { clientSurfaceTaxonomy } from "@/content/product-taxonomy";
import {
  fallbackProductDiscovery,
  getProductDiscovery,
} from "@/server/products/product-discovery";
import type {
  HomepageContentData,
  HomepageSurfacePreview,
} from "@/types/homepage-content";

const preferredFallbackCollections = [
  "austin",
  "marmi",
  "travertino",
  "mystone",
  "star",
  "editorial",
  "200x1200",
];
const surfaceFallbackImages = [
  clientAssets.opal,
  clientAssets.denim,
  clientAssets.travertino,
  clientAssets.star,
  clientAssets.austin,
  clientAssets.mystone,
  clientAssets.fenix,
  clientAssets.crossCut,
] as const;

function collectionHref(slug: string) {
  return `/products?collection=${encodeURIComponent(slug)}`;
}

function surfaceHref(param: string, value: string) {
  return `/products?${encodeURIComponent(param)}=${encodeURIComponent(value)}`;
}

export const getHomepageContent = cache(
  async (): Promise<HomepageContentData> => {
    const discovery = await getProductDiscovery();
    const collectionPool = discovery.collections.length
      ? discovery.collections
      : fallbackProductDiscovery.collections;
    const preferredCollections =
      discovery.source === "development-fallback" ||
      !discovery.collections.length
        ? preferredFallbackCollections.flatMap(
            (id) =>
              collectionPool.find((collection) => collection.id === id) ?? [],
          )
        : [...collectionPool]
            .sort((a, b) => Number(b.featured) - Number(a.featured))
            .slice(0, 7);
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

    const surfaceGroup = discovery.filterGroups.find(
      (group) => group.key === "surfaces",
    );
    const surfaceOptions = surfaceGroup?.options.length
      ? surfaceGroup.options
      : clientSurfaceTaxonomy.map((value) => ({ value, label: value }));
    const surfaceParam = surfaceGroup?.param ?? "surface";
    const usedSurfaceImages = new Set<string>();
    const surfaces: HomepageSurfacePreview[] = surfaceOptions.map(
      (option, index) => {
        const representative = discovery.products.find((product) =>
          product.surfaces.includes(option.value),
        );
        const representativeImage = representative?.primaryMedia ?? null;
        const fallbackImage =
          surfaceFallbackImages[index % surfaceFallbackImages.length]!;
        const image =
          representativeImage && !usedSurfaceImages.has(representativeImage.src)
            ? representativeImage
            : fallbackImage;
        usedSurfaceImages.add(image.src);
        return {
          id: `surface-${index + 1}`,
          value: option.value,
          name: option.label,
          image,
          href: surfaceHref(surfaceParam, option.value),
        };
      },
    );

    return {
      heroScenes: [
        {
          id: "material-interior",
          eyebrow: "01 / ICON material study / 01",
          title: "Crafting concepts",
          emphasis: "shaped by nature.",
          supportingText: "Where imagination begins. Refined by design.",
          image: clientAssets.crossCut,
        },
        {
          id: "material-hospitality",
          eyebrow: "01 / ICON material study / 02",
          title: "Advancing",
          emphasis: "surfaces.",
          supportingText: "Through new textures, techniques and thinking.",
          image: clientAssets.hospitality,
        },
        {
          id: "material-retail",
          eyebrow: "01 / ICON material study / 03",
          title: "Innovation transforms",
          emphasis: "possibilities.",
          supportingText: "New textures, techniques and thinking.",
          image: clientAssets.retail,
        },
        {
          id: "material-outdoor",
          eyebrow: "01 / ICON material study / 04",
          title: "Rise with",
          emphasis: "integrity.",
          supportingText:
            "Setting benchmarks for the industry with pioneering creations.",
          image: clientAssets.outdoor,
        },
      ],
      discover: {
        heading: "Where imagination begins.",
        intro:
          "ICON crafts concepts shaped by nature and refined by design, advancing surfaces through new textures, techniques and thinking.",
        image: clientAssets.crossCut,
        // Sources: Company Profile_Updated.pdf pages 4, 5 and 11.
        stats: [
          { value: "90,000", label: "sq. mtr. per day" },
          { value: "60+", label: "countries", note: "Global presence" },
          {
            value: "33%",
            label: "of production energy",
            note: "Supported by solar power",
          },
        ],
        cta: { label: "Know More", href: "/meet-icon" },
      },
      collections,
      surfaces,
      surfaceArchiveImage: clientAssets.travertino,
      source: discovery.source,
    };
  },
);
