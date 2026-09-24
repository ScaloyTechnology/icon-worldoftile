export type ProjectMedia = Readonly<{
  src: string;
  alt: string;
  width: number;
  height: number;
  position?: string;
  sourcePath?: string | null;
}>;

export type ProjectProductLink = Readonly<{
  id: string;
  name: string;
  slug: string;
  media: ProjectMedia;
}>;

export type ProjectLayout = "landscape" | "portrait" | "wide";

export type ProjectSummary = Readonly<{
  id: string;
  slug: string;
  index: string;
  title: string;
  shortDescription: string;
  category: string;
  location: string | null;
  heroMedia: ProjectMedia;
  secondaryMedia?: ProjectMedia | null;
  galleryMedia?: readonly ProjectMedia[];
  products: readonly ProjectProductLink[];
  layout: ProjectLayout;
}>;

export type ProjectGalleryItem = Readonly<{
  id: string;
  label: string;
  media: ProjectMedia;
}>;

export type ProjectCategoryFilter = Readonly<{
  id: string;
  label: string;
  count: number;
  preview: ProjectMedia;
}>;

export type ProjectLocation = Readonly<{
  label: string;
  count: number;
}>;

export type ProjectsPageData = Readonly<{
  source: "database" | "development-fallback";
  hero: Readonly<{
    eyebrow: string;
    title: readonly [string, string];
    description: string;
    media: ProjectMedia;
  }>;
  featuredProjectId: string;
  projects: readonly ProjectSummary[];
  categories: readonly ProjectCategoryFilter[];
  gallery: readonly ProjectGalleryItem[];
  story: readonly ProjectGalleryItem[];
  locations: readonly ProjectLocation[];
}>;
