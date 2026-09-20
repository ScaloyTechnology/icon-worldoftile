import "server-only";

import { cache } from "react";

import { clientAssets } from "@/content/assets";
import { clientSurfaceTaxonomy } from "@/content/product-taxonomy";
import { getPublicCollections, type PublicCollection } from "@/server/collections/public-collections";
import { getProductDiscovery } from "@/server/products/product-discovery";
import type { HomeMedia } from "@/types/home";
import type {
  HomepageContentData,
  HomepageSurfacePreview,
} from "@/types/homepage-content";

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

function hasHomepageImage(collection: PublicCollection): collection is PublicCollection & { image: HomeMedia } {
  return collection.featured && collection.image !== null;
}

function surfaceHref(param: string, value: string) {
  return `/products?${encodeURIComponent(param)}=${encodeURIComponent(value)}`;
}

export const getHomepageContent = cache(
  async (): Promise<HomepageContentData> => {
    const [discovery, publicCollections] = await Promise.all([getProductDiscovery(), getPublicCollections()]);
    const collections = publicCollections.collections.filter(hasHomepageImage).sort((a, b) => a.homepageOrder - b.homepageOrder || a.listOrder - b.listOrder || a.id.localeCompare(b.id)).map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      image: collection.image,
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
        const representativeSource = representativeImage?.src;
        const fallbackImage =
          surfaceFallbackImages[index % surfaceFallbackImages.length] ??
          clientAssets.crossCut;
        const image =
          representativeImage &&
          representativeSource &&
          !usedSurfaceImages.has(representativeSource)
            ? representativeImage
            : fallbackImage;
        const imageSource = image.src;
        if (imageSource) usedSurfaceImages.add(imageSource);
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
          eyebrow: "ICON / Architectural material study",
          title: "Crafting concepts",
          emphasis: "shaped by nature.",
          supportingText: "Where imagination begins. Refined by design.",
          image: clientAssets.crossCut,
        },
        {
          id: "material-hospitality",
          eyebrow: "ICON / Hospitality material study",
          title: "Advancing",
          emphasis: "surfaces.",
          supportingText: "Through new textures, techniques and thinking.",
          image: clientAssets.hospitality,
        },
        {
          id: "material-retail",
          eyebrow: "ICON / Retail material study",
          title: "Innovation transforms",
          emphasis: "possibilities.",
          supportingText: "New textures, techniques and thinking.",
          image: clientAssets.retail,
        },
        {
          id: "material-outdoor",
          eyebrow: "ICON / Outdoor material study",
          title: "Rise with",
          emphasis: "integrity.",
          supportingText:
            "Setting benchmarks for the industry with pioneering creations.",
          image: clientAssets.outdoor,
        },
      ],
      discover: {
        // Company Profile_Updated.pdf p.2: "The story of 38 years";
        // brand pillar: "Where imagination begins."
        heading: "Nearly four decades of imagination.",
        intro:
          "ICON crafts concepts shaped by nature and refined by design, advancing surfaces through new textures, techniques and thinking.",
        image: clientAssets.crossCut,
        // All four figures: Company Profile_Updated.pdf p.5.
        // Global presence is also illustrated on p.11. No prototype factory count.
        stats: [
          { value: "90,000", label: "sq. mtr. per day" },
          { value: "60+", label: "countries", note: "Global presence" },
          { value: "1,500+", label: "tile designs" },
          { value: "30+", label: "years of experience" },
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
