import "server-only";

import { cache } from "react";
import { getFallbackProjectDetail, getFallbackProjectSlugs } from "@/content/project-details";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { ProjectDetailCollection, ProjectDetailData, ProjectDetailProduct } from "@/types/project-detail";
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

function unique(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function productField(product: Row, kind: "finish" | "surface") {
  const attributes = (product.attributes ?? []).flatMap((relation: Row) => {
    const definition = relation.value?.definition;
    const key = `${definition?.slug ?? ""} ${definition?.name ?? ""}`.toLowerCase();
    return key.includes(kind) && relation.value?.label ? [relation.value.label] : [];
  });
  const specifications = (product.specifications ?? []).flatMap((relation: Row) => {
    const key = `${relation.definition?.key ?? ""} ${relation.definition?.label ?? ""}`.toLowerCase();
    return key.includes(kind) && relation.value ? [relation.value] : [];
  });
  return unique([...attributes, ...specifications]).join(" / ") || null;
}

function mappedProduct(relation: Row): ProjectDetailProduct | null {
  const product = relation.product;
  if (!product || product.state !== "PUBLISHED") return null;
  const media = mappedMedia(product.previewMedia, product.name)
    ?? mappedMedia(product.primaryTexture, product.name)
    ?? mappedMedia(product.images?.[0]?.media, product.name);
  if (!media) return null;
  const collection = (product.collections ?? []).map((item: Row) => item.collection).find((item: Row) => item?.state === "PUBLISHED");
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    media,
    collectionName: collection?.name ?? null,
    finish: productField(product, "finish"),
    surface: productField(product, "surface"),
  };
}

function mappedCollection(record: Row | null | undefined, fallbackMedia: ProjectMedia | null): ProjectDetailCollection | null {
  if (!record || record.state !== "PUBLISHED") return null;
  const media = mappedMedia(record.coverMedia, record.name) ?? mappedMedia(record.heroMedia, record.name) ?? fallbackMedia;
  if (!media) return null;
  return { id: record.id, slug: record.slug, name: record.name, description: record.description?.trim() ?? "", media };
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

function relationIds(relations: readonly Row[], key: string) {
  return new Set(relations.flatMap((relation) => relation[key] ? [relation[key] as string] : []));
}

function relatedScore(project: Row, candidate: Row) {
  let score = 0;
  if (project.categoryId && project.categoryId === candidate.categoryId) score += 10;
  if (project.location && candidate.location && project.location.trim().toLowerCase() === candidate.location.trim().toLowerCase()) score += 7;
  const projectProducts = relationIds(project.products ?? [], "productId");
  const projectCollections = relationIds(project.collections ?? [], "collectionId");
  score += (candidate.products ?? []).filter((item: Row) => projectProducts.has(item.productId)).length * 5;
  score += (candidate.collections ?? []).filter((item: Row) => projectCollections.has(item.collectionId)).length * 6;
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
      products: {
        where: { product: { state: "PUBLISHED" } },
        include: {
          product: {
            include: {
              previewMedia: true,
              primaryTexture: true,
              images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, take: 1, include: { media: true } },
              collections: { where: { collection: { state: "PUBLISHED" } }, orderBy: { sortOrder: "asc" }, include: { collection: { include: { coverMedia: true, heroMedia: true } } } },
              attributes: { include: { value: { include: { definition: true } } } },
              specifications: { orderBy: { sortOrder: "asc" }, include: { definition: true } },
            },
          },
        },
      },
      collections: { where: { collection: { state: "PUBLISHED" } }, include: { collection: { include: { coverMedia: true, heroMedia: true } } } },
    },
  });
  if (!project) return null;

  const media = (project.images ?? []).flatMap((item: Row) => mappedMedia(item.media, project.title) ?? []);
  const heroMedia = media[0];
  if (!heroMedia) return null;
  const products = (project.products ?? []).flatMap((item: Row) => mappedProduct(item) ?? []);
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
    products,
    layout: "wide",
  };

  const facts = [
    project.location?.trim() ? { label: "Location", value: project.location.trim() } : null,
    project.category?.name ? { label: "Category", value: project.category.name } : null,
    project.architect?.trim() ? { label: "Architect", value: project.architect.trim() } : null,
    project.application?.name ? { label: "Application", value: project.application.name } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));
  const collectionMap = new Map<string, ProjectDetailCollection>();
  for (const relation of project.collections ?? []) {
    const collection = mappedCollection(relation.collection, null);
    if (collection) collectionMap.set(collection.id, collection);
  }
  for (const productRelation of project.products ?? []) {
    const fallbackMedia = mappedProduct(productRelation)?.media ?? null;
    for (const relation of productRelation.product?.collections ?? []) {
      const collection = mappedCollection(relation.collection, fallbackMedia);
      if (collection && !collectionMap.has(collection.id)) collectionMap.set(collection.id, collection);
    }
  }

  const candidates: Row[] = await db.project.findMany({
    where: { state: "PUBLISHED", id: { not: project.id } },
    orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { title: "asc" }],
    take: 16,
    include: {
      category: true,
      images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" }, take: 2, include: { media: true } },
      products: { where: { product: { state: "PUBLISHED" } }, select: { productId: true } },
      collections: { where: { collection: { state: "PUBLISHED" } }, select: { collectionId: true } },
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
    products,
    relatedCollections: Array.from(collectionMap.values()).slice(0, 3),
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
