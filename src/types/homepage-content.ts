import type { HomeMedia } from "@/types/home";

export type HomepageStatistic = Readonly<{
  value: string;
  label: string;
  note?: string;
}>;

export type HomepageHeroScene = Readonly<{
  id: string;
  eyebrow: string;
  title: string;
  emphasis: string;
  supportingText: string;
  image: HomeMedia;
}>;

export type HomepageHeroTile = Readonly<{
  id: string;
  name: string;
  image: HomeMedia;
}>;

export type HomepageCollectionPreview = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  image: HomeMedia;
  href: string;
}>;

export type HomepageSurfacePreview = Readonly<{
  id: string;
  value: string;
  name: string;
  image: HomeMedia | null;
  href: string;
}>;

export type HomepageContentData = Readonly<{
  heroScenes: readonly HomepageHeroScene[];
  heroTiles: readonly HomepageHeroTile[];
  discover: Readonly<{
    heading: string;
    intro: string;
    image: HomeMedia;
    stats: readonly HomepageStatistic[];
    cta: Readonly<{ label: "Know More"; href: "/meet-icon" }>;
  }>;
  collections: readonly HomepageCollectionPreview[];
  surfaces: readonly HomepageSurfacePreview[];
  surfaceArchiveImage: HomeMedia;
  source: "database" | "development-fallback";
}>;

export type HomepageMediaSlot = Readonly<{
  key: string;
  fieldName: "heroTileMediaId" | "houseMainMediaId" | "houseDetailMediaId" | "surfaceMediaId";
  label: string;
  title: string;
  description: string;
  recommendation: string;
  mediaId: string;
  media: HomeMedia;
  fallbackMedia: HomeMedia;
}>;

export type HomepageMediaGroup = Readonly<{
  id: "hero-products" | "house-of-icon" | "explore-surfaces";
  number: string;
  title: string;
  description: string;
  slots: readonly HomepageMediaSlot[];
}>;

export type HomepageMediaEditorData = Readonly<{
  groups: readonly HomepageMediaGroup[];
}>;
