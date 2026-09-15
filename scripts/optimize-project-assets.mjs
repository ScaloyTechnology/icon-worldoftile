import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("photos/drive-download-20260910T214746Z-1-001");
const detailSourceRoot = path.resolve("photos/200X1200-20260910T201837Z-1-001/200X1200/PREVIEW");
const outputRoot = path.resolve("public/assets/projects");

export const projectAssetManifest = [
  ["ENIGMA_LINE_STONE_MIST.jpg", "hero-enigma-line-stone-mist.webp", 2200],
  ["ETERNITY MOCHA + ETERNITY MIST.jpg", "featured-eternity-mocha-mist.webp", 2000],
  ["AQUA_STONE_GRAPHITE.jpg", "featured-aqua-stone-graphite.webp", 1100],
  ["ARTICA BEIGE.jpg", "study-artica-beige.webp", 1600],
  ["COTTO OLIVE PREVIEW.jpg", "study-cotto-olive.webp", 1200],
  ["Avenue grey.jpg", "study-avenue-grey.webp", 1600],
  ["COTTO RED + AURUM TACO.jpg", "study-cotto-red-aurum.webp", 1600],
  ["PLUTONIC TEAL GRANDE +AQUA STONE SILVER.jpg", "study-plutonic-teal.webp", 1600],
  ["SUNGLOW YELLOW + HERITAGE FLORAL BASE.jpg", "study-sunglow-heritage.webp", 1800],
  ["ARTICA IVORY.jpg", "gallery-artica-ivory.webp", 1300],
  ["ARTICA SILVER+GRAPHITE.jpg", "gallery-artica-silver-graphite.webp", 1600],
  ["Cotto sand final_.jpg", "gallery-cotto-sand.webp", 1500],
  ["EVEREST TAUPE FINAL.jpg", "gallery-everest-taupe.webp", 1600],
  ["POLAR GRIS.jpg", "gallery-polar-gris.webp", 1400],
  ["FOREST GREEN+YELLOW+HERITAGE SQUARE BASE.jpg", "story-forest-heritage.webp", 1300],
  ["POLAR PEARL+CHARCOAL.jpg", "story-polar-pearl-charcoal.webp", 1400],
  ["STAR_MOCHA.jpg", "story-star-mocha.webp", 1500],
];

export const projectDetailAssetManifest = [
  ["01 HARAMAIN.jpg", "detail-haramain-01.webp", 2000],
  ["017 HARAMAIN.jpg", "detail-haramain-017.webp", 1800],
  ["019 HARAMAIN.jpg", "detail-haramain-019.webp", 2000],
  ["020 HARAMAIN.jpg", "detail-haramain-020.webp", 1800],
  ["08 HARAMAIN.jpg", "detail-haramain-08.webp", 2000],
  ["18001_FINAL.jpg", "detail-18001-final.webp", 2000],
];

await fs.mkdir(outputRoot, { recursive: true });

for (const [source, output, width] of projectAssetManifest) {
  await sharp(path.join(sourceRoot, source))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(path.join(outputRoot, output));
}

for (const [source, output, width] of projectDetailAssetManifest) {
  await sharp(path.join(detailSourceRoot, source))
    .rotate()
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, effort: 5, smartSubsample: true })
    .toFile(path.join(outputRoot, output));
}

console.log(`Optimized ${projectAssetManifest.length + projectDetailAssetManifest.length} project assets.`);
