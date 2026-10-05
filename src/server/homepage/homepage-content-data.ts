import "server-only";

import { cache } from "react";
import { z } from "zod";

import { clientAssets } from "@/content/assets";
import { HOMEPAGE_ARTWORK_REVISION, homepageArtwork, homepageHeroArtwork as heroCategoryDefinitions, homepageSurfaceArtwork } from "@/content/homepage-art-direction";
import { clientSurfaceTaxonomy } from "@/content/product-taxonomy";
import { mediaUrl } from "@/lib/media";
import { getPublicCollections, type PublicCollection } from "@/server/collections/public-collections";
import { getDb } from "@/server/db";
import { getProductDiscovery } from "@/server/products/product-discovery";
import type { HomeMedia } from "@/types/home";
import type {
  HomepageContentData,
  HomepageMediaEditorData,
  HomepageMediaGroup,
  HomepageMediaSlot,
  HomepageSurfacePreview,
} from "@/types/homepage-content";

const surfaceFallbackImages = homepageSurfaceArtwork.map((id) => homepageArtwork(id));

const mediaId = z.string().trim().max(64);

export const homepageMediaPayloadSchema = z.object({
  artworkRevision: z.number().int().nonnegative().default(0),
  heroTileMediaIds: z.array(mediaId).min(8).max(12),
  // Defaults keep previously published image-only payloads compatible.
  heroTitles: z.array(z.string().trim().max(80)).length(8).default(Array.from({ length: 8 }, () => "")),
  heroInteriorMediaIds: z.array(mediaId).length(8).default(Array.from({ length: 8 }, () => "")),
  houseMainMediaId: mediaId,
  houseDetailMediaId: mediaId,
  surfaceMediaIds: z.array(mediaId).length(8),
});

export type HomepageMediaPayload = z.infer<typeof homepageMediaPayloadSchema>;

export function defaultHomepageMediaPayload(): HomepageMediaPayload {
  return {
    artworkRevision: HOMEPAGE_ARTWORK_REVISION,
    heroTileMediaIds: Array.from({ length: 8 }, () => ""),
    heroTitles: Array.from({ length: 8 }, () => ""),
    heroInteriorMediaIds: Array.from({ length: 8 }, () => ""),
    houseMainMediaId: "",
    houseDetailMediaId: "",
    surfaceMediaIds: Array.from({ length: 8 }, () => ""),
  };
}

function collectionHref(slug: string) {
  return `/products?collection=${encodeURIComponent(slug)}`;
}

function hasHomepageImage(collection: PublicCollection): collection is PublicCollection & { image: HomeMedia } {
  return collection.featured && collection.image !== null;
}

function surfaceHref(param: string, value: string) {
  return `/products?${encodeURIComponent(param)}=${encodeURIComponent(value)}`;
}

async function readPayload(requirePublished: boolean) {
  const section = await getDb().siteSection.findUnique({
    where: { page_key: { page: "home", key: "media" } },
    include: { content: { where: { locale: "en" }, take: 1 } },
  });
  if (!section || (requirePublished && section.state !== "PUBLISHED")) return null;
  const parsed = homepageMediaPayloadSchema.safeParse(section.content[0]?.payload);
  if (!parsed.success) return null;
  // The requested artwork refresh supersedes previous image selections without
  // deleting uploaded media or the saved payload. Titles remain untouched.
  // Both admin and public readers use the same release; new admin uploads win
  // again as soon as Save and publish stamps the current artwork revision.
  if (parsed.data.artworkRevision < HOMEPAGE_ARTWORK_REVISION) {
    return { ...defaultHomepageMediaPayload(), heroTitles: parsed.data.heroTitles };
  }
  return parsed.data;
}

async function mediaLookup(payload: HomepageMediaPayload) {
  const ids = [...new Set([
    ...payload.heroTileMediaIds,
    ...payload.heroInteriorMediaIds,
    payload.houseMainMediaId,
    payload.houseDetailMediaId,
    ...payload.surfaceMediaIds,
  ].filter(Boolean))];
  if (!ids.length) return new Map<string, { id: string; storageKey: string; alt: string; width: number | null; height: number | null }>();
  const assets = await getDb().mediaAsset.findMany({
    where: { id: { in: ids }, approved: true, mimeType: { startsWith: "image/" } },
    select: { id: true, storageKey: true, alt: true, width: true, height: true },
  });
  return new Map(assets.map((asset) => [asset.id, asset]));
}

function resolvedMedia(
  fallback: HomeMedia,
  selectedId: string,
  assets: Awaited<ReturnType<typeof mediaLookup>>,
) {
  const asset = selectedId ? assets.get(selectedId) : undefined;
  if (!asset) return { mediaId: "", media: fallback };
  try {
    return {
      mediaId: asset.id,
      media: {
        ...fallback,
        src: mediaUrl(asset.storageKey),
        alt: asset.alt || fallback.alt,
        width: asset.width ?? fallback.width,
        height: asset.height ?? fallback.height,
      },
    };
  } catch {
    return { mediaId: "", media: fallback };
  }
}

const getHomepageBaseContent = cache(async (): Promise<HomepageContentData> => {
  const [discovery, publicCollections] = await Promise.all([getProductDiscovery(), getPublicCollections()]);
  const collections = publicCollections.collections
    .filter(hasHomepageImage)
    .sort((a, b) => a.homepageOrder - b.homepageOrder || a.listOrder - b.listOrder || a.id.localeCompare(b.id))
    .map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      name: collection.name,
      description: collection.description,
      image: collection.image,
      href: collectionHref(collection.slug),
    }));

  const surfaceGroup = discovery.filterGroups.find((group) => group.key === "surfaces");
  const surfaceOptions = clientSurfaceTaxonomy.map((taxonomyValue) =>
    surfaceGroup?.options.find((option) => option.value === taxonomyValue)
      ?? { value: taxonomyValue, label: taxonomyValue },
  );
  const surfaceParam = surfaceGroup?.param ?? "surface";
  const surfaces: HomepageSurfacePreview[] = surfaceOptions.map((option, index) => {
    const image = surfaceFallbackImages[index] ?? homepageArtwork("rapolano-natural");
    return {
      id: `surface-${index + 1}`,
      value: option.value,
      name: option.label,
      image,
      href: surfaceHref(surfaceParam, option.value),
    };
  });

  return {
    heroScenes: [
      { id: "material-interior", eyebrow: "ICON / Architectural material study", title: "Crafting concepts", emphasis: "shaped by nature.", supportingText: "Where imagination begins. Refined by design.", image: clientAssets.crossCut },
      { id: "material-hospitality", eyebrow: "ICON / Hospitality material study", title: "Advancing", emphasis: "surfaces.", supportingText: "Through new textures, techniques and thinking.", image: clientAssets.hospitality },
      { id: "material-retail", eyebrow: "ICON / Retail material study", title: "Innovation transforms", emphasis: "possibilities.", supportingText: "New textures, techniques and thinking.", image: clientAssets.retail },
      { id: "material-outdoor", eyebrow: "ICON / Outdoor material study", title: "Rise with", emphasis: "integrity.", supportingText: "Setting benchmarks for the industry with pioneering creations.", image: clientAssets.outdoor },
    ],
    heroCategories: heroCategoryDefinitions.map((category) => ({
      id: category.id,
      title: category.title,
      productImage: homepageArtwork(category.artwork, true),
      interiorImage: homepageArtwork(category.artwork),
    })),
    heroTiles: heroCategoryDefinitions.map((category) => ({
      id: category.id,
      name: category.title,
      image: homepageArtwork(category.artwork, true),
    })),
    discover: {
      heading: "Nearly four decades of imagination.",
      intro: "ICON crafts concepts shaped by nature and refined by design, advancing surfaces through new textures, techniques and thinking.",
      image: homepageArtwork("onyx-celeste"),
      stats: [
        { value: "1,00,000", label: "sq. mtr. per day" },
        { value: "60+", label: "countries", note: "Global presence" },
        { value: "1,500+", label: "tile designs" },
        { value: "30+", label: "years of experience" },
      ],
      cta: { label: "Know More", href: "/meet-icon" },
    },
    collections,
    surfaces,
    surfaceArchiveImage: homepageArtwork("boat-1006"),
    source: discovery.source,
  };
});

function contentWithMedia(
  base: HomepageContentData,
  payload: HomepageMediaPayload,
  assets: Awaited<ReturnType<typeof mediaLookup>>,
): HomepageContentData {
  return {
    ...base,
    heroCategories: base.heroCategories?.map((category, index) => ({
      ...category,
      title: payload.heroTitles[index] || category.title,
      productImage: resolvedMedia(category.productImage, payload.heroTileMediaIds[index] ?? "", assets).media,
      interiorImage: resolvedMedia(category.interiorImage, payload.heroInteriorMediaIds[index] ?? "", assets).media,
    })),
    heroTiles: base.heroTiles.map((tile, index) => ({
      ...tile,
      name: payload.heroTitles[index] || tile.name,
      image: resolvedMedia(tile.image, payload.heroTileMediaIds[index] ?? "", assets).media,
    })),
    discover: {
      ...base.discover,
      image: resolvedMedia(base.discover.image, payload.houseMainMediaId, assets).media,
    },
    surfaceArchiveImage: resolvedMedia(base.surfaceArchiveImage, payload.houseDetailMediaId, assets).media,
    surfaces: base.surfaces.map((surface, index) => ({
      ...surface,
      image: surface.image
        ? resolvedMedia(surface.image, payload.surfaceMediaIds[index] ?? "", assets).media
        : surface.image,
    })),
  };
}

function slot(
  input: Omit<HomepageMediaSlot, "mediaId" | "media" | "fallbackMedia"> & { fallback: HomeMedia; selectedId: string },
  assets: Awaited<ReturnType<typeof mediaLookup>>,
): HomepageMediaSlot {
  const resolved = resolvedMedia(input.fallback, input.selectedId, assets);
  return {
    key: input.key,
    fieldName: input.fieldName,
    titleInput: input.titleInput,
    label: input.label,
    title: input.title,
    description: input.description,
    recommendation: input.recommendation,
    fallbackMedia: input.fallback,
    ...resolved,
  };
}

function editorGroups(
  base: HomepageContentData,
  payload: HomepageMediaPayload,
  assets: Awaited<ReturnType<typeof mediaLookup>>,
): readonly HomepageMediaGroup[] {
  const heroCategories = base.heroCategories ?? base.heroTiles.slice(0, 8).map((tile) => ({
    id: tile.id,
    title: tile.name,
    productImage: tile.image,
    interiorImage: tile.image,
  }));
  const houseSlots: HomepageMediaSlot[] = [
    slot({ key: "house-main", fieldName: "houseMainMediaId", label: "01 / Primary image", title: "Large right-side image", description: "The main architectural image beside the House of ICON introduction.", recommendation: "Portrait or architectural image · recommended 1600 × 1900 px or larger", fallback: base.discover.image, selectedId: payload.houseMainMediaId }, assets),
    slot({ key: "house-detail", fieldName: "houseDetailMediaId", label: "02 / Detail image", title: "Floating material image", description: "The smaller overlapping image positioned in front of the primary image.", recommendation: "Portrait material detail · recommended 1000 × 1300 px or larger", fallback: base.surfaceArchiveImage, selectedId: payload.houseDetailMediaId }, assets),
  ];

  return [
    {
      id: "hero-products",
      number: "01",
      title: "Hero / Category showcase",
      description: "Manage the title, floating product image and matching interior for each of the eight hero items. The interior also appears in the full-page popup.",
      slots: heroCategories.flatMap((category, index) => [
        slot({
          key: `hero-${category.id}`,
          fieldName: "heroTileMediaId",
          titleInput: { name: "heroTitle", value: payload.heroTitles[index] || category.title },
          label: `Hero item ${index + 1} / Product`,
          title: payload.heroTitles[index] || category.title,
          description: "The title beneath the floating tile and its product image.",
          recommendation: "Landscape surface image · recommended 1600 × 1032 px or larger. Use the original, not a small thumbnail.",
          fallback: category.productImage,
          selectedId: payload.heroTileMediaIds[index] ?? "",
        }, assets),
        slot({
          key: `hero-interior-${category.id}`,
          fieldName: "heroInteriorMediaId",
          label: `Hero item ${index + 1} / Interior`,
          title: "Matching interior",
          description: "The photograph opened by View interior for this tile. The hero itself has a plain ivory background.",
          recommendation: "High-resolution architectural photograph · recommended 2400 px on the longest side or larger. Portrait and landscape images are supported in the popup.",
          fallback: category.interiorImage,
          selectedId: payload.heroInteriorMediaIds[index] ?? "",
        }, assets),
      ]),
    },
    {
      id: "house-of-icon",
      number: "02",
      title: "The house of ICON",
      description: "The large architectural image and the smaller overlapping material detail on the right side.",
      slots: houseSlots,
    },
    {
      id: "explore-surfaces",
      number: "04",
      title: "Explore surfaces",
      description: "Eight images matched one-to-one with the existing surface cards. Labels, links and animation remain protected.",
      slots: base.surfaces.map((surface, index) => slot({ key: `surface-${index + 1}`, fieldName: "surfaceMediaId", label: `${String(index + 1).padStart(2, "0")} / Surface`, title: surface.name, description: `Image used for the ${surface.name} surface card.`, recommendation: "Portrait architectural image · recommended 1200 × 1800 px or larger", fallback: surface.image ?? surfaceFallbackImages[index] ?? clientAssets.crossCut, selectedId: payload.surfaceMediaIds[index] ?? "" }, assets)),
    },
  ];
}

export const getHomepageContent = cache(async (): Promise<HomepageContentData> => {
  const base = await getHomepageBaseContent();
  if (!process.env.DATABASE_URL) return base;
  try {
    const payload = await readPayload(true) ?? defaultHomepageMediaPayload();
    const assets = await mediaLookup(payload);
    return contentWithMedia(base, payload, assets);
  } catch (cause) {
    console.error("Homepage media could not be loaded", cause);
    return base;
  }
});

export async function getHomepageMediaEditorData(): Promise<HomepageMediaEditorData> {
  const base = await getHomepageBaseContent();
  const payload = process.env.DATABASE_URL
    ? await readPayload(false).catch(() => null) ?? defaultHomepageMediaPayload()
    : defaultHomepageMediaPayload();
  const assets = process.env.DATABASE_URL
    ? await mediaLookup(payload)
    : await mediaLookup(defaultHomepageMediaPayload());
  return { groups: editorGroups(base, payload, assets) };
}
