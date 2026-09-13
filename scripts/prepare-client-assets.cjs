// Explicit client-approved optimization workflow. Never writes to photos/.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const sharp = require("sharp");
const manifest = require("./client-assets.json");

async function main() {
  const root = path.resolve(__dirname, "..");
  const sourceRoot = path.join(root, "photos");
  const outputRoot = path.join(root, "public", "assets");
  let sourceBytes = 0;
  let outputBytes = 0;
  for (const asset of manifest) {
    const source = path.resolve(sourceRoot, asset.source);
    const output = path.resolve(outputRoot, asset.output);
    if (!source.startsWith(sourceRoot + path.sep) || !output.startsWith(outputRoot + path.sep)) throw new Error("Asset path escaped its library");
    const original = fs.readFileSync(source);
    const before = crypto.createHash("sha256").update(original).digest("hex");
    const metadata = await sharp(original).metadata();
    const optimized = await sharp(original).rotate().resize({ width: asset.width, withoutEnlargement: true }).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
    fs.mkdirSync(path.dirname(output), { recursive: true });
    if (fs.existsSync(output) && !fs.readFileSync(output).equals(optimized)) throw new Error(`Refusing to overwrite a different asset: ${asset.output}. Choose a new filename.`);
    if (!fs.existsSync(output)) fs.writeFileSync(output, optimized, { flag: "wx" });
    if (crypto.createHash("sha256").update(fs.readFileSync(source)).digest("hex") !== before) throw new Error("Source changed during copy");
    sourceBytes += original.length;
    outputBytes += optimized.length;
    console.log(`${asset.source} (${metadata.width}x${metadata.height}) -> ${asset.output}: ${Math.round(optimized.length / 1024)} KB; original unchanged`);
  }
  console.log(`Selected original bytes: ${sourceBytes}; production bytes: ${outputBytes}`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
