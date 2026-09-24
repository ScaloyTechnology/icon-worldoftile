import type { ProjectMedia } from "@/types/projects";

export type ProjectAdminAsset = Readonly<{
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
}>;

export type ProjectAdminStory = Readonly<{
  id: string;
  slug: string;
  title: string;
  introduction: string;
  category: string;
  location: string;
  published: boolean;
  sortOrder: number;
  images: readonly ProjectAdminAsset[];
}>;

export type ProjectAdminCategory = Readonly<{
  id: string;
  slug: string;
  name: string;
  preview: ProjectMedia | null;
  mediaId: string;
  media: ProjectAdminAsset | null;
}>;

export type ProjectPageMediaSettings = Readonly<{
  heroMediaId: string;
  featuredProjectId: string;
  featuredPrimaryMediaId: string;
  featuredSecondaryMediaId: string;
  categoryMedia: readonly Readonly<{ categorySlug: string; mediaId: string }>[];
  galleryMediaIds: readonly string[];
  sequenceMediaIds: readonly string[];
}>;

export type ProjectsAdminData = Readonly<{
  stories: readonly ProjectAdminStory[];
  categories: readonly ProjectAdminCategory[];
  settings: ProjectPageMediaSettings;
  hero: Readonly<{ fallback: ProjectMedia; media: ProjectAdminAsset | null }>;
  featuredPrimary: ProjectAdminAsset | null;
  featuredSecondary: ProjectAdminAsset | null;
  featuredPrimaryFallback: ProjectMedia | null;
  featuredSecondaryFallback: ProjectMedia | null;
  gallery: readonly (ProjectAdminAsset | null)[];
  sequence: readonly (ProjectAdminAsset | null)[];
  galleryFallbacks: readonly ProjectMedia[];
  sequenceFallbacks: readonly ProjectMedia[];
}>;
