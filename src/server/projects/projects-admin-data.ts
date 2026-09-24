import "server-only";

import { z } from "zod";

import { projectsFallback } from "@/content/projects";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { ProjectMedia } from "@/types/projects";
import type {
  ProjectAdminAsset,
  ProjectAdminCategory,
  ProjectAdminStory,
  ProjectPageMediaSettings,
  ProjectsAdminData,
} from "@/types/projects-admin";

const mediaId = z.string().trim().max(64);

export const projectPageMediaSettingsSchema = z.object({
  heroMediaId: mediaId,
  featuredProjectId: mediaId,
  featuredPrimaryMediaId: mediaId,
  featuredSecondaryMediaId: mediaId,
  categoryMedia: z.array(z.object({ categorySlug: z.string().trim().max(120), mediaId })).max(80),
  galleryMediaIds: z.array(mediaId).max(20),
  sequenceMediaIds: z.array(mediaId).max(12),
});

export function defaultProjectPageMediaSettings(): ProjectPageMediaSettings {
  return {
    heroMediaId: "",
    featuredProjectId: "",
    featuredPrimaryMediaId: "",
    featuredSecondaryMediaId: "",
    categoryMedia: [],
    galleryMediaIds: Array.from({ length: 5 }, () => ""),
    sequenceMediaIds: Array.from({ length: 3 }, () => ""),
  };
}

type AssetRecord = Readonly<{
  id: string;
  storageKey: string;
  alt: string;
  width: number | null;
  height: number | null;
}>;

function asset(record: AssetRecord | null | undefined): ProjectAdminAsset | null {
  if (!record) return null;
  try {
    return {
      id: record.id,
      src: mediaUrl(record.storageKey),
      alt: record.alt,
      width: record.width ?? 1600,
      height: record.height ?? 1100,
    };
  } catch {
    return null;
  }
}

async function readSettings(): Promise<ProjectPageMediaSettings> {
  const section = await getDb().siteSection.findUnique({
    where: { page_key: { page: "projects", key: "media" } },
    include: { content: { where: { locale: "en" }, take: 1 } },
  });
  const parsed = projectPageMediaSettingsSchema.safeParse(section?.content[0]?.payload);
  return parsed.success ? parsed.data : defaultProjectPageMediaSettings();
}

export async function getProjectsAdminData(): Promise<ProjectsAdminData> {
  const db = getDb();
  const [settings, projectRows, categoryRows] = await Promise.all([
    readSettings(),
    db.project.findMany({
      where: { state: { not: "ARCHIVED" } },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      include: {
        category: true,
        images: {
          where: { media: { approved: true, mimeType: { startsWith: "image/" } } },
          orderBy: { sortOrder: "asc" },
          include: { media: true },
        },
      },
    }),
    db.projectCategory.findMany({ orderBy: { name: "asc" } }),
  ]);

  const stories: ProjectAdminStory[] = projectRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    introduction: row.introduction ?? "",
    category: row.category?.name ?? "",
    location: row.location ?? "",
    published: row.state === "PUBLISHED",
    sortOrder: row.sortOrder,
    images: row.images.flatMap((relation) => asset(relation.media) ?? []),
  }));

  const requestedIds = [...new Set([
    settings.heroMediaId,
    settings.featuredPrimaryMediaId,
    settings.featuredSecondaryMediaId,
    ...settings.categoryMedia.map((item) => item.mediaId),
    ...settings.galleryMediaIds,
    ...settings.sequenceMediaIds,
  ].filter(Boolean))];
  const settingAssets = requestedIds.length
    ? await db.mediaAsset.findMany({
      where: { id: { in: requestedIds }, approved: true, mimeType: { startsWith: "image/" } },
      select: { id: true, storageKey: true, alt: true, width: true, height: true },
    })
    : [];
  const assetLookup = new Map(settingAssets.flatMap((record) => {
    const mapped = asset(record);
    return mapped ? [[record.id, mapped] as const] : [];
  }));
  const categorySetting = new Map(settings.categoryMedia.map((item) => [item.categorySlug, item.mediaId]));

  const databaseCategories: ProjectAdminCategory[] = categoryRows.map((category) => {
    const selectedId = categorySetting.get(category.slug) ?? "";
    const firstStory = stories.find((story) => story.category === category.name);
    return {
      id: category.id,
      slug: category.slug,
      name: category.name,
      preview: firstStory?.images[0] ?? null,
      mediaId: selectedId,
      media: assetLookup.get(selectedId) ?? null,
    };
  });
  const fallbackCategoryMap = new Map<string, { name: string; preview: ProjectMedia }>();
  for (const project of projectsFallback.projects.filter((item) => item.id !== projectsFallback.featuredProjectId)) {
    const slug = project.category.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "uncategorised";
    if (!fallbackCategoryMap.has(slug)) fallbackCategoryMap.set(slug, { name: project.category, preview: project.heroMedia });
  }
  const categories: ProjectAdminCategory[] = databaseCategories.length ? databaseCategories : Array.from(fallbackCategoryMap, ([slug, category]) => {
    const selectedId = categorySetting.get(slug) ?? "";
    return {
      id: `fallback-${slug}`,
      slug,
      name: category.name,
      preview: category.preview,
      mediaId: selectedId,
      media: assetLookup.get(selectedId) ?? null,
    };
  });

  const featured = stories.find((story) => story.id === settings.featuredProjectId && story.published)
    ?? stories.find((story) => story.published)
    ?? stories[0]
    ?? null;
  const fallbackFeatured = projectsFallback.projects.find((project) => project.id === projectsFallback.featuredProjectId) ?? projectsFallback.projects[0] ?? null;
  const galleryIds = [...settings.galleryMediaIds, ...Array.from({ length: Math.max(0, 5 - settings.galleryMediaIds.length) }, () => "")].slice(0, 5);
  const sequenceIds = [...settings.sequenceMediaIds, ...Array.from({ length: Math.max(0, 3 - settings.sequenceMediaIds.length) }, () => "")].slice(0, 3);

  return {
    stories,
    categories,
    settings: { ...settings, galleryMediaIds: galleryIds, sequenceMediaIds: sequenceIds },
    hero: { fallback: featured?.images[0] ?? projectsFallback.hero.media, media: assetLookup.get(settings.heroMediaId) ?? null },
    featuredPrimary: assetLookup.get(settings.featuredPrimaryMediaId) ?? featured?.images[0] ?? null,
    featuredSecondary: assetLookup.get(settings.featuredSecondaryMediaId) ?? featured?.images[1] ?? null,
    featuredPrimaryFallback: featured?.images[0] ?? fallbackFeatured?.heroMedia ?? null,
    featuredSecondaryFallback: featured?.images[1] ?? fallbackFeatured?.secondaryMedia ?? null,
    gallery: galleryIds.map((id) => assetLookup.get(id) ?? null),
    sequence: sequenceIds.map((id) => assetLookup.get(id) ?? null),
    galleryFallbacks: projectsFallback.gallery.map((item) => item.media),
    sequenceFallbacks: projectsFallback.story.map((item) => item.media),
  };
}
