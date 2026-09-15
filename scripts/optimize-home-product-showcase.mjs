import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outputDirectory = path.join(root, "public", "assets", "home", "product-showcase");

const assets = [
  {
    source: "photos/200X1200-20260910T201837Z-1-002/200X1200/JPG/PECAN WHITE/PECAN WHITE (7).jpg",
    output: "pecan-white.webp",
    rotate: 90,
    width: 900,
    height: 1800,
  },
  {
    source: "photos/DENIM BLUE + ROYAL FLORAL.jpg",
    output: "denim-blue-royal-floral.webp",
    extract: { left: 400, top: 650, width: 1000, height: 1500 },
    width: 1000,
    height: 1500,
  },
  {
    source: "photos/COTTO GOLD PREVIEW.jpg",
    output: "cotto-gold.webp",
    extract: { left: 0, top: 0, width: 1000, height: 1500 },
    width: 1000,
    height: 1500,
  },
  {
    source: "photos/STAR_NERO.jpg",
    output: "star-nero.webp",
    extract: { left: 2350, top: 450, width: 1500, height: 2250 },
    width: 1000,
    height: 1500,
  },
  {
    source: "photos/200X1200-20260910T201837Z-1-006/200X1200/JPG/CLASSIC BLACK/CLASSIC BLACK (9).jpg",
    output: "classic-black.webp",
    rotate: 90,
    width: 900,
    height: 1800,
  },
];

await fs.mkdir(outputDirectory, { recursive: true });

for (const asset of assets) {
  let pipeline = sharp(path.join(root, asset.source)).rotate(asset.rotate ?? 0);
  if (asset.extract) pipeline = pipeline.extract(asset.extract);
  await pipeline
    .resize(asset.width, asset.height, { fit: "cover", position: "centre", withoutEnlargement: true })
    .webp({ quality: 84, effort: 5, smartSubsample: true })
    .toFile(path.join(outputDirectory, asset.output));
}

console.log(`Created ${assets.length} product-showcase assets.`);
