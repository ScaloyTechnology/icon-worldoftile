import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { chromium } from "playwright-core";

const base = process.env.SITE_URL ?? "http://127.0.0.1:3000";
const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const viewports = [
  ["desktop-1920", 1920, 1080], ["desktop-1440", 1440, 900], ["desktop-1366", 1366, 768],
  ["tablet-landscape", 1180, 820], ["tablet-portrait", 820, 1180], ["mobile-390", 390, 844], ["mobile-430", 430, 932],
];
const samples = [[0.1, "intro"], [0.25, "approach"], [0.42, "isolation"], [0.62, "tile"], [0.83, "assembly"], [0.93, "collections"]];
const browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-webgl", "--ignore-gpu-blocklist", "--use-angle=swiftshader"] });
await mkdir(".qa", { recursive: true });

async function inspectViewport(name, width, height) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);
  const errors = [];
  page.on("pageerror", error => errors.push(`page: ${error.message}`));
  page.on("console", message => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  await page.goto(`${base}/?heroDebug=1`, { waitUntil: "networkidle", timeout: 120000 });
  await page.locator(".hero-journey").waitFor();
  await page.waitForFunction(() => document.querySelector(".hero-journey")?.classList.contains("is-hero-enhanced"));
  await page.locator(".pin-spacer").waitFor();
  await page.evaluate(() => document.documentElement.style.setProperty("scroll-behavior", "auto", "important"));
  const multiplier = width < 768 ? 2.35 : 4.2;
  const observed = [];
  let opaqueDifference = null;
  let focusRestoresHeader = null;
  for (const [position, expected] of samples) {
    const target = Math.round(height * multiplier * position);
    await page.evaluate(y => window.scrollTo(0, y), target);
    await page.waitForFunction(y => Math.abs(window.scrollY - y) < 2, target, { timeout: 30000 }).catch(async error => { console.error(name, position, await page.evaluate(() => ({ scroll: scrollY, root: document.querySelector('.hero-journey').getBoundingClientRect().toJSON(), progress: document.querySelector('.hero-journey').style.getPropertyValue('--hero-progress') }))); throw error; });
    await page.waitForFunction(expectedStage => document.querySelector(".hero-journey")?.getAttribute("data-stage") === expectedStage, expected, { timeout: 30000 }).catch(async error => { console.error(name, position, await page.locator('.hero-journey').evaluate(el => ({ stage: el.dataset.stage, progress: el.style.getPropertyValue('--hero-progress'), scroll: scrollY }))); throw error; });
    await page.waitForFunction(p => Math.abs(Number(document.querySelector('.hero-journey').style.getPropertyValue('--hero-progress')) - p) < 0.01, position, { timeout: 30000 });
    const stage = await page.locator(".hero-journey").getAttribute("data-stage");
    const headerState = await page.locator('.site-header').evaluate(el => ({ opacity: Number(getComputedStyle(el).opacity), pointer: getComputedStyle(el).pointerEvents }));
    observed.push({ position, expected, stage, headerState });
    if (["desktop-1440", "mobile-390"].includes(name) && [0.42, 0.62, 0.83, 0.93].includes(position)) await page.screenshot({ path: `.qa/${name}-${expected}.png`, fullPage: false });
    if (name === 'desktop-1440' && position === 0.62) {
      await page.waitForFunction(() => document.querySelector('.hero-journey').dataset.webgl === 'ready');
      await page.locator('.site-header .wordmark').focus();
      focusRestoresHeader = await page.locator('.site-header').evaluate(el => Number(getComputedStyle(el).opacity) === 1 && getComputedStyle(el).pointerEvents === 'auto');
      await page.locator('.site-header .wordmark').evaluate(el => el.blur());
      // Changing the room behind the slab must not affect ANY pixel in its central
      // 200x80 region. This detects the former transparent rectangular overlap.
      const clip = { x: width / 2 - 100, y: height / 2 - 40, width: 200, height: 80 };
      const before = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer();
      const diagnostic = await page.addStyleTag({ content: '.journey-hero{visibility:hidden!important}.hero-journey-viewport{background:#ff00ff!important}' });
      const after = await sharp(await page.screenshot({ clip })).removeAlpha().raw().toBuffer();
      opaqueDifference = before.reduce((sum, value, index) => sum + Math.abs(value - after[index]), 0) / before.length;
      await diagnostic.evaluate(el => el.remove());
    }
  }
  await page.evaluate(y => window.scrollTo({ top: y, behavior: "auto" }), Math.round(height * multiplier));
  await page.waitForFunction(y => Math.abs(window.scrollY - y) < 2, Math.round(height * multiplier), { timeout: 3000 });
  await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.site-header')).opacity) > 0.99);
  const end = await page.evaluate(() => {
    const root = document.querySelector(".hero-journey");
    const header = document.querySelector(".site-header")?.getBoundingClientRect();
    return {
      stage: root?.getAttribute("data-stage"),
      webgl: root?.getAttribute("data-webgl"),
      canvases: root?.querySelectorAll("canvas").length ?? 0,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      headerTop: header?.top,
      headerBottom: header?.bottom,
      collectionsVisible: getComputedStyle(document.querySelector(".journey-collections")).visibility,
      headerOpacity: Number(getComputedStyle(document.querySelector('.site-header')).opacity),
      textures: [...document.querySelectorAll('[data-tile-piece]')].map(el => el.dataset.texture),
      visiblePanelCount: [...document.querySelectorAll('[data-tile-piece]')].filter(el => getComputedStyle(el).display !== 'none').length,
      canvasOverflow: [...root.querySelectorAll('canvas')].some(el => el.clientWidth > innerWidth || el.clientHeight > innerHeight),
    };
  });
  if (["desktop-1440", "mobile-390"].includes(name)) await page.screenshot({ path: `.qa/${name}-collections.png`, fullPage: false });
  const firstCollection = page.locator("[data-collection-card] a").first();
  if (["desktop-1440", "mobile-390"].includes(name) && await firstCollection.count()) {
    await Promise.all([
      page.waitForURL(url => url.pathname === "/products", { timeout: 120000 }),
      firstCollection.click(),
    ]);
    await page.goBack({ waitUntil: "networkidle" });
  }
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await page.waitForFunction(() => window.scrollY === 0, undefined, { timeout: 3000 });
  await page.waitForFunction(() => document.querySelector('.hero-journey')?.dataset.stage === 'intro');
  const reversed = await page.locator(".hero-journey").getAttribute("data-stage");
  if (name === "desktop-1440") for (let index = 0; index < 2; index += 1) await page.reload({ waitUntil: "networkidle" });
  const canvasAfterReload = await page.locator(".hero-journey canvas").count();
  await context.close();
  console.log(`Checked ${name}: ${end.webgl}, ${errors.length} errors`);
  return { name, width, height, observed, end, reversed, canvasAfterReload, opaqueDifference, focusRestoresHeader, errors };
}

const results = [];
for (const [name, width, height] of viewports) results.push(await inspectViewport(name, width, height));

const reducedContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const reducedPage = await reducedContext.newPage();
await reducedPage.goto(base, { waitUntil: "networkidle" });
const reduced = await reducedPage.evaluate(() => ({ enhanced: document.querySelector(".hero-journey")?.classList.contains("is-hero-enhanced"), canvases: document.querySelectorAll(".hero-journey canvas").length, tileVisible: getComputedStyle(document.querySelector("[data-tile-isolate]")).display }));
await reducedContext.close();

const fallbackContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await fallbackContext.addInitScript(() => {
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (kind, options) {
    if (kind === "webgl" || kind === "webgl2") return null;
    return original.call(this, kind, options);
  };
});
const fallbackPage = await fallbackContext.newPage();
await fallbackPage.goto(base, { waitUntil: "networkidle" });
await fallbackPage.waitForTimeout(250);
const webglFallback = await fallbackPage.evaluate(() => ({ state: document.querySelector(".hero-journey")?.getAttribute("data-webgl"), canvases: document.querySelectorAll(".hero-journey canvas").length, domTile: Boolean(document.querySelector("[data-tile-proxy]")) }));
await fallbackContext.close();

// Exercise disposal/recreation in one document, rather than only resetting it by reload.
const lifecycleContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const lifecyclePage = await lifecycleContext.newPage();
await lifecyclePage.goto(base, { waitUntil: 'networkidle' });
await lifecyclePage.waitForFunction(() => document.querySelector('.hero-journey').dataset.webgl === 'ready');
await lifecyclePage.evaluate(() => document.documentElement.style.setProperty('scroll-behavior', 'auto', 'important'));
const cdp = await lifecycleContext.newCDPSession(lifecyclePage);
await cdp.send('Performance.enable');
const heaps = [];
for (let cycle = 0; cycle < 3; cycle++) {
  await lifecyclePage.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await lifecyclePage.waitForFunction(() => !document.querySelector('.hero-journey canvas'));
  await cdp.send('HeapProfiler.collectGarbage');
  const { metrics } = await cdp.send('Performance.getMetrics');
  heaps.push(metrics.find(metric => metric.name === 'JSHeapUsedSize').value);
  await lifecyclePage.evaluate(() => scrollTo(0, 0));
  await lifecyclePage.waitForFunction(() => document.querySelector('.hero-journey').dataset.webgl === 'ready' && document.querySelectorAll('.hero-journey canvas').length === 1);
}
await lifecyclePage.locator('.hero-journey canvas').evaluate(canvas => canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
await lifecyclePage.waitForFunction(
  () => document.querySelector('.hero-journey').dataset.webgl === 'fallback',
  undefined,
  { timeout: 5000 },
).catch(async () => {
  // SwiftShader can acknowledge WEBGL_lose_context without emitting the DOM
  // event. Dispatch the same cancelable event to verify the application path.
  await lifecyclePage.locator('.hero-journey canvas').evaluate(canvas =>
    canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
  );
});
await lifecyclePage.waitForFunction(() => document.querySelector('.hero-journey').dataset.webgl === 'fallback' && !document.querySelector('.hero-journey canvas'));
const lifecycle = { heaps, retainedGrowthBytes: heaps.at(-1) - heaps[0], contextLossFallback: true };
await lifecycleContext.close();

const noJsContext = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
const noJsPage = await noJsContext.newPage();
await noJsPage.goto(base, { waitUntil: 'networkidle' });
const noJs = { hero: await noJsPage.locator('#hero-heading').isVisible(), collections: await noJsPage.locator('#collections-heading').isVisible(), canvases: await noJsPage.locator('canvas').count() };
await noJsContext.close();
await browser.close();

const failures = results.flatMap(result => [
  ...result.observed.filter(sample => sample.stage !== sample.expected).map(sample => `${result.name} ${sample.position}: expected ${sample.expected}, got ${sample.stage}`),
  ...(result.end.overflow > 0 ? [`${result.name}: horizontal overflow ${result.end.overflow}px`] : []),
  ...(result.end.canvasOverflow ? [`${result.name}: canvas overflow`] : []),
  ...(result.end.visiblePanelCount !== (result.width <= 760 ? 4 : 6) ? [`${result.name}: incorrect panel count`] : []),
  ...(result.end.headerTop !== 0 ? [`${result.name}: sticky header top ${result.end.headerTop}`] : []),
  ...(result.reversed !== "intro" ? [`${result.name}: reverse ended at ${result.reversed}`] : []),
  ...(result.canvasAfterReload > 1 ? [`${result.name}: ${result.canvasAfterReload} canvases after reload`] : []),
  ...(new Set(result.end.textures).size < 6 ? [`${result.name}: expected six distinct fallback materials`] : []),
  ...(result.observed.find(sample => sample.position === 0.62)?.headerState.opacity > 0.2 ? [`${result.name}: header did not recede`] : []),
  ...(result.observed.find(sample => sample.position === 0.62)?.headerState.pointer !== 'none' ? [`${result.name}: invisible header intercepts input`] : []),
  ...(result.opaqueDifference !== null && result.opaqueDifference > 1 ? [`${result.name}: slab central pixels changed with background: ${result.opaqueDifference}`] : []),
  ...(result.focusRestoresHeader === false ? [`${result.name}: keyboard focus did not restore header`] : []),
  ...result.errors,
]);
if (reduced.enhanced || reduced.canvases !== 0 || reduced.tileVisible === "none") failures.push("reduced-motion fallback is incomplete");
if (webglFallback.canvases !== 0 || !webglFallback.domTile) failures.push("forced WebGL fallback is incomplete");
if (lifecycle.retainedGrowthBytes > 8 * 1024 * 1024) failures.push('repeated scene disposal retained more than 8 MiB of extra JS heap');
if (!noJs.hero || !noJs.collections || noJs.canvases) failures.push('no-JavaScript content fallback is incomplete');
await writeFile('.qa/homepage-refinement-qa.json', JSON.stringify({ results, reduced, webglFallback, lifecycle, noJs, failures }, null, 2));
console.log(JSON.stringify({ reduced, webglFallback, lifecycle, noJs, failures }, null, 2));
if (failures.length) process.exitCode = 1;
