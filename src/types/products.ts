import type { HomeMedia } from "@/types/home";

export const productFilterKeys = [
  "locations",
  "sizes",
  "finishes",
  "surfaces",
  "colors",
  "looks",
  "applications",
] as const;

export type ProductFilterKey = (typeof productFilterKeys)[number];

export type ProductFilters = Readonly<
  Record<ProductFilterKey, readonly string[]>
>;

export type ProductFilterOption = Readonly<{
  value: string;
  label: string;
  description?: string;
  swatch?: string;
  media?: HomeMedia;
  developmentOnly?: boolean;
}>;

export type ProductFilterGroup = Readonly<{
  key: ProductFilterKey;
  label: string;
  param: string;
  description: string;
  options: readonly ProductFilterOption[];
}>;

export type ProductCollection = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  media: HomeMedia;
  featured: boolean;
}>;

export type ProductSpecification = Readonly<{
  label: string;
  value: string;
}>;

export type Product = Readonly<{
  id: string;
  name: string;
  slug: string;
  collectionId: string;
  collectionIds?: readonly string[];
  category: string;
  primaryMedia: HomeMedia;
  gallery: readonly HomeMedia[];
  locations: readonly string[];
  sizes: readonly string[];
  finishes: readonly string[];
  surfaces: readonly string[];
  thickness: string | null;
  colors: readonly string[];
  looks: readonly string[];
  material?: string | null;
  applications: readonly string[];
  technicalSpecifications: readonly ProductSpecification[];
  relatedProductSlugs: readonly string[];
  technicalSheetHref: string | null;
  keywords?: readonly string[];
  sortOrder?: number;
  publishedAt?: string | null;
  source?: "database" | "development-fallback";
  sourcePath?: string | null;
}>;

export type ProductIntroTile = Readonly<{
  id: string;
  label: string;
  media: HomeMedia;
  finish: string | null;
}>;

export type ProductDiscoveryData = Readonly<{
  products: readonly Product[];
  collections: readonly ProductCollection[];
  filterGroups: readonly ProductFilterGroup[];
  introTiles: readonly ProductIntroTile[];
  source: "database" | "development-fallback";
}>;

export type ProductsPageContent = Readonly<{
  hero: Readonly<{
    eyebrow: string;
    titleLines: readonly string[];
    description: string;
    browseLabel: string;
    media: HomeMedia;
  }>;
  featured: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
  allCollections: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
  listing: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
  browse: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
  }>;
  finalCta: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    linkLabel: string;
    href: string;
  }>;
}>;
