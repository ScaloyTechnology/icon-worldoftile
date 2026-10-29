import { readdir, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Optional, run manually: node scripts/optimize-frames.mjs
// Afterwards set FRAME_SOURCE.extension to "webp" in frame-hero.tsx.
// Original PNG files are retained, and no application configuration is changed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "Frames");
const destination = path.join(root, "public", "frames");
await mkdir(destination, { recursive: true });
const files = (await readdir(source)).filter(name => /^A\.\d{5}\.png$/i.test(name)).sort();
if (!files.length) throw new Error("No sequence PNGs found in Frames/.");
let next = 0;
let completed = 0;
await Promise.all(Array.from({ length: 2 }, async () => {
  while (next < files.length) {
    const name = files[next++];
    await sharp(path.join(source, name))
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 75, effort: 5 })
      .toFile(path.join(destination, name.replace(/\.png$/i, ".webp")));
    console.log(`${++completed}/${files.length}: ${name}`);
  }
}));
console.log('Finished. Set FRAME_SOURCE.extension to "webp" to serve the optimized frames.');
