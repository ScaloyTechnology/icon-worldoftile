import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(root, "home page use");
const outputDirectory = path.join(root, "public/assets/home/october-edit");
const catalogDirectory = path.join(root, ".local");
const files = (await readdir(sourceDirectory)).filter((file) => /\.(jpe?g|png|tiff?)$/i.test(file)).sort();

// Source-image catalog for art direction, not an application test or preview.
if (process.argv.includes("--catalog")) {
  await mkdir(catalogDirectory, { recursive: true });
  const cells = [];
  for (const [index, file] of files.entries()) {
    const source = path.join(sourceDirectory, file);
    const metadata = await sharp(source).metadata();
    console.log(`${index + 1}. ${file}: ${metadata.width} x ${metadata.height}`);
    const thumbnail = await sharp(source).rotate().resize(280, 230, { fit: "contain", background: "#eeeae4" }).png().toBuffer();
    const title = `${index + 1}. ${file.slice(0, 33)}`.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
    const label = Buffer.from(`<svg width="280" height="35"><rect width="280" height="35" fill="#eeeae4"/><text x="8" y="22" font-family="Arial" font-size="12" fill="#222">${title}</text></svg>`);
    const left = (index % 4) * 280;
    const top = Math.floor(index / 4) * 265;
    cells.push({ input: thumbnail, left, top }, { input: label, left, top: top + 230 });
  }
  await sharp({ create: { width: 1120, height: Math.ceil(files.length / 4) * 265, channels: 3, background: "#eeeae4" } })
    .composite(cells).webp({ quality: 90 }).toFile(path.join(catalogDirectory, "home-refresh-sources.webp"));
} else {
  await mkdir(outputDirectory, { recursive: true });
  const artwork = JSON.parse(await readFile(path.join(root, "src/content/homepage-artwork.json"), "utf8"));
  for (const item of artwork) {
    if (process.argv[2] && item.id !== process.argv[2]) continue;
    const original = path.join(sourceDirectory, item.source);
    // Retain the photograph's composition and native detail, without enlarging
    // smaller originals or applying artificial sharpening to the materials.
    await sharp(original).rotate().toColourspace("srgb")
      .resize({ width: 3200, withoutEnlargement: true })
      .webp({ quality: 95, effort: 5 })
      .toFile(path.join(outputDirectory, `${item.id}.webp`));
    if (item.crop) {
      const left = Math.round(item.width * item.crop[0]);
      const top = Math.round(item.height * item.crop[1]);
      const width = Math.min(item.width - left, Math.round(item.width * item.crop[2]));
      const height = Math.min(item.height - top, Math.round(item.height * item.crop[3]));
      await sharp(original).rotate().toColourspace("srgb")
        .extract({ left, top, width, height })
        .resize({ width: 1600, height: 1032, fit: "cover", withoutEnlargement: true })
        .webp({ quality: 95, effort: 5 })
        .toFile(path.join(outputDirectory, `${item.id}-detail.webp`));
    }
    console.log(`Prepared homepage artwork: ${item.id}`);
  }
}
