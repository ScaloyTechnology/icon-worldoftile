import assert from "node:assert/strict";
import test from "node:test";
import { chooseHomepageHeroCandidate } from "../src/lib/products/homepage-selector";
import { getMaterialSettingsForFinish, getTileProportions } from "../src/lib/products/material-settings";
import { curateWallTiles, homepageMaterialStudies } from "../src/lib/products/homepage-fallbacks";
import { heroTilePose, wallSlots } from "../src/lib/animation/material-choreography";

test("homepage hero selection follows the configured priority independent of input order", () => {
  const chosen = chooseHomepageHeroCandidate([
    { value: "featured", source: "featured-product" },
    { value: "collection", source: "configured-collection" },
    { value: "product", source: "configured-product" },
  ]);
  assert.deepEqual(chosen, { value: "product", source: "configured-product" });
});

test("wall curation preserves source priority, deduplicates media and bounds the payload", () => {
  const fallback = homepageMaterialStudies[0];
  if (!fallback) throw new Error("Expected at least one homepage material study");
  const selected = { ...fallback, id: "published", source: "database" as const };
  const result = curateWallTiles([[selected], homepageMaterialStudies]);
  assert.equal(result.length, 6);
  assert.equal(result[0]?.id, "published");
  assert.equal(new Set(result.map(tile => tile.texture.url)).size, 6);
  assert.equal(curateWallTiles([], 6).length, 0);
  assert.equal(curateWallTiles([[selected]], 6).length, 1);
});

test("the DOM and WebGL handoff pose is centered and the mixed wall slots never overlap", () => {
  const pose = heroTilePose(0.5, 1440, 900, 2);
  assert.equal(Math.abs(pose.x), 0);
  assert.equal(Math.abs(pose.y), 0);
  assert.equal(pose.width / pose.height, 2);
  const occupied = new Set<string>();
  for (const slot of wallSlots) for (let x = slot.x; x < slot.x + slot.w; x++) for (let y = slot.y; y < slot.y + slot.h; y++) {
    const cell = `${x},${y}`;
    assert.equal(occupied.has(cell), false);
    occupied.add(cell);
  }
  assert.equal(occupied.size, 12);
});

test("homepage hero selection skips unavailable candidates and can return no selection", () => {
  assert.deepEqual(chooseHomepageHeroCandidate([
    { value: "featured", source: "featured-product" },
    { value: null, source: "configured-product" },
  ]), { value: "featured", source: "featured-product" });
  assert.equal(chooseHomepageHeroCandidate([{ value: null, source: "configured-product" }]), null);
});

test("tile proportions use real dimensions and mark safe visual fallbacks", () => {
  const proportions = getTileProportions(200, 1200, 9);
  assert.equal(proportions.width / proportions.height, 1 / 6);
  assert.ok(Math.abs(proportions.depth / proportions.width - 9 / 200) < Number.EPSILON);
  assert.equal(proportions.usedFallbackDimensions, false);
  assert.equal(proportions.usedFallbackThickness, false);
  assert.equal(getTileProportions(null, null, null).usedFallbackDimensions, true);
  assert.equal(getTileProportions(-1, 0, 9, Number.NaN).width / getTileProportions(-1, 0, 9, Number.NaN).height, 2);
  assert.equal(getTileProportions(null, null, 9).usedFallbackThickness, true);
  assert.equal(getMaterialSettingsForFinish("polished").roughness, 0.2);
});
