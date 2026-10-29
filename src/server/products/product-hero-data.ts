import "server-only";
import { cache } from "react";
import { z } from "zod";
import { homepageArtwork, homepageHeroArtwork, HOMEPAGE_ARTWORK_REVISION } from "@/content/homepage-art-direction";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { HomeMedia } from "@/types/home";
import type { HomepageHeroCategory, HomepageMediaEditorData, HomepageMediaSlot } from "@/types/homepage-content";

const mediaId = z.string().trim().max(64);
export const productHeroPayloadSchema = z.object({
  tileMediaIds: z.array(mediaId).length(8),
  titles: z.array(z.string().trim().min(1).max(80)).length(8),
  interiorMediaIds: z.array(mediaId).length(8),
});
export type ProductHeroPayload = z.infer<typeof productHeroPayloadSchema>;
export function defaultProductHeroPayload(): ProductHeroPayload {
  return { tileMediaIds: Array(8).fill(""), titles: homepageHeroArtwork.map(item => item.title), interiorMediaIds: Array(8).fill("") };
}

async function readPayload(published: boolean): Promise<ProductHeroPayload> {
  const defaults = defaultProductHeroPayload();
  if (!process.env.DATABASE_URL) return defaults;
  const db = getDb();
  const section = await db.siteSection.findUnique({
    where: { page_key: { page: "products", key: "hero" } },
    include: { content: { where: { locale: "en" }, take: 1 } },
  });
  if (section) {
    if (published && section.state !== "PUBLISHED") return defaults;
    const parsed = productHeroPayloadSchema.safeParse(section.content[0]?.payload);
    return parsed.success ? parsed.data : defaults;
  }
  // Preserve the existing carousel on upgrades, until its first Products save.
  const legacy = await db.siteSection.findUnique({
    where: { page_key: { page: "home", key: "media" } },
    include: { content: { where: { locale: "en" }, take: 1 } },
  });
  if (!legacy || (published && legacy.state !== "PUBLISHED")) return defaults;
  const old = z.object({
    artworkRevision: z.number().default(0),
    heroTileMediaIds: z.array(mediaId).min(8).default(defaults.tileMediaIds),
    heroTitles: z.array(z.string()).length(8).default(defaults.titles),
    heroInteriorMediaIds: z.array(mediaId).length(8).default(defaults.interiorMediaIds),
  }).safeParse(legacy.content[0]?.payload);
  if (!old.success) return defaults;
  const currentArtwork = old.data.artworkRevision >= HOMEPAGE_ARTWORK_REVISION;
  return {
    tileMediaIds: currentArtwork ? old.data.heroTileMediaIds.slice(0, 8) : defaults.tileMediaIds,
    titles: homepageHeroArtwork.map((definition, index) => old.data.heroTitles[index]?.trim() || definition.title),
    interiorMediaIds: currentArtwork ? old.data.heroInteriorMediaIds : defaults.interiorMediaIds,
  };
}

function originalTile(definition: (typeof homepageHeroArtwork)[number]): HomeMedia {
  const image = homepageArtwork(definition.artwork, true);
  return definition.id === "matt" ? { ...image, src: "/assets/home/iro-mud/IRO%20MUD%20sq%20diffuse.jpg", width: 1200, height: 1200 } : image;
}

async function resolve(payload: ProductHeroPayload) {
  const ids = [...new Set([...payload.tileMediaIds, ...payload.interiorMediaIds].filter(Boolean))];
  const assets = ids.length ? await getDb().mediaAsset.findMany({
    where: { id: { in: ids }, approved: true, mimeType: { startsWith: "image/" } },
    select: { id: true, storageKey: true, alt: true, width: true, height: true },
  }) : [];
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const image = (id: string, fallback: HomeMedia) => {
    const asset = byId.get(id);
    if (!asset) return { mediaId: "", media: fallback };
    try { return { mediaId: id, media: { ...fallback, src: mediaUrl(asset.storageKey), alt: asset.alt || fallback.alt, width: asset.width ?? undefined, height: asset.height ?? undefined } }; }
    catch { return { mediaId: "", media: fallback }; }
  };
  return homepageHeroArtwork.map((definition, index) => ({
    definition, title: payload.titles[index]?.trim() || definition.title,
    tile: image(payload.tileMediaIds[index] ?? "", originalTile(definition)),
    interior: image(payload.interiorMediaIds[index] ?? "", homepageArtwork(definition.artwork)),
  }));
}

export const getProductHero = cache(async (): Promise<readonly HomepageHeroCategory[]> => {
  try {
    const items = await resolve(await readPayload(true));
    return items.map(item => ({ id: item.definition.id, title: item.title, productImage: item.tile.media, interiorImage: item.interior.media }));
  } catch (error) {
    console.error("Product hero could not be loaded", error);
    return homepageHeroArtwork.map(item => ({ id: item.id, title: item.title, productImage: originalTile(item), interiorImage: homepageArtwork(item.artwork) }));
  }
});

export async function getProductHeroEditorData(): Promise<HomepageMediaEditorData> {
  const items = await resolve(await readPayload(false));
  return { groups: [{
    id: "hero-products", number: "01", title: "Products / Hero carousel",
    description: "Edit the eight carousel titles, tile images and matching interiors on the Products page.",
    slots: items.flatMap((item, index): HomepageMediaSlot[] => [
      { key: `hero-${item.definition.id}`, fieldName: "heroTileMediaId", titleInput: { name: "heroTitle", value: item.title }, label: `Tile ${index + 1}`, title: item.title, description: "The surface image and caption displayed in the Products hero.", recommendation: "Use the original square tile image, ideally 1600 x 1600 px or larger.", fallbackMedia: originalTile(item.definition), ...item.tile },
      { key: `hero-interior-${item.definition.id}`, fieldName: "heroInteriorMediaId", label: `Tile ${index + 1} / Interior`, title: "Matching interior", description: "The interior photograph associated with this carousel tile.", recommendation: "Use an architectural photograph, ideally 2400 px on its longest side.", fallbackMedia: homepageArtwork(item.definition.artwork), ...item.interior },
    ]),
  }] };
}
