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

export async function getCollectionEditorData(collectionId?: string): Promise<CollectionEditorData> {
  const db = getDb();
  const collection = collectionId ? await db.collection.findUnique({
      where: { id: collectionId },
      select: {
        id: true, name: true, slug: true, description: true, state: true, isFeatured: true,
        sortOrder: true, homepageOrder: true, coverMediaId: true, heroMediaId: true,
      },
    }) : null;

  const mediaIds = collection ? [collection.coverMediaId, collection.heroMediaId].filter((id): id is string => Boolean(id)) : [];
  const images = mediaIds.length ? await db.mediaAsset.findMany({
    where: { id: { in: mediaIds }, approved: true },
    select: { id: true, originalFilename: true, alt: true, storageKey: true, mimeType: true },
  }) : [];
  return {
    images: images.map((image) => ({ id: image.id, label: image.alt.trim() || image.originalFilename, src: mediaUrl(image.storageKey), mimeType: image.mimeType })),
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
