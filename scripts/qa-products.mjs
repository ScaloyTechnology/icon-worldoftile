import { chromium } from "playwright-core";

const base = process.env.SITE_URL ?? "http://127.0.0.1:3000";
const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const viewports = [
  ["desktop-1920", 1920, 1080], ["desktop-1440", 1440, 900], ["desktop-1366", 1366, 768],
  ["tablet-landscape", 1180, 820], ["tablet-portrait", 820, 1180], ["mobile-390", 390, 844], ["mobile-430", 430, 932],
];
const browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader"] });
const failures = [];
const reports = [];

for (const [name, width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await page.goto(`${base}/products`, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator("#products-library-title").waitFor();
  if (width >= 1024) await page.locator(".products-intro canvas").waitFor({ timeout: 30000 });
  const initial = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    cards: document.querySelectorAll("[data-product-card]").length,
    canvases: document.querySelectorAll(".products-intro canvas").length,
    title: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim(),
    headerTheme: document.querySelector(".site-header")?.getAttribute("data-theme"),
    alts: [...document.querySelectorAll(".product-card img")].map((image) => image.getAttribute("alt")),
  }));
  if (initial.overflow > 0) failures.push(`${name}: horizontal overflow ${initial.overflow}px`);
  if (initial.cards !== 18) failures.push(`${name}: expected 18 cards, got ${initial.cards}`);
  if (width >= 1024 ? initial.canvases !== 1 : initial.canvases !== 0) failures.push(`${name}: unexpected canvas count ${initial.canvases}`);
  if (initial.alts.some((alt) => !alt)) failures.push(`${name}: missing product image alt`);
  errors.forEach((error) => failures.push(`${name}: ${error}`));
  reports.push({ name, width, height, ...initial });

  if (name === "desktop-1440") {
    const search = page.getByPlaceholder("Search materials");
    await search.fill("pecan wood");
    await page.waitForTimeout(350);
    await page.waitForFunction(() => document.querySelectorAll("[data-product-card]").length === 1);
    if (!new URL(page.url()).searchParams.has("q")) failures.push("search state missing from URL");
    await page.getByRole("button", { name: /Refine/ }).click();
    if (!(await page.getByRole("dialog").isVisible())) failures.push("refine dialog did not open");
    await page.keyboard.press("Escape");
    if (!(await page.getByRole("button", { name: /Refine/ }).evaluate((element) => element === document.activeElement))) failures.push("refine focus was not restored");
    await page.getByRole("button", { name: /Search: pecan wood/ }).click();
    await page.waitForFunction(() => document.querySelectorAll("[data-product-card]").length === 18);
    await page.locator(".products-control-menu").first().locator(".products-control-menu__trigger").click();
    await page.getByRole("option", { name: "Mystone study", exact: true }).click();
    await page.waitForFunction(() => document.querySelectorAll("[data-product-card]").length === 3);
    const filteredUrl = page.url();
    await page.goBack();
    await page.waitForFunction(() => document.querySelectorAll("[data-product-card]").length === 18);
    await page.goForward();
    if (page.url() !== filteredUrl) failures.push("back/forward did not restore product URL state");
    const collectionSection = page.locator(".products-collections");
    await collectionSection.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const section = document.querySelector(".products-collections");
      if (section) scrollTo({ top: section.offsetTop + innerHeight * 1.5, behavior: "auto" });
    });
    await page.waitForTimeout(700);
    const sequenceState = await page.evaluate(() => ({ active: Number(document.querySelector(".products-collections__nav .is-active span")?.textContent), scrollY, sectionTop: document.querySelector(".products-collections")?.getBoundingClientRect().top }));
    if (sequenceState.active <= 1) failures.push(`collection sequence did not advance: ${JSON.stringify(sequenceState)}`);
    if (await page.locator(".products-collection-rail").count()) failures.push("legacy horizontal collection rail still exists");
  }
  await context.close();
}

const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(`${base}/products`, { waitUntil: "networkidle" });
const reducedCanvas = await reducedPage.locator(".products-intro canvas").count();
if (reducedCanvas) failures.push("reduced motion rendered WebGL");
await reducedContext.close();
await browser.close();
console.log(JSON.stringify({ reports, reducedCanvas, failures }, null, 2));
if (failures.length) process.exitCode = 1;
