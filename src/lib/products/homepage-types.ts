export type HomepageMedia = {
  url: string;
  alt: string;
  width: number | null;
  height: number | null;
};

export type HomepageHeroProduct = {
  id: string;
  label: string;
  slug: string | null;
  collection: { name: string; slug: string } | null;
  texture: HomepageMedia;
  room: HomepageMedia;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  finish: string | null;
  ctaHref: string;
  source: "configured-product" | "configured-collection" | "featured-product" | "development-fallback";
};

export type HomepageCollection = {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: HomepageMedia;
  source: "database" | "development-fallback";
};

export type HomepageExperienceData = {
  hero: HomepageHeroProduct;
  wallTiles: HomepageWallTile[];
  collections: HomepageCollection[];
  config: {
    enable3DHero: boolean;
    heading: string[];
    eyebrow: string;
    cta: string;
  };
};

export type HomepageWallTile = Omit<HomepageHeroProduct, "room" | "ctaHref" | "source"> & {
  surface: string | null;
  source: "database" | "development-fallback";
};
