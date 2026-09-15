import "server-only";

import { cache } from "react";
import { projectsFallback } from "@/content/projects";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type {
  ProjectCategoryFilter,
  ProjectGalleryItem,
  ProjectLayout,
  ProjectLocation,
  ProjectMedia,
  ProjectProductLink,
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

function mappedProduct(relation: Row): ProjectProductLink | null {
  const product = relation.product;
  if (!product || product.state !== "PUBLISHED") return null;
  const media = mappedMedia(product.previewMedia, product.name)
    ?? mappedMedia(product.primaryTexture, product.name)
    ?? mappedMedia(product.images?.[0]?.media, product.name);
  return media ? { id: product.id, name: product.name, slug: product.slug, media } : null;
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
    products: (row.products ?? []).flatMap((item: Row) => mappedProduct(item) ?? []),
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
  const rows: Row[] = await db.project.findMany({
    where: { state: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
    include: {
      category: true,
      images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, include: { media: true } },
      products: {
        include: {
          product: {
            include: {
              previewMedia: true,
              primaryTexture: true,
              images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, take: 1, include: { media: true } },
            },
          },
        },
      },
    },
  });
  const projects = rows.map(mappedProject).filter((project): project is ProjectSummary => Boolean(project));
  if (!projects.length) throw new Error("No published projects with approved media");

  const gallery: ProjectGalleryItem[] = [];
  for (const row of rows) {
    for (const [index, image] of (row.images ?? []).slice(1).entries()) {
      const item = mappedMedia(image.media, row.title);
      if (item && !gallery.some((existing) => existing.media.src === item.src)) {
        gallery.push({ id: `${row.id}-${image.id}`, label: `${row.title} / ${String(index + 1).padStart(2, "0")}`, media: item });
      }
    }
  }

  const featured = projects[0]!;
  return {
    source: "database",
    hero: {
      eyebrow: "Projects / Atlas 01",
      title: ["Spaces", "in context."],
      description: "A project index connecting architectural spaces with the surfaces used within them.",
      media: featured.heroMedia,
    },
    featuredProjectId: featured.id,
    projects,
    categories: buildCategories(projects.length > 1 ? projects.slice(1) : projects),
    gallery,
    story: gallery.slice(0, 3),
    locations: buildLocations(projects),
  };
}

export const getProjectsPageData = cache(async (): Promise<ProjectsPageData> => {
  if (!process.env.DATABASE_URL) return fallbackData();
  try {
    return await Promise.race([
      readDatabase(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Project data timeout")), 1200)),
    ]);
  } catch {
    return fallbackData();
  }
});
