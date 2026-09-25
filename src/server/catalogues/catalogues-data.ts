import "server-only";

import { cache } from "react";

import { clientAssets } from "@/content/assets";
import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import type { PublicCatalogue } from "@/types/catalogues";

const fallbackCatalogues: readonly PublicCatalogue[] = [
  {
    id: "surface-collection",
    slug: "surface-collection",
    title: "Surface Collection",
    edition: "Architectural surfaces / 2026",
    cover: { src: clientAssets.opal.src!, alt: clientAssets.opal.alt, width: 1200, height: 1600 },
    available: false,
    fileLabel: "PDF edition",
  },
  {
    id: "material-edition",
    slug: "material-edition",
    title: "Material Edition",
    edition: "Texture and finish study / 2026",
    cover: { src: clientAssets.mystone.src!, alt: clientAssets.mystone.alt, width: 1200, height: 1600 },
    available: false,
    fileLabel: "PDF edition",
  },
  {
    id: "spaces-in-context",
    slug: "spaces-in-context",
    title: "Spaces in Context",
    edition: "Application catalogue / 2026",
    cover: { src: clientAssets.crossCut.src!, alt: clientAssets.crossCut.alt, width: 1200, height: 1600 },
    available: false,
    fileLabel: "PDF edition",
  },
] as const;

function readableBytes(value: bigint) {
  const megabytes = Number(value) / (1024 * 1024);
  return Number.isFinite(megabytes) && megabytes > 0 ? `${megabytes.toFixed(megabytes >= 10 ? 0 : 1)} MB PDF` : "PDF edition";
}

export const getPublicCatalogues = cache(async (): Promise<readonly PublicCatalogue[]> => {
  if (!process.env.DATABASE_URL) return fallbackCatalogues;
  try {
    const rows = await getDb().catalogue.findMany({
      where: { state: "PUBLISHED", coverId: { not: null } },
      orderBy: [{ publishedAt: "desc" }, { title: "asc" }],
      include: { cover: true, pdf: true },
    });
    const catalogues = rows.flatMap((row) => {
      if (!row.cover?.approved) return [];
      try {
        const pdfAvailable = Boolean(row.pdf?.approved && row.pdf.mimeType === "application/pdf");
        return [{
          id: row.id,
          slug: row.slug,
          title: row.title,
          edition: row.publishedAt ? `Digital edition / ${row.publishedAt.getFullYear()}` : "Digital catalogue",
          cover: {
            src: mediaUrl(row.cover.storageKey),
            alt: row.cover.alt || `${row.title} catalogue cover`,
            width: row.cover.width ?? 1200,
            height: row.cover.height ?? 1600,
          },
          available: pdfAvailable,
          fileLabel: row.pdf ? readableBytes(row.pdf.byteSize) : "PDF edition",
        } satisfies PublicCatalogue];
      } catch {
        return [];
      }
    });
    return catalogues.length ? catalogues : fallbackCatalogues;
  } catch (cause) {
    console.error("Public catalogues could not be loaded", cause);
    return fallbackCatalogues;
  }
});
