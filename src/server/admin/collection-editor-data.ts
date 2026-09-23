import "server-only";

import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { ProductEditorMedia } from "./product-editor-data";

export type CollectionEditorRecord = Readonly<{
  id: string;
  name: string;
  slug: string;
  description: string;
  state: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isFeatured: boolean;
  sortOrder: number;
  homepageOrder: number;
  coverMediaId: string;
  heroMediaId: string;
}>;

export type CollectionEditorData = Readonly<{
  collection: CollectionEditorRecord | null;
  images: readonly ProductEditorMedia[];
}>;

function publicMediaUrl(storageKey: string) {
  try { return mediaUrl(storageKey); } catch { return null; }
}

export async function getCollectionEditorData(collectionId?: string): Promise<CollectionEditorData> {
  const db = getDb();
  const [media, collection] = await Promise.all([
    db.mediaAsset.findMany({
      where: { approved: true, mimeType: { startsWith: "image/" } },
      orderBy: [{ updatedAt: "desc" }, { originalFilename: "asc" }],
      select: { id: true, originalFilename: true, alt: true, storageKey: true, mimeType: true },
    }),
    collectionId ? db.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true, name: true, slug: true, description: true, state: true, isFeatured: true,
        sortOrder: true, homepageOrder: true, coverMediaId: true, heroMediaId: true,
      },
    }) : null,
  ]);

  return {
    images: media.map((item) => ({
      id: item.id,
      label: item.alt.trim() || item.originalFilename,
      src: publicMediaUrl(item.storageKey),
      mimeType: item.mimeType,
    })),
    collection: collection ? {
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description ?? "",
      state: collection.state,
      isFeatured: collection.isFeatured,
      sortOrder: collection.sortOrder,
      homepageOrder: collection.homepageOrder,
      coverMediaId: collection.coverMediaId ?? "",
      heroMediaId: collection.heroMediaId ?? "",
    } : null,
  };
}
