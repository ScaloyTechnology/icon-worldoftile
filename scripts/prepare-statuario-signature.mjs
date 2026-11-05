// Optimize the supplied 16K renders for the standalone 360 tour before syncing.
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inputRoot = path.join(websiteRoot, "STATUARIO SIGNATURE");
const tourImages = path.resolve(websiteRoot, "..", "360", "assets", "images");
const panoramaRoot = path.join(tourImages, "panoramas");
const productRoot = path.join(tourImages, "products");
await Promise.all([mkdir(panoramaRoot, { recursive: true }), mkdir(productRoot, { recursive: true })]);

const cameras = [
  ["STATUARIO SIGNATURE_1.jpg", "statuario-signature-cam-1"],
  ["1/STATUARIO SIGNATURE_2.jpg", "statuario-signature-cam-2"],
  ["2/STATUARIO SIGNATURE_3.jpg", "statuario-signature-cam-3"],
  ["3/STATUARIO SIGNATURE_4.jpg", "statuario-signature-cam-4"],
];

for (const [relativePath, name] of cameras) {
  const input = path.join(inputRoot, relativePath);
  for (const [width, suffix, quality] of [[4096, "360", 86], [8192, "8192", 88]]) {
    await sharp(input)
      .resize({ width, withoutEnlargement: true })
      .jpeg({ quality, mozjpeg: true })
      .toFile(path.join(panoramaRoot, `${name}-${suffix}.jpg`));
  }
  console.log(`Prepared ${name} at 4K and 8K`);
}

const closeups = [
  ["1/STATUARIO SIGNATURE_2 CLOSEUP.jpg", "statuario-signature-cam-2-detail-1.jpg"],
  ["1/STATUARIO SIGNATURE_2.1_CLOSEUP.jpg", "statuario-signature-cam-2-detail-2.jpg"],
  ["2/STATUARIO SIGNATURE_3 CLOSEUP.jpg", "statuario-signature-cam-3-detail-1.jpg"],
  ["2/STATUARIO SIGNATURE_3.1 CLOSEUP.jpg", "statuario-signature-cam-3-detail-2.jpg"],
  ["3/STATUARIO SIGNATURE_4 CLOSEUP.jpg", "statuario-signature-cam-4-detail-1.jpg"],
  ["3/STATUARIO SIGNATURE_4.1 CLOSEUP.jpg", "statuario-signature-cam-4-detail-2.jpg"],
];

for (const [relativePath, filename] of closeups) {
  await sharp(path.join(inputRoot, relativePath))
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(productRoot, filename));
}
console.log(`Prepared ${closeups.length} product close-ups`);
