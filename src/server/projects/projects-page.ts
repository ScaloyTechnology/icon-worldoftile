import "server-only";

import { cache } from "react";
import { projectsFallback } from "@/content/projects";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import { defaultProjectPageMediaSettings, projectPageMediaSettingsSchema } from "@/server/projects/projects-admin-data";
import type {
  ProjectCategoryFilter,
  ProjectGalleryItem,
  ProjectLayout,
  ProjectLocation,
  ProjectMedia,
  ProjectSummary,
  ProjectsPageData,
} from "@/types/projects";

// The public page remains compatible with a minimal/stale generated client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const layouts: readonly ProjectLayout[] = ["landscape", "portrait", "landscape", "wide", "portrait", "landscape"];

function mappedMedia(record: Row | null | undefined, fallbackAlt: string): ProjectMedia | null {
  if (!record?.approved || !record.storageKey) return null;
  try {
    return {
      src: mediaUrl(record.storageKey),
      alt: record.alt || fallbackAlt,
      width: record.width ?? 1600,
      height: record.height ?? 1100,
      position: "50% 50%",
      sourcePath: null,
    };
  } catch {
    return null;
  }
}

function mappedProject(row: Row, index: number): ProjectSummary | null {
  const media = (row.images ?? []).flatMap((item: Row) => mappedMedia(item.media, row.title) ?? []);
  const heroMedia = media[0];
  if (!heroMedia) return null;
  return {
    id: row.id,
    slug: row.slug,
    index: String(index + 1).padStart(2, "0"),
    title: row.title,
    shortDescription: row.introduction?.trim() || "Verified project editorial information will be added as it becomes available.",
    category: row.category?.name || "Uncategorised",
    location: row.location?.trim() || null,
    heroMedia,
    secondaryMedia: media[1] ?? null,
    galleryMedia: media,
    products: [],
    layout: layouts[index % layouts.length] ?? "landscape",
  };
}

function buildCategories(projects: readonly ProjectSummary[]): readonly ProjectCategoryFilter[] {
  const grouped = new Map<string, ProjectSummary[]>();
  for (const project of projects) {
    const key = project.category.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "uncategorised";
    grouped.set(key, [...(grouped.get(key) ?? []), project]);
  }
  return [
    { id: "all", label: "All studies", count: projects.length, preview: projects[0]!.heroMedia },
    ...Array.from(grouped, ([id, items]) => ({ id, label: items[0]!.category, count: items.length, preview: items[0]!.heroMedia })),
  ];
}

function buildLocations(projects: readonly ProjectSummary[]): readonly ProjectLocation[] {
  const counts = new Map<string, number>();
  for (const project of projects) if (project.location) counts.set(project.location, (counts.get(project.location) ?? 0) + 1);
  return Array.from(counts, ([label, count]) => ({ label, count })).sort((left, right) => left.label.localeCompare(right.label));
}

function fallbackData(): ProjectsPageData {
  const listing = projectsFallback.projects.filter((project) => project.id !== projectsFallback.featuredProjectId);
  return { ...projectsFallback, categories: buildCategories(listing.length ? listing : projectsFallback.projects) };
}

async function readDatabase(): Promise<ProjectsPageData> {
  const db = getDb() as unknown as Record<string, Row>;
  if (!db.project?.findMany) throw new Error("Project model is unavailable");
  const [rows, mediaSection]: [Row[], Row | null] = await Promise.all([
    db.project.findMany({
      where: { state: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
      include: {
        category: true,
        images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, include: { media: true } },
      },
    }),
    db.siteSection?.findUnique
      ? db.siteSection.findUnique({ where: { page_key: { page: "projects", key: "media" } }, include: { content: { where: { locale: "en" }, take: 1 } } })
      : Promise.resolve(null),
  ]);
  const databaseProjects = rows.map(mappedProject).filter((project): project is ProjectSummary => Boolean(project));
  const projects = databaseProjects.length ? databaseProjects : [...projectsFallback.projects];

  const parsedSettings = projectPageMediaSettingsSchema.safeParse(mediaSection?.state === "PUBLISHED" ? mediaSection.content?.[0]?.payload : null);
  const settings = parsedSettings.success ? parsedSettings.data : defaultProjectPageMediaSettings();
  const selectedMediaIds = [...new Set([
    settings.heroMediaId,
    settings.featuredPrimaryMediaId,
    settings.featuredSecondaryMediaId,
    ...settings.categoryMedia.map((item) => item.mediaId),
    ...settings.galleryMediaIds,
    ...settings.sequenceMediaIds,
  ].filter(Boolean))];
  const selectedMediaRows: Row[] = selectedMediaIds.length && db.mediaAsset?.findMany
    ? await db.mediaAsset.findMany({ where: { id: { in: selectedMediaIds }, approved: true, mimeType: { startsWith: "image/" } } })
    : [];
  const selectedMedia = new Map<string, ProjectMedia>();
  for (const record of selectedMediaRows) {
    const media = mappedMedia(record, record.alt || "Project image");
    if (media) selectedMedia.set(record.id, media);
  }

  const gallery: ProjectGalleryItem[] = databaseProjects.length ? [] : [...projectsFallback.gallery];
  for (const row of rows) {
    for (const [index, image] of (row.images ?? []).slice(1).entries()) {
      const item = mappedMedia(image.media, row.title);
      if (item && !gallery.some((existing) => existing.media.src === item.src)) {
        gallery.push({ id: `${row.id}-${image.id}`, label: `${row.title} / ${String(index + 1).padStart(2, "0")}`, media: item });
      }
    }
  }

  const baseFeatured = projects.find((project) => project.id === settings.featuredProjectId) ?? projects[0]!;
  const featured = {
    ...baseFeatured,
    heroMedia: selectedMedia.get(settings.featuredPrimaryMediaId) ?? baseFeatured.heroMedia,
    secondaryMedia: selectedMedia.get(settings.featuredSecondaryMediaId) ?? baseFeatured.secondaryMedia,
  };
  const resolvedProjects = projects.map((project) => project.id === featured.id ? featured : project);
  const categoryOverrides = new Map(settings.categoryMedia.map((item) => [item.categorySlug, selectedMedia.get(item.mediaId)]));
  const categories = buildCategories(projects.length > 1 ? projects.filter((project) => project.id !== featured.id) : projects).map((category) => ({
    ...category,
    preview: categoryOverrides.get(category.id) ?? category.preview,
  }));
  const resolvedGallery = settings.galleryMediaIds.length
    ? settings.galleryMediaIds.map((id, index) => {
      const fallback = projectsFallback.gallery[index];
      const media = selectedMedia.get(id) ?? gallery[index]?.media ?? fallback?.media;
      return media ? { id: id || gallery[index]?.id || fallback?.id || `project-gallery-${index + 1}`, label: gallery[index]?.label ?? fallback?.label ?? `Project gallery / ${String(index + 1).padStart(2, "0")}`, media } : null;
    }).filter((item): item is ProjectGalleryItem => Boolean(item))
    : gallery;
  const resolvedStory = settings.sequenceMediaIds.length
    ? settings.sequenceMediaIds.map((id, index) => {
      const fallback = projectsFallback.story[index];
      const media = selectedMedia.get(id) ?? fallback?.media ?? gallery[index]?.media;
      return media ? { id: id || fallback?.id || `material-sequence-${index + 1}`, label: fallback?.label ?? `Material sequence / ${String(index + 1).padStart(2, "0")}`, media } : null;
    }).filter((item): item is ProjectGalleryItem => Boolean(item))
    : gallery.slice(0, 3);
  const heroCopy = databaseProjects.length
    ? {
      eyebrow: "Projects / Casebook 01",
      title: ["Spaces", "in context."] as const,
      description: "A project index connecting architectural spaces with the surfaces used within them.",
    }
    : projectsFallback.hero;
  return {
    source: databaseProjects.length ? "database" : "development-fallback",
    hero: {
      eyebrow: heroCopy.eyebrow,
      title: heroCopy.title,
      description: heroCopy.description,
      media: selectedMedia.get(settings.heroMediaId) ?? featured.heroMedia,
    },
    featuredProjectId: featured.id,
    projects: resolvedProjects,
    categories,
    gallery: resolvedGallery,
    story: resolvedStory,
    locations: buildLocations(projects),
  };
}

export const getProjectsPageData = cache(async (): Promise<ProjectsPageData> => {
  if (!process.env.DATABASE_URL) return fallbackData();
  try {
    return await Promise.race([
      readDatabase(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Project data timeout")), 2500)),
    ]);
  } catch {
    return fallbackData();
  }
});
