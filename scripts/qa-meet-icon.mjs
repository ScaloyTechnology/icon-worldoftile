import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.SITE_URL ?? "http://127.0.0.1:3000";
const executablePath = process.env.CHROME_PATH ?? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const viewports = [
  ["desktop-1920", 1920, 1080], ["desktop-1440", 1440, 900], ["desktop-1366", 1366, 768],
  ["tablet-landscape", 1180, 820], ["tablet-portrait", 820, 1180], ["mobile-430", 430, 932], ["mobile-390", 390, 844],
];
const meetSections = [".meet-hero", ".meet-intro", ".meet-journey", ".meet-values", ".meet-sustainability", ".meet-manufacturing", ".meet-technology", ".meet-quality", ".meet-innovation", ".meet-specifications", ".meet-markets", ".meet-suppliers", ".meet-certifications", ".meet-next"];
const contactSections = [".contact-hero", ".contact-channels", ".contact-units", ".contact-social"];
const expectedMaps = [
  "https://maps.app.goo.gl/Fuu8jivGw3AGs9Jx9", "https://maps.app.goo.gl/pTgzJYJWr4nMnpAH9", "https://maps.app.goo.gl/H4nwNKaFCBqPVU7p7",
];

await mkdir(".qa/profile-contact", { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const failures = [];
const reports = [];

for (const [name, width, height] of viewports) {
  const context = await browser.newContext({ viewport: { width, height } });
  for (const route of ["/meet-icon", "/contact"]) {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.locator("main").waitFor({ state: "visible", timeout: 30000 });
    await page.waitForFunction(() => document.querySelector(".site-header .wordmark img")?.naturalWidth > 0, undefined, { timeout: 30000 });
    await page.waitForTimeout(1200);
    const selectors = route === "/meet-icon" ? meetSections : contactSections;
    for (const selector of selectors) {
      const section = page.locator(selector);
      if (await section.count() !== 1) failures.push(`${name} ${route}: missing ${selector}`);
      else {
        await section.evaluate((element) => element.scrollIntoView({ block: "center" }));
        if (!(await section.isVisible())) failures.push(`${name} ${route}: hidden ${selector}`);
      }
    }
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      logoWidth: document.querySelector(".site-header .wordmark img")?.getBoundingClientRect().width ?? 0,
      logoNaturalWidth: document.querySelector(".site-header .wordmark img")?.naturalWidth ?? 0,
      text: document.querySelector("main")?.textContent?.replace(/\s+/g, " ") ?? "",
    }));
    if (state.overflow > 1) failures.push(`${name} ${route}: horizontal overflow ${state.overflow}px`);
    if (state.logoWidth < 80 || state.logoNaturalWidth < 500) failures.push(`${name} ${route}: supplied logo did not render ${JSON.stringify(state)}`);
    if (/client (media|required)|awaiting|date pending|20xx/i.test(state.text)) failures.push(`${name} ${route}: obsolete placeholder copy remains`);
    errors.forEach((error) => failures.push(`${name} ${route}: ${error}`));

    if (route === "/meet-icon") {
      const profile = await page.evaluate(() => ({
        milestones: document.querySelectorAll(".meet-journey__item").length,
        process: document.querySelectorAll(".meet-process li").length,
        surfaces: document.querySelectorAll(".meet-specifications__grid>div:first-child li").length,
        sizes: document.querySelectorAll(".meet-specifications__grid>div:last-child li").length,
        markets: document.querySelectorAll(".meet-markets__directory li").length,
        routes: document.querySelectorAll(".meet-map__route").length,
        suppliers: document.querySelectorAll(".meet-suppliers li").length,
        map: document.querySelector(".meet-map__visual svg")?.getBoundingClientRect().toJSON(),
      }));
      if (profile.milestones !== 11 || profile.process !== 17 || profile.surfaces !== 20 || profile.sizes !== 18 || profile.markets !== 64 || profile.routes < 12 || profile.suppliers !== 6) failures.push(`${name}: profile counts ${JSON.stringify(profile)}`);
      if (!profile.map || profile.map.width < 300 || profile.map.height < 140) failures.push(`${name}: map layout ${JSON.stringify(profile.map)}`);
      reports.push({ name, route, width, height, ...state, profile });
    } else {
      const actions = await page.evaluate(() => ({
        tel: [...document.querySelectorAll('a[href^="tel:"]')].map((link) => link.getAttribute("href")),
        mail: [...document.querySelectorAll('a[href^="mailto:"]')].map((link) => link.getAttribute("href")),
        maps: [...document.querySelectorAll(".contact-map-link")].map((link) => ({ href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel") })),
        socials: [...document.querySelectorAll(".contact-social a")].map((link) => ({ label: link.textContent?.trim(), href: link.getAttribute("href"), target: link.getAttribute("target"), rel: link.getAttribute("rel") })),
      }));
      if (!actions.tel.includes("tel:+918238049090") || !actions.tel.includes("tel:+918758739191")) failures.push(`${name}: contact telephone links incorrect`);
      if (!actions.mail.includes("mailto:inquiry@iconworldoftile.com") || !actions.mail.includes("mailto:export@iconworldoftile.com")) failures.push(`${name}: contact email links incorrect`);
      if (actions.maps.length !== 3 || actions.maps.some((link, index) => link.href !== expectedMaps[index] || link.target !== "_blank" || !link.rel?.includes("noopener"))) failures.push(`${name}: map actions incorrect ${JSON.stringify(actions.maps)}`);
      if (actions.socials.length !== 3 || actions.socials.some((link) => link.target !== "_blank" || !link.rel?.includes("noopener"))) failures.push(`${name}: social actions incorrect`);
      reports.push({ name, route, width, height, ...state, actions });
    }
    await page.screenshot({ path: `.qa/profile-contact/${name}-${route.slice(1)}-top.png`, fullPage: false });
    await page.close();
  }
  await context.close();
}

const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
const reducedPage = await reduced.newPage();
await reducedPage.goto(`${base}/meet-icon`, { waitUntil: "domcontentloaded" });
const reducedState = await reducedPage.evaluate(() => ({ routes: [...document.querySelectorAll(".meet-map__route")].every((route) => getComputedStyle(route).strokeDashoffset === "0px" || getComputedStyle(route).strokeDashoffset === "0"), visible: [...document.querySelectorAll(".meet-journey__item")].every((item) => getComputedStyle(item).visibility !== "hidden") }));
if (!reducedState.visible) failures.push("reduced motion hides timeline content");
await reduced.close();
await browser.close();

await writeFile(".qa/profile-contact/report.json", JSON.stringify({ reports, reducedState, failures }, null, 2));
console.log(JSON.stringify({ checkedViewports: viewports.length, routes: 2, reducedState, failures }, null, 2));
if (failures.length) process.exitCode = 1;
