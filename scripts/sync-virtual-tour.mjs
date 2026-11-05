// Vendor the standalone showroom into public assets for the Next.js site.
// Run from this repository: node scripts/sync-virtual-tour.mjs [source-directory]
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.resolve(process.argv[2] || path.join(projectRoot, "..", "360"));
const targetRoot = path.join(projectRoot, "public", "virtual-tour");
const manifestPath = path.join(projectRoot, "src", "data", "virtual-tour-rooms.json");

async function copy(relativePath) {
  const source = path.join(sourceRoot, relativePath);
  const target = path.join(targetRoot, relativePath);
  await mkdir(path.dirname(target), { recursive: true });
  await copyFile(source, target);
}

const { rooms } = await import(pathToFileURL(path.join(sourceRoot, "js", "rooms.js")));
const roomList = Object.values(rooms)
  .filter((room) => room.panorama && !room.pending)
  .map(({ id, name }) => ({ id, slug: id === "lobby" ? "main-lobby" : id, name }));
const assetPaths = new Set(["assets/images/ui/icon-logo-horizontal.png"]);

for (const room of Object.values(rooms)) {
  for (const panorama of [room.panorama, room.panoramaHighRes]) {
    if (panorama) assetPaths.add(panorama.replace(/^\.\//, ""));
  }
}

const productSource = await readFile(path.join(sourceRoot, "js", "products.js"), "utf8");
for (const match of productSource.matchAll(/\.\/assets\/images\/products\/[^"']+/g)) {
  assetPaths.add(match[0].slice(2));
}

await Promise.all([
  "index.html",
  "css/virtual-tour.css",
  "js/app.js",
  "js/collection-stories.js",
  "js/controls.js",
  "js/hotspots.js",
  "js/panorama.js",
  "js/products.js",
  "js/rooms.js",
  "js/transitions.js",
  ...assetPaths,
].map(copy));

await mkdir(path.dirname(manifestPath), { recursive: true });
await writeFile(manifestPath, `${JSON.stringify(roomList, null, 2)}\n`);
console.log(`Synced ${roomList.length} rooms and ${assetPaths.size} image assets into public/virtual-tour.`);
