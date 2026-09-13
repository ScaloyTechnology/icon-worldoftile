import assert from "node:assert/strict";
import test from "node:test";
import { resolveSiteUrl } from "../src/lib/seo";

test("site URL accepts Hostinger hostnames without a protocol", () => {
  assert.equal(
    resolveSiteUrl("deeppink-raccoon-748419.hostingersite.com"),
    "https://deeppink-raccoon-748419.hostingersite.com/",
  );
});

test("site URL keeps explicit local and production origins", () => {
  assert.equal(resolveSiteUrl("http://localhost:3000"), "http://localhost:3000/");
  assert.equal(resolveSiteUrl("https://icon.example/products"), "https://icon.example/products");
});

