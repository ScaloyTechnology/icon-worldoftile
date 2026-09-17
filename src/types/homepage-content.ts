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

export type HomepageCollectionPreview = Readonly<{
  id: string;
  slug: string;
  name: string;
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
