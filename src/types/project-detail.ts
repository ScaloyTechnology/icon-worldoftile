import type { ProjectGalleryItem, ProjectMedia, ProjectProductLink, ProjectSummary } from "@/types/projects";

export type ProjectDetailFact = Readonly<{
  label: string;
  value: string;
}>;

export type ProjectDetailProduct = ProjectProductLink & Readonly<{
  collectionName: string | null;
  finish: string | null;
  surface: string | null;
}>;

export type ProjectDetailCollection = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  media: ProjectMedia;
}>;

export type ProjectDetailData = Readonly<{
  source: "database" | "development-fallback";
  project: ProjectSummary;
  introductionHeading: string;
  introduction: string;
  facts: readonly ProjectDetailFact[];
  gallery: readonly ProjectGalleryItem[];
  galleryNote: string | null;
  products: readonly ProjectDetailProduct[];
  relatedCollections: readonly ProjectDetailCollection[];
  relatedProjects: readonly ProjectSummary[];
  seo: Readonly<{
    description: string;
    noIndex: boolean;
  }>;
}>;
