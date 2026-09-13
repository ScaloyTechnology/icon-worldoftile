import type { HomepageWallTile } from "./homepage-types";

// Visual names describe reviewed crops only. Never publish these as product specs.
const studies = [
  ["austin-silver", "Silver veined stone study", 920, 460],
  ["fenix-cream", "Warm cream study", 900, 450],
  ["travertine-sand", "Linear sand study", 580, 290],
  ["polar-charcoal", "Charcoal stone study", 1280, 640],
  ["star-grey", "Soft grey study", 520, 260],
  ["stars-bianco", "Mineral white study", 1280, 640],
] as const;

export const homepageMaterialStudies: HomepageWallTile[] = studies.map(([name, label, width, height]) => ({
  id: `study-${name}`, label, slug: null, collection: null,
  texture: { url: `/media/material-${name}.webp`, alt: label, width, height },
  widthMm: null, heightMm: null, thicknessMm: null, finish: null, surface: null,
  source: "development-fallback",
}));

/** Stable priorities in, unique material URLs out; no random ordering or repeat fill. */
export function curateWallTiles(groups: HomepageWallTile[][], limit = 6) {
  const urls = new Set<string>();
  return groups.flat().filter(tile => {
    if (urls.has(tile.texture.url)) return false;
    urls.add(tile.texture.url);
    return true;
  }).slice(0, Math.min(12, Math.max(0, limit)));
}
