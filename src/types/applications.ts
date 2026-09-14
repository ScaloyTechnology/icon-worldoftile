import type { HomeMedia } from "@/types/home";

export const applicationSlugs = [
  "residential",
  "commercial",
  "hospitality",
  "retail",
  "office",
  "outdoor",
] as const;

export type ApplicationSlug = (typeof applicationSlugs)[number];
export type ApplicationTransition = "split" | "mask" | "drift" | "shift" | "grid" | "pullout";

export type ApplicationMedia = HomeMedia & Readonly<{
  src: string;
  sourcePath: string;
}>;

export type ApplicationContent = Readonly<{
  id: string;
  index: string;
  name: string;
  slug: ApplicationSlug;
  shortDescription: string;
  heroMedia: ApplicationMedia;
  galleryMedia: readonly ApplicationMedia[];
  transition: ApplicationTransition;
  order: number;
}>;

export type ApplicationProductPreview = Readonly<{
  id: string;
  name: string;
  slug: string;
  category: string;
  media: HomeMedia;
}>;

export type ApplicationExperience = ApplicationContent & Readonly<{
  productHref: string;
  products: readonly ApplicationProductPreview[];
}>;

export type ApplicationDiscoveryLink = Readonly<{
  index: string;
  label: string;
  href: string;
}>;

export type ApplicationsPageData = Readonly<{
  hero: Readonly<{
    eyebrow: string;
    title: string;
    description: string;
    media: ApplicationMedia;
  }>;
  applications: readonly ApplicationExperience[];
  discoveryLinks: readonly ApplicationDiscoveryLink[];
  source: "database" | "development-fallback";
}>;

export type ApplicationDatabaseRow = Readonly<{
  id?: unknown;
  slug?: unknown;
  name?: unknown;
  introduction?: unknown;
  state?: unknown;
  sortOrder?: unknown;
}>;
