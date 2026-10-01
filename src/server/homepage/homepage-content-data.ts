import "server-only";

import { cache } from "react";
import { z } from "zod";

import { clientAssets } from "@/content/assets";
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

const surfaceFallbackImages = [
  clientAssets.opal,
  clientAssets.denim,
  clientAssets.travertino,
  clientAssets.star,
  clientAssets.austin,
  clientAssets.mystone,
  clientAssets.fenix,
  clientAssets.crossCut,
] as const;

const heroCategoryDefinitions = [
  { id: "matt", title: "Matt", product: ["/assets/products/mystone-jaipur.webp", "Mystone Jaipur matt surface"], interior: ["/assets/home/surface-portraits/matt-opal.webp", "Matt tile surface in a composed interior"] },
  { id: "high-gloss", title: "High gloss", product: ["/assets/home/product-showcase/denim-blue-royal-floral.webp", "Denim Blue high-gloss decorative surface"], interior: ["/assets/home/surface-portraits/high-gloss-denim.webp", "High-gloss decorative tile in a blue interior"] },
  { id: "carving", title: "Carving", product: ["/assets/products/travertino-rome-decor.webp", "Travertino Rome carved surface detail"], interior: ["/assets/home/surface-portraits/carving-travertino.webp", "Carved travertine-look surface in an interior"] },
  { id: "double-digital", title: "Double digital", product: ["/assets/home/product-showcase/star-nero.webp", "Star Nero double-digital surface"], interior: ["/assets/home/surface-portraits/double-digital-star.webp", "Double-digital tile surface in a dark interior"] },
  { id: "gvt", title: "GVT", product: ["/assets/products/austin-silver.webp", "Austin Silver GVT surface"], interior: ["/assets/home/surface-portraits/gvt-austin.webp", "GVT surface used across a contemporary interior"] },
  { id: "pgvt", title: "PGVT", product: ["/assets/products/mystone-grey.webp", "Mystone Grey PGVT surface"], interior: ["/assets/home/surface-portraits/pgvt-mystone.webp", "PGVT stone-look surface in a living environment"] },
  { id: "full-body", title: "Full body", product: ["/assets/products/fenix-crema.webp", "Fenix Crema full-body surface"], interior: ["/assets/home/surface-portraits/full-body-fenix.webp", "Full-body tile surface in a warm bedroom"] },
  { id: "porcelain", title: "Porcelain", product: ["/assets/products/marmi-carrara.webp", "Marmi Carrara porcelain surface"], interior: ["/assets/home/surface-portraits/porcelain-cross-cut.webp", "Porcelain surface in a light architectural interior"] },
] as const;

const mediaId = z.string().trim().max(64);

export const homepageMediaPayloadSchema = z.object({
  heroTileMediaIds: z.array(mediaId).min(8).max(12),
  houseMainMediaId: mediaId,
  houseDetailMediaId: mediaId,
  surfaceMediaIds: z.array(mediaId).length(8),
});

export type HomepageMediaPayload = z.infer<typeof homepageMediaPayloadSchema>;

export function defaultHomepageMediaPayload(): HomepageMediaPayload {
  return {
    heroTileMediaIds: Array.from({ length: 8 }, () => ""),
    houseMainMediaId: "",
    houseDetailMediaId: "",
    surfaceMediaIds: Array.from({ length: 8 }, () => ""),
  };
}

function heroCategoryMedia(source: readonly [string, string]): HomeMedia {
  return {
    src: source[0],
    alt: source[1],
    placeholderLabel: source[1],
    tone: "deep",
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
  return parsed.success ? parsed.data : null;
}

async function mediaLookup(payload: HomepageMediaPayload) {
  const ids = [...new Set([
    ...payload.heroTileMediaIds,
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
  const usedSurfaceImages = new Set<string>();
  const surfaces: HomepageSurfacePreview[] = surfaceOptions.map((option, index) => {
    const representative = discovery.products.find((product) => product.surfaces.includes(option.value));
    const representativeImage = representative?.primaryMedia ?? null;
    const representativeSource = representativeImage?.src;
    const fallbackImage = surfaceFallbackImages[index] ?? clientAssets.crossCut;
    const image = representativeImage && representativeSource && !usedSurfaceImages.has(representativeSource)
      ? representativeImage
      : fallbackImage;
    if (image.src) usedSurfaceImages.add(image.src);
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
      productImage: heroCategoryMedia(category.product),
      interiorImage: heroCategoryMedia(category.interior),
    })),
    heroTiles: heroCategoryDefinitions.map((category) => ({
      id: category.id,
      name: category.title,
      image: heroCategoryMedia(category.product),
    })),
    discover: {
      heading: "Nearly four decades of imagination.",
      intro: "ICON crafts concepts shaped by nature and refined by design, advancing surfaces through new textures, techniques and thinking.",
      image: clientAssets.crossCut,
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
    surfaceArchiveImage: clientAssets.travertino,
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
      productImage: resolvedMedia(category.productImage, payload.heroTileMediaIds[index] ?? "", assets).media,
    })),
    heroTiles: base.heroTiles.map((tile, index) => ({
      ...tile,
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
      description: "Eight approved surface categories, each paired with a product visual and an architectural interior.",
      slots: heroCategories.map((category, index) => slot({ key: `hero-${category.id}`, fieldName: "heroTileMediaId", label: `${String(index + 1).padStart(2, "0")} / Product image`, title: category.title, description: `Product visual displayed beside the ${category.title} interior.`, recommendation: "Product or surface image · recommended 1200 × 1600 px or larger", fallback: category.productImage, selectedId: payload.heroTileMediaIds[index] ?? "" }, assets)),
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
