import type { HomeMedia } from "@/types/home";

// Canonical approved public copies; provenance and dimensions: docs/ASSET_MAP.md.
// Imagery does not verify specifications, installations or company history.
const media = (file: string, alt: string, position = "50% 50%"): HomeMedia => ({
  src: `/assets/${file}`, alt, position,
  placeholderLabel: "Approved client visualization", tone: "stone",
});

export const clientAssets = {
  crossCut: media("collections/cross-cut-vein-cut-beige.jpg", "Sunlit beige tiled living space with timber chairs and an open garden doorway", "58% 48%"),
  austin: media("collections/austin-silver.jpg", "Silver-grey tiled living room with low round tables and dark timber cabinetry"),
  opal: media("collections/mystone-opal-spectra-earth.jpg", "Pale textured dining space with woven pendants and palm shadows", "52% 48%"),
  fenix: media("collections/fenix-crema.jpg", "Cream bedroom with a broad tiled wall, low bed and timber armchair"),
  travertino: media("surfaces/travertino-rome-decor.jpg", "Horizontal beige stone-like bands and textured tile detail above a washbasin", "60% 20%"),
  cotto: media("collections/cotto-gold.jpg", "Ochre tiled cafe with a textured feature wall and timber chairs"),
  mystone: media("surfaces/mystone-grey.jpg", "Grey floor tile detail beside a sofa and circular coffee table", "50% 72%"),
  star: media("collections/star-nero.jpg", "Dark tiled reception space with a relief-pattern wall and teal seating"),
  denim: media("collections/denim-blue-royal-floral.jpg", "Blue bathroom with a colourful floral tile panel and timber vanity"),
  commercial: media("applications/aqua-stone-taupe-retail.jpg", "Taupe tiled shop with timber counters and a terracotta accent wall"),
  hospitality: media("applications/serena-graphite-restaurant.jpg", "Restaurant with graphite surfaces, a brick arch and pale timber seating"),
  retail: media("applications/marmi-travertine-boutique.jpg", "Light tiled clothing boutique with a central display table and tall windows"),
  office: media("applications/polar-sand-charcoal-lobby.jpg", "Sand-coloured tiled lift lobby with dark floor tiles and a short stair"),
  outdoor: media("applications/enigma-grey-courtyard.jpg", "Open-air courtyard with grey tiled walls, a corner sofa and trees"),
} satisfies Record<string, HomeMedia>;
