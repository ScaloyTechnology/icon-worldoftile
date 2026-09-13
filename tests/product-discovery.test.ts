import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { productCollections, productFilterGroups, products } from "@/content/products";
import {
  countProductFilters, createEmptyProductFilters, filterProducts, parseProductDiscoveryState,
  serializeProductDiscoveryState, sortProducts, toggleProductFilter,
} from "@/lib/products/filter-products";

test("parses only valid, repeatable discovery parameters", () => {
  const params = new URLSearchParams("collection=mystone&colour=Grey&colour=Made+up&look=Stone&q=grey&sort=name");
  const state = parseProductDiscoveryState(params, productFilterGroups, productCollections);
  assert.equal(state.collectionId, "mystone");
  assert.deepEqual(state.filters.colors, ["Grey"]);
  assert.deepEqual(state.filters.looks, ["Stone"]);
  assert.equal(state.query, "grey");
  assert.equal(state.sort, "name");
});

test("serializes shareable state and survives a round trip", () => {
  const filters = toggleProductFilter(toggleProductFilter(createEmptyProductFilters(), "colors", "Grey"), "looks", "Stone");
  const value = serializeProductDiscoveryState({ filters, collectionId: "mystone", query: "tile", sort: "name" }, productFilterGroups, productCollections);
  const parsed = parseProductDiscoveryState(new URLSearchParams(value), productFilterGroups, productCollections);
  assert.deepEqual(parsed, { filters, collectionId: "mystone", query: "tile", sort: "name" });
});

test("combines multi-select within a group and ANDs across groups", () => {
  let filters = toggleProductFilter(createEmptyProductFilters(), "colors", "Grey");
  filters = toggleProductFilter(filters, "colors", "Nero");
  filters = toggleProductFilter(filters, "looks", "Stone");
  const result = filterProducts(products, filters, null);
  assert.ok(result.some((item) => item.name === "Mystone Grey"));
  assert.ok(result.some((item) => item.name === "Mystone Nero + Grey"));
  assert.ok(result.every((item) => item.looks.includes("Stone")));
});

test("search, count, clear and A-Z sort are deterministic", () => {
  const filters = toggleProductFilter(createEmptyProductFilters(), "colors", "White");
  assert.equal(countProductFilters(filters, "austin"), 2);
  assert.equal(countProductFilters(createEmptyProductFilters(), null), 0);
  assert.deepEqual(filterProducts(products, createEmptyProductFilters(), null, "pecan wood").map((item) => item.name), ["Pecan White"]);
  const sorted = sortProducts(products, "name");
  assert.equal(sorted[0]?.name, "Austin Silver");
});

test("fallback contains unique client products without fabricated technical mappings", () => {
  assert.equal(products.length, 18);
  assert.equal(new Set(products.map((item) => item.primaryMedia.src)).size, products.length);
  assert.ok(products.every((item) => item.source === "development-fallback"));
  assert.ok(products.every((item) => !item.finishes.length && !item.surfaces.length && !item.applications.length));
});

test("asset manifest has unique source and output paths", () => {
  const manifest = JSON.parse(readFileSync("scripts/product-assets.json", "utf8")) as Array<{ source: string; output: string }>;
  assert.equal(manifest.length, 18);
  assert.equal(new Set(manifest.map((item) => item.source)).size, manifest.length);
  assert.equal(new Set(manifest.map((item) => item.output)).size, manifest.length);
});
