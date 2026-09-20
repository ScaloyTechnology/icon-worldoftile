import "server-only";

import { cache } from "react";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { HomeMedia } from "@/types/home";

export type PublicCollection = Readonly<{
  id: string;
  slug: string;
  name: string;
  description: string;
  featured: boolean;
  listOrder: number;
  homepageOrder: number;
  image: HomeMedia | null;
}>;

export type PublicCollectionsResult = Readonly<{
  collections: readonly PublicCollection[];
  status: "available" | "unavailable";
}>;

function collectionImage(media: { approved: boolean; storageKey: string; alt: string; width: number | null; height: number | null } | null, name: string): HomeMedia | null {
  if (!media?.approved) return null;
  try {
    return {
      src: mediaUrl(media.storageKey),
      alt: media.alt.trim() || name,
      placeholderLabel: name,
      tone: "stone",
      width: media.width ?? undefined,
      height: media.height ?? undefined,
    };
  } catch {
    return null;
  }
}

/** Public records only. Admin data and Prisma models never cross the client boundary. */
export const getPublicCollections = cache(async (): Promise<PublicCollectionsResult> => {
  if (!process.env.DATABASE_URL) return { collections: [], status: "unavailable" };
  try {
    const records = await getDb().collection.findMany({
      where: { state: "PUBLISHED" },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: {
        id: true, slug: true, name: true, description: true, isFeatured: true, sortOrder: true, homepageOrder: true,
        coverMedia: { select: { approved: true, storageKey: true, alt: true, width: true, height: true } },
        heroMedia: { select: { approved: true, storageKey: true, alt: true, width: true, height: true } },
      },
    });
    return {
      status: "available",
      collections: records.map((record) => ({
        id: record.id,
        slug: record.slug,
        name: record.name,
        description: record.description?.trim() ?? "",
        featured: record.isFeatured,
        listOrder: record.sortOrder,
        homepageOrder: record.homepageOrder,
        image: collectionImage(record.heroMedia, record.name) ?? collectionImage(record.coverMedia, record.name),
      })),
    };
  } catch (error) {
    console.error("Public collections could not be loaded", error);
    return { collections: [], status: "unavailable" };
  }
});
