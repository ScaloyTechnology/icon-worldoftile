import artwork from "./homepage-artwork.json";
import type { HomeMedia } from "@/types/home";

// An explicit artwork release replaces the previous homepage image selection.
// Subsequent admin saves use this revision and retain their custom selections.
export const HOMEPAGE_ARTWORK_REVISION = 20261005;

export function homepageArtwork(id: string, detail = false): HomeMedia {
  const item = artwork.find((candidate) => candidate.id === id);
  if (!item) throw new Error(`Unknown homepage artwork: ${id}`);
  const width = Math.min(3200, item.width);
  return {
    src: `/assets/home/october-edit/${id}${detail ? "-detail" : ""}.webp`,
    alt: detail ? `${item.alt} — surface detail` : item.alt,
    placeholderLabel: item.alt,
    tone: "sand",
    position: detail ? "50% 50%" : item.position,
    // Detail crops retain their native resolution when smaller than 1600px.
    width: detail ? undefined : width,
    height: detail ? undefined : Math.round(item.height * width / item.width),
  };
}

export const homepageHeroArtwork = [
  { id: "matt", title: "Matt", artwork: "rapolano-natural" },
  { id: "high-gloss", title: "High gloss", artwork: "classico-bianco" },
  { id: "carving", title: "Carving", artwork: "fluted-travertine-silver" },
  { id: "double-digital", title: "Double digital", artwork: "romantic-nero-decor" },
  { id: "gvt", title: "GVT", artwork: "vista-diamond-decor" },
  { id: "pgvt", title: "PGVT", artwork: "onyx-gin" },
  { id: "full-body", title: "Full body", artwork: "vista-illusion" },
  { id: "porcelain", title: "Porcelain", artwork: "sandy-ice-blue-petal" },
] as const;

export const homepageSurfaceArtwork = [
  "liora-plum", "onyx-celeste", "boat-1006", "sandy-peach-petal",
  "vista-diamond-decor", "onyx-gin", "vista-illusion", "weave",
] as const;
