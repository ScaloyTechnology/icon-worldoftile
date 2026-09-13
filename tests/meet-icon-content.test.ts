import assert from "node:assert/strict";
import test from "node:test";

import { companyContact, companyProfile } from "../src/content/company";
import { meetIconContent } from "../src/content/meet-icon";

test("Meet ICON uses the verified company-profile chronology", () => {
  assert.deepEqual(meetIconContent.journey.items.map((item) => item.year), ["1987", "1990", "1995", "2002", "2007", "2009", "2011", "2015", "2017", "2025", "2026"]);
  assert.equal(meetIconContent.journey.items[2]?.title, "DHUVA - MORBI / EVERSHINE CERA PVT. LTD.");
  assert.ok(meetIconContent.journey.items.every((item) => item.published));
});

test("verified profile lists have stable counts and exact claims", () => {
  assert.equal(companyProfile.pillars.length, 3);
  assert.equal(companyProfile.technologies.length, 6);
  assert.equal(companyProfile.qualityControls.length, 6);
  assert.equal(companyProfile.manufacturingProcess.length, 17);
  assert.equal(companyProfile.surfaces.length, 20);
  assert.equal(companyProfile.sizes.length, 18);
  assert.equal(companyProfile.markets.length, 64);
  assert.equal(companyProfile.suppliers.length, 6);
  assert.equal(companyProfile.sustainability[1].metric, "Approximately 33%");
  assert.equal(meetIconContent.finalCta.href, "/products");
});

test("final prompt contact data overrides the older profile contact panel", () => {
  assert.equal(companyContact.domestic.phoneHref, "tel:+918238049090");
  assert.equal(companyContact.domestic.emailHref, "mailto:inquiry@iconworldoftile.com");
  assert.equal(companyContact.export.phoneHref, "tel:+918758739191");
  assert.equal(companyContact.export.emailHref, "mailto:export@iconworldoftile.com");
  assert.equal(companyContact.units.length, 3);
  assert.deepEqual(companyContact.socials.map((item) => item.label), ["Instagram", "Facebook", "LinkedIn"]);
  assert.ok(companyContact.units.every((unit) => unit.mapUrl.startsWith("https://maps.app.goo.gl/")));
});
