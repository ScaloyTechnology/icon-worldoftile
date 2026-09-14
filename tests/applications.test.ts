import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fallbackApplications } from "@/content/applications";
import {
  applicationMediaAreUnique,
  buildApplicationProductHref,
  normalizePublishedApplications,
} from "@/lib/applications/application-data";
import type { ProductFilterGroup } from "@/types/products";

test("fallback applications follow the client-required order", () => {
  assert.deepEqual(fallbackApplications.map((application) => application.name), [
    "Residential", "Commercial", "Hospitality", "Retail", "Office", "Outdoor",
  ]);
  assert.deepEqual(fallbackApplications.map((application) => application.order), [0, 1, 2, 3, 4, 5]);
});

test("normalization accepts only known published applications and preserves required ordering", () => {
  const rows = [
    { id: "outdoor-db", slug: "outdoor", name: "Outdoor", introduction: "Published outdoor copy", state: "PUBLISHED" },
    { id: "unknown", slug: "industrial", name: "Industrial", state: "PUBLISHED" },
    { id: "residential-draft", slug: "residential", name: "Draft", state: "DRAFT" },
    { id: "retail-db", slug: "retail", name: "Retail environments", state: "PUBLISHED" },
    { id: "retail-duplicate", slug: "retail", name: "Duplicate", state: "PUBLISHED" },
  ];
  const result = normalizePublishedApplications(rows, fallbackApplications);
  assert.deepEqual(result.map((application) => application.slug), ["retail", "outdoor"]);
  assert.equal(result[0]?.name, "Retail environments");
  assert.equal(result[1]?.shortDescription, "Published outdoor copy");
});

test("database copy retains the real client-media fallback when media is absent", () => {
  const residential = fallbackApplications[0]!;
  const [normalized] = normalizePublishedApplications([
    { id: "residential-db", slug: "residential", name: "Residential", introduction: "Approved introduction", state: "PUBLISHED" },
  ], fallbackApplications);
  assert.equal(normalized?.heroMedia.src, residential.heroMedia.src);
  assert.equal(normalized?.galleryMedia[0]?.src, residential.galleryMedia[0]?.src);
});

test("application product links use the existing repeatable product query serializer", () => {
  const groups = [{
    key: "applications",
    label: "Application",
    param: "application",
    description: "Published mappings",
    options: [{ value: "Residential", label: "Residential" }],
  }] as const satisfies readonly ProductFilterGroup[];
  assert.equal(buildApplicationProductHref("Residential", groups), "/products?application=Residential");
  assert.equal(buildApplicationProductHref("Hospitality", groups), "/products");
});

test("application fallback and asset manifest do not repeat media", () => {
  assert.equal(applicationMediaAreUnique(fallbackApplications), true);
  const manifest = JSON.parse(readFileSync("scripts/application-assets.json", "utf8")) as Array<{ source: string; output: string }>;
  assert.equal(manifest.length, 13);
  assert.equal(new Set(manifest.map((asset) => asset.source)).size, manifest.length);
  assert.equal(new Set(manifest.map((asset) => asset.output)).size, manifest.length);
});
