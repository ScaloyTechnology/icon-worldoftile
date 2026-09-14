const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");
const manifest = require("./application-assets.json");

async function main() {
  const root = path.resolve(__dirname, "..");
  const sourceRoot = path.join(root, "photos");
  const outputRoot = path.join(root, "public", "assets");

  for (const asset of manifest) {
    const source = path.resolve(sourceRoot, asset.source);
    const output = path.resolve(outputRoot, asset.output);
    if (!source.startsWith(`${sourceRoot}${path.sep}`) || !output.startsWith(`${outputRoot}${path.sep}`)) {
      throw new Error("Asset path escaped its approved library");
    }

    const original = fs.readFileSync(source);
    const sourceHash = crypto.createHash("sha256").update(original).digest("hex");
    const optimized = await sharp(original)
      .rotate()
      .resize({ width: asset.width, withoutEnlargement: true })
      .webp({ quality: asset.quality, effort: 5, smartSubsample: true })
      .toBuffer();

    fs.mkdirSync(path.dirname(output), { recursive: true });
    if (fs.existsSync(output) && !fs.readFileSync(output).equals(optimized)) {
      throw new Error(`Refusing to overwrite a different asset: ${asset.output}`);
    }
    if (!fs.existsSync(output)) fs.writeFileSync(output, optimized, { flag: "wx" });
    const currentHash = crypto.createHash("sha256").update(fs.readFileSync(source)).digest("hex");
    if (currentHash !== sourceHash) throw new Error(`Source changed while processing: ${asset.source}`);
    console.log(`${asset.source} -> ${asset.output} (${Math.round(optimized.length / 1024)} KB)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
