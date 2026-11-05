import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const viewerRoot = path.join(projectRoot, "public", "virtual-tour");
const manifest = JSON.parse(await readFile(path.join(projectRoot, "src/data/virtual-tour-rooms.json"), "utf8"));
const roomSource = await readFile(path.join(viewerRoot, "js/rooms.js"), "utf8");
const productSource = await readFile(path.join(viewerRoot, "js/products.js"), "utf8");
const html = await readFile(path.join(viewerRoot, "index.html"), "utf8");

assert.ok(manifest.length > 1, "Room manifest is empty");
assert.equal(new Set(manifest.map((room) => room.slug)).size, manifest.length, "Duplicate room slugs");
assert.equal(new Set(manifest.map((room) => room.id)).size, manifest.length, "Duplicate room IDs");
assert.ok(manifest.some((room) => room.id === "lobby" && room.slug === "main-lobby"));
for (const room of manifest) {
  assert.match(roomSource, new RegExp(`id: "${room.id}"`), `Missing room ${room.id}`);
}

const requiredFiles = new Set([
  "css/virtual-tour.css",
  "js/app.js",
  "js/collection-stories.js",
  "js/controls.js",
  "js/hotspots.js",
  "js/panorama.js",
  "js/products.js",
  "js/rooms.js",
  "js/transitions.js",
  ...[roomSource, productSource, html].flatMap((content) =>
    [...content.matchAll(/\.\/assets\/images\/[^"'\s]+/g)].map((match) => match[0].slice(2))),
]);
for (const file of requiredFiles) {
  await access(path.join(viewerRoot, file));
}

console.log(`Verified ${manifest.length} shareable rooms and ${requiredFiles.size} viewer files.`);
