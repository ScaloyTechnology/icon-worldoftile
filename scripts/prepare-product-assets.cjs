const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const manifest = require("./product-assets.json");

async function main() {
  const root = path.resolve(__dirname, "..");
  const sourceRoot = path.join(root, "photos");
  const outputRoot = path.join(root, "public", "assets", "products");
  const sourceHashes = new Set();

  for (const asset of manifest) {
    const source = path.resolve(sourceRoot, asset.source);
    const output = path.resolve(outputRoot, asset.output);
    if (!source.startsWith(sourceRoot + path.sep) || !output.startsWith(outputRoot + path.sep)) {
      throw new Error(`Asset path escaped its allowed root: ${asset.id}`);
    }
    if (!fs.existsSync(source)) throw new Error(`Missing client source: ${asset.source}`);

    const original = fs.readFileSync(source);
    const before = crypto.createHash("sha256").update(original).digest("hex");
    if (sourceHashes.has(before)) throw new Error(`Duplicate source selected: ${asset.source}`);
    sourceHashes.add(before);

    const metadata = await sharp(original).metadata();
    const optimized = await sharp(original)
      .rotate()
      .resize({ width: asset.width, withoutEnlargement: true })
      .webp({ quality: 84, effort: 5, smartSubsample: true })
      .toBuffer();

    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, optimized);
    const after = crypto.createHash("sha256").update(fs.readFileSync(source)).digest("hex");
    if (before !== after) throw new Error(`Client source changed during optimization: ${asset.source}`);

    console.log(`${asset.source} (${metadata.width}x${metadata.height}) -> ${asset.output} (${Math.round(optimized.length / 1024)} KB)`);
  }

  console.log(`Prepared ${manifest.length} unique client-derived product assets; originals unchanged.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
