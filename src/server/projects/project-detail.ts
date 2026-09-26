import "server-only";

import { cache } from "react";
import { getFallbackProjectDetail, getFallbackProjectSlugs } from "@/content/project-details";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { ProjectDetailData } from "@/types/project-detail";
import type { ProjectMedia, ProjectSummary } from "@/types/projects";

// The public detail route remains compatible with a stale/minimal generated Prisma client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

function mappedMedia(record: Row | null | undefined, fallbackAlt: string): ProjectMedia | null {
  if (!record?.approved || !record.storageKey) return null;
  try {
    return {
      src: mediaUrl(record.storageKey),
      alt: record.alt?.trim() || fallbackAlt,
      width: record.width ?? 1800,
      height: record.height ?? 1200,
      position: "50% 50%",
      sourcePath: record.sourcePath ?? null,
    };
  } catch {
    return null;
  }
}

function mapRelatedProject(row: Row, index: number): ProjectSummary | null {
  const media = (row.images ?? []).flatMap((item: Row) => mappedMedia(item.media, row.title) ?? []);
  if (!media[0]) return null;
  return {
    id: row.id,
    slug: row.slug,
    index: String(index + 1).padStart(2, "0"),
    title: row.title,
    shortDescription: row.introduction?.trim() || "Published project information.",
    category: row.category?.name || "",
    location: row.location?.trim() || null,
    heroMedia: media[0],
    secondaryMedia: media[1] ?? null,
    products: [],
    layout: "landscape",
  };
}

function relatedScore(project: Row, candidate: Row) {
  let score = 0;
  if (project.categoryId && project.categoryId === candidate.categoryId) score += 10;
  if (project.location && candidate.location && project.location.trim().toLowerCase() === candidate.location.trim().toLowerCase()) score += 7;
  return score;
}

async function readDatabase(slug: string): Promise<ProjectDetailData | null> {
  const db = getDb() as unknown as Record<string, Row>;
  if (!db.project?.findFirst || !db.project?.findMany) throw new Error("Project model is unavailable");
  const project: Row | null = await db.project.findFirst({
    where: { slug, state: "PUBLISHED" },
    include: {
      seo: true,
      category: true,
      application: true,
      images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, include: { media: true } },
    },
  });
  if (!project) return null;

  const media: ProjectMedia[] = (project.images ?? []).flatMap((item: Row) => mappedMedia(item.media, project.title) ?? []);
  const heroMedia = media[0];
  if (!heroMedia) return null;
  const summary: ProjectSummary = {
    id: project.id,
    slug: project.slug,
    index: "01",
    title: project.title,
    shortDescription: project.introduction?.trim() || "Verified project editorial information will be added as it becomes available.",
    category: project.category?.name || "",
    location: project.location?.trim() || null,
    heroMedia,
    secondaryMedia: media[1] ?? null,
    products: [],
    layout: "wide",
  };

  const facts = [
    project.location?.trim() ? { label: "Location", value: project.location.trim() } : null,
    project.category?.name ? { label: "Category", value: project.category.name } : null,
    project.architect?.trim() ? { label: "Architect", value: project.architect.trim() } : null,
    project.application?.name ? { label: "Application", value: project.application.name } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const candidates: Row[] = await db.project.findMany({
    where: { state: "PUBLISHED", id: { not: project.id } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
    take: 16,
    include: {
      category: true,
      images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, take: 2, include: { media: true } },
    },
  });
  const relatedProjects = candidates
    .map((candidate, index) => ({ project: mapRelatedProject(candidate, index), score: relatedScore(project, candidate) }))
    .filter((item): item is { project: ProjectSummary; score: number } => Boolean(item.project) && item.score > 0)
    .sort((left, right) => right.score - left.score || left.project.title.localeCompare(right.project.title))
    .slice(0, 3)
    .map((item) => item.project);

  return {
    source: "database",
    project: summary,
    introductionHeading: "Material, space and atmosphere.",
    introduction: project.introduction?.trim() || "A detailed project narrative has not yet been supplied for this published record.",
    facts,
    gallery: media.slice(1).map((item, index) => ({ id: `${project.id}-gallery-${index + 1}`, label: `${project.title} / ${String(index + 1).padStart(2, "0")}`, media: item })),
    galleryNote: null,
    products: [],
    relatedCollections: [],
    relatedProjects,
    seo: {
      description: project.seo?.description?.trim() || project.introduction?.trim() || `Explore ${project.title}, an ICON architectural project case study.`,
      noIndex: Boolean(project.seo?.noIndex),
    },
  };
}

export const getProjectDetail = cache(async (slug: string): Promise<ProjectDetailData | null> => {
  const fallback = getFallbackProjectDetail(slug);
  if (!process.env.DATABASE_URL) return fallback;
  try {
    const database = await Promise.race([
      readDatabase(slug),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Project detail timeout")), 1600)),
    ]);
    return database ?? fallback;
  } catch {
    return fallback;
  }
});

export { getFallbackProjectSlugs };
