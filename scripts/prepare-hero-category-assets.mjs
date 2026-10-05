import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Image preparation only. Keep the original photographs and other page assets intact.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "public/assets/home/category-hero");
const categories = [
  { id: "matt", interior: "MYSTONE OPAL+SPECTRA EARTH.jpg", product: "MYSTONE JAIPUR.jpg" },
  { id: "high-gloss", interior: "DENIM BLUE + ROYAL FLORAL.jpg", crop: { left: 400, top: 650, width: 1000, height: 1500 } },
  { id: "carving", interior: "TRAVERTINO ROME + DECOR.jpg" },
  { id: "double-digital", interior: "STAR_NERO.jpg", crop: { left: 2350, top: 450, width: 1500, height: 2250 } },
  { id: "gvt", interior: "AUSTIN_SILVER.jpg" },
  { id: "pgvt", interior: "MYSTONE GREY.jpg" },
  { id: "full-body", interior: "FENIX CREMA.jpg" },
  { id: "porcelain", interior: "CROSS_CUT&VIEN_CUT_BEIGE.jpg", product: "MARMI_CARRARA.jpg" },
];

await mkdir(output, { recursive: true });
for (const category of categories) {
  // Full-width originals replace the narrow, previously downsampled portrait crops.
  await sharp(path.join(root, "photos", category.interior))
    .rotate()
    .resize({ width: 3200, withoutEnlargement: true })
    .webp({ quality: 95, effort: 5 })
    .toFile(path.join(output, `${category.id}-interior.webp`));

  let product = sharp(path.join(root, "photos", category.product ?? category.interior)).rotate();
  if (category.crop) product = product.extract(category.crop);
  // Match the rendered face before responsive optimization, rather than downloading
  // a narrow portrait and enlarging its middle to cover a landscape tile.
  await product
    .resize({ width: 1600, height: 1032, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 95, effort: 5 })
    .toFile(path.join(output, `${category.id}-product.webp`));
  console.log(`Prepared ${category.id} hero photographs.`);
}
