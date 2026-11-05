import assert from "node:assert/strict";
import { chromium } from "playwright-core";

const base = process.env.SITE_URL ?? "http://127.0.0.1:3000";
const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader"] });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}/360/main-lobby`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const tour = page.frameLocator('iframe[title="ICON 360-degree virtual showroom"]');
  await tour.locator("#room-title").waitFor();
  await tour.locator(".loader.is-complete").waitFor({ timeout: 120000 });
  assert.equal(await tour.locator("#room-title").textContent(), "Main Lobby");
  await tour.getByRole("button", { name: "Go to Breccia Brown" }).click();
  await page.waitForURL("**/360/breccia-brown", { timeout: 30000 });
  assert.equal(await tour.locator("#room-title").textContent(), "Breccia Brown");
  await page.goBack();
  await page.waitForURL("**/360/main-lobby", { timeout: 30000 });
  await tour.locator("#room-title").getByText("Main Lobby").waitFor({ timeout: 30000 });

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await mobile.goto(`${base}/360/titanium-black-kitchen`, { waitUntil: "domcontentloaded", timeout: 120000 });
  const mobileTour = mobile.frameLocator('iframe[title="ICON 360-degree virtual showroom"]');
  await mobileTour.locator(".loader.is-complete").waitFor({ timeout: 120000 });
  assert.equal(await mobileTour.locator("#room-title").textContent(), "Titanium Black / Kitchen");
  assert.ok(await mobileTour.locator("#exit-tour").isVisible(), "Exit link is hidden in the hosted tour");
  const exit = await mobileTour.locator("#exit-tour").boundingBox();
  const logo = await mobileTour.locator("#lobby-home").boundingBox();
  assert.ok(exit && logo && logo.x + logo.width <= exit.x, "Mobile tour controls overlap the logo");
  assert.deepEqual(errors, []);
  console.log("Virtual tour: direct room URL, lobby transition, browser Back, and mobile controls passed.");
} finally {
  await browser.close();
}
