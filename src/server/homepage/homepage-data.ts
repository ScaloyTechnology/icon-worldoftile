import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/server/db";
import { mediaUrl, getEditorialMedia } from "@/lib/media";
import { siteContent } from "@/content/site";
import { chooseHomepageHeroCandidate } from "@/lib/products/homepage-selector";
import { curateWallTiles, homepageMaterialStudies } from "@/lib/products/homepage-fallbacks";
import type { HomepageWallTile } from "@/lib/products/homepage-types";
import type { HomepageCollection, HomepageExperienceData, HomepageHeroProduct, HomepageMedia } from "@/lib/products/homepage-types";

const configSchema = z.object({
  heroProductId: z.string().min(1).optional(),
  heroCollectionId: z.string().min(1).optional(),
  heroRoomMediaId: z.string().min(1).optional(),
  enable3DHero: z.boolean().default(true),
  heroHeading: z.array(z.string().min(1).max(80)).min(1).max(3).optional(),
  heroEyebrow: z.string().min(1).max(120).optional(),
  heroCTA: z.string().min(1).max(40).optional(),
});

const mediaSelect = { id: true, storageKey: true, alt: true, width: true, height: true, approved: true } as const;
const productInclude = {
  primaryTexture: { select: mediaSelect },
  previewMedia: { select: mediaSelect },
  images: { where: { media: { approved: true } }, orderBy: { sortOrder: "asc" as const }, take: 1, include: { media: { select: mediaSelect } } },
  collections: { where: { collection: { state: "PUBLISHED" as const } }, orderBy: { sortOrder: "asc" as const }, take: 1, include: { collection: { select: { name: true, slug: true } } } },
  attributes: { include: { value: { include: { definition: true } } } },
  variants: { orderBy: { sortOrder: "asc" as const }, take: 1, include: { size: true } },
} as const;

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

function mappedMedia(media: { storageKey: string; alt: string; width: number | null; height: number | null } | null | undefined): HomepageMedia | null {
  if (!media) return null;
  try { return { url: mediaUrl(media.storageKey), alt: media.alt, width: media.width, height: media.height }; } catch { return null; }
}

function validMediaWhere() {
  return { OR: [{ primaryTexture: { approved: true } }, { previewMedia: { approved: true } }, { images: { some: { media: { approved: true } } } }] };
}

function mapProduct(product: ProductRecord | null, source: HomepageHeroProduct["source"], room: HomepageMedia): HomepageHeroProduct | null {
  if (!product) return null;
  const texture = mappedMedia(product.primaryTexture?.approved ? product.primaryTexture : null)
    ?? mappedMedia(product.previewMedia?.approved ? product.previewMedia : null)
    ?? mappedMedia(product.images.find(item => item.media.approved)?.media);
  if (!texture) return null;
  const variant = product.variants?.[0];
  const collection = product.collections?.[0]?.collection ?? null;
  const finish = product.attributes.find(item => item.value.definition.kind === "FINISH")?.value.label ?? null;
  return {
    id: product.id, label: product.name, slug: product.slug, collection, texture, room,
    widthMm: variant?.size ? Number(variant.size.widthMm) : null,
    heightMm: variant?.size ? Number(variant.size.lengthMm) : null,
    thicknessMm: variant?.thicknessMm ? Number(variant.thicknessMm) : null,
    finish, ctaHref: collection ? `/products?collection=${encodeURIComponent(collection.slug)}` : "/products", source,
  };
}

const heroRoomMedia = getEditorialMedia("hero");
const fallbackRoom: HomepageMedia = { url: heroRoomMedia.src, alt: heroRoomMedia.alt, width: heroRoomMedia.width, height: heroRoomMedia.height };
const fallbackMaterialStudy = homepageMaterialStudies[0];
if (!fallbackMaterialStudy) throw new Error("Homepage fallback material studies are missing");
const fallbackHero: HomepageHeroProduct = {
  ...fallbackMaterialStudy, room: fallbackRoom,
  ctaHref: "/products", source: "development-fallback",
};

export async function getHomepageWallTiles(): Promise<HomepageWallTile[]> {
  const db = getDb();
  const base = { state: "PUBLISHED" as const, ...validMediaWhere() };
  const orderBy = [{ sortOrder: "asc" as const }, { id: "asc" as const }];
  // Three bounded queries, at most 18 candidates; never download the product catalogue.
  const groups = await Promise.all([
    db.product.findMany({ where: { ...base, collections: { some: { collection: { state: "PUBLISHED", isFeatured: true } } } }, orderBy, take: 6, include: productInclude }),
    db.product.findMany({ where: { ...base, isFeatured: true }, orderBy, take: 6, include: productInclude }),
    db.product.findMany({ where: base, orderBy, take: 6, include: productInclude }),
  ]);
  const mapped = groups.map(group => group.flatMap(product => {
    const hero = mapProduct(product, "featured-product", fallbackRoom);
    if (!hero) return [];
    const surface = product.attributes.find(item => item.value.definition.kind === "SURFACE")?.value.label ?? null;
    return [{ id: hero.id, label: hero.label, slug: hero.slug, collection: hero.collection, texture: hero.texture, widthMm: hero.widthMm, heightMm: hero.heightMm, thicknessMm: hero.thicknessMm, finish: hero.finish, surface, source: "database" as const }];
  }));
  return curateWallTiles([...mapped, homepageMaterialStudies]);
}

function fallbackCollections(): HomepageCollection[] {
  return siteContent.collections.map((item, index) => {
    const media = getEditorialMedia(item.media);
    return { id: `development-${index}`, name: item.name, slug: item.filter, description: item.subtitle, image: { url: media.src, alt: media.alt, width: media.width, height: media.height }, source: "development-fallback" };
  });
}

async function readDatabaseExperience() {
  const db = getDb();
  const section = await db.siteSection.findUnique({ where: { page_key: { page: "home", key: "hero" } }, include: { content: { where: { locale: "en" }, take: 1 } } });
  const parsed = section?.state === "PUBLISHED" ? configSchema.safeParse(section.content[0]?.payload) : null;
  const config = parsed?.success ? parsed.data : configSchema.parse({});
  const roomRecord = config.heroRoomMediaId ? await db.mediaAsset.findFirst({ where: { id: config.heroRoomMediaId, approved: true }, select: mediaSelect }) : null;
  const room = mappedMedia(roomRecord) ?? fallbackRoom;
  const publishedWithMedia = { state: "PUBLISHED" as const, ...validMediaWhere() };
  const [configuredProduct, configuredCollectionProduct, featuredProduct, featuredCollections, wallTiles] = await Promise.all([
    config.heroProductId ? db.product.findFirst({ where: { ...publishedWithMedia, id: config.heroProductId }, include: productInclude }) : null,
    config.heroCollectionId ? db.product.findFirst({ where: { ...publishedWithMedia, collections: { some: { collectionId: config.heroCollectionId, collection: { state: "PUBLISHED" } } } }, orderBy: [{ homepageHeroEligible: "desc" }, { isFeatured: "desc" }, { sortOrder: "asc" }, { id: "asc" }], include: productInclude }) : null,
    db.product.findFirst({ where: { ...publishedWithMedia, isFeatured: true }, orderBy: [{ homepageHeroEligible: "desc" }, { sortOrder: "asc" }, { id: "asc" }], include: productInclude }),
    db.collection.findMany({ where: { state: "PUBLISHED", isFeatured: true }, orderBy: [{ homepageOrder: "asc" }, { sortOrder: "asc" }, { id: "asc" }], include: { coverMedia: { select: mediaSelect }, heroMedia: { select: mediaSelect }, products: { where: { product: { state: "PUBLISHED" } }, orderBy: { sortOrder: "asc" }, take: 1, include: { product: { include: productInclude } } } } }),
    getHomepageWallTiles(),
  ]);
  const chosen = chooseHomepageHeroCandidate([
    { value: mapProduct(configuredProduct, "configured-product", room), source: "configured-product" },
    { value: mapProduct(configuredCollectionProduct, "configured-collection", room), source: "configured-collection" },
    { value: mapProduct(featuredProduct, "featured-product", room), source: "featured-product" },
  ]);
  const hero = chosen?.value ?? null;
  const collections = featuredCollections.flatMap(collection => {
    const product = collection.products[0]?.product;
    const image = mappedMedia(collection.heroMedia?.approved ? collection.heroMedia : null)
      ?? mappedMedia(collection.coverMedia?.approved ? collection.coverMedia : null)
      ?? mappedMedia(product?.previewMedia?.approved ? product.previewMedia : null)
      ?? mappedMedia(product?.images?.find(item => item.media.approved)?.media)
      ?? mappedMedia(product?.primaryTexture?.approved ? product.primaryTexture : null);
    return image ? [{ id: collection.id, name: collection.name, slug: collection.slug, description: collection.description ?? "", image, source: "database" as const }] : [];
  });
  return { hero: hero ?? { ...fallbackHero, room }, wallTiles, collections: collections.length ? collections : fallbackCollections(), config };
}

export async function getHomepageExperience(): Promise<HomepageExperienceData> {
  const defaults = { enable3DHero: true, heading: siteContent.hero.lines, eyebrow: siteContent.hero.eyebrow, cta: siteContent.hero.cta };
  if (!process.env.DATABASE_URL) return { hero: fallbackHero, wallTiles: homepageMaterialStudies, collections: fallbackCollections(), config: defaults };
  try {
    const data = await Promise.race([readDatabaseExperience(), new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Homepage data timeout")), 900))]);
    return { hero: data.hero, wallTiles: data.wallTiles, collections: data.collections, config: { enable3DHero: data.config.enable3DHero, heading: data.config.heroHeading ?? defaults.heading, eyebrow: data.config.heroEyebrow ?? defaults.eyebrow, cta: data.config.heroCTA ?? defaults.cta } };
  } catch {
    return { hero: fallbackHero, wallTiles: homepageMaterialStudies, collections: fallbackCollections(), config: defaults };
  }
}
