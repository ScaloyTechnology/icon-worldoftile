import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Asset preparation only: originals remain untouched. No synthetic sharpening
// or enlargement. A 1:2 crop preserves enough horizontal detail for the expanded
// desktop panel; the narrower resting frame simply conceals its outer edges.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sources = JSON.parse(await readFile(path.join(root, "src/content/surface-portraits.json"), "utf8"));
const output = path.join(root, "public/assets/home/surface-portraits");
await mkdir(output, { recursive: true });

for (const item of sources) {
  const source = path.join(root, "public", item.source.slice(1));
  const { width, height } = await sharp(source).metadata();
  if (!width || !height) throw new Error(`Missing source dimensions: ${item.slug}`);
  const cropWidth = Math.min(width, Math.floor(height / 2));
  const cropHeight = cropWidth * 2;
  const left = Math.round((width - cropWidth) * item.position[0]);
  const top = Math.round((height - cropHeight) * item.position[1]);
  const result = await sharp(source)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .resize({ width: Math.min(960, cropWidth), withoutEnlargement: true })
    .webp({ quality: 95, effort: 5 })
    .toFile(path.join(output, `${item.slug}.webp`));
  console.log(`${item.slug}: ${result.width}x${result.height}, ${Math.round(result.size / 1024)} KB`);
}
