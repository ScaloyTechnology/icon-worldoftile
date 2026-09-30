"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import {
  resetCriticalAsset,
  resetMotionReady,
  SITE_LOADER_COMPLETE_EVENT,
  waitForCriticalAsset,
  waitForMotionReady,
} from "@/lib/animation/site-loader";
import styles from "./site-loader.module.css";

type Phase = "loading" | "leaving" | "hidden";

const delay = (duration: number) => new Promise<void>((resolve) => window.setTimeout(resolve, duration));
const afterPaint = () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

function imageReady(image: HTMLImageElement) {
  if (image.complete) return image.naturalWidth && image.decode ? image.decode().catch(() => undefined) : Promise.resolve();

  return new Promise<void>((resolve) => {
    const preload = new Image();
    const source = image.currentSrc || image.src;
    if (!source) {
      resolve();
      return;
    }
    const complete = async () => {
      preload.onload = null;
      preload.onerror = null;
      if (preload.naturalWidth && preload.decode) await preload.decode().catch(() => undefined);
      resolve();
    };
    preload.onload = complete;
    preload.onerror = complete;
    if (image.crossOrigin) preload.crossOrigin = image.crossOrigin;
    if (image.referrerPolicy) preload.referrerPolicy = image.referrerPolicy;
    if (image.sizes) preload.sizes = image.sizes;
    if (image.srcset) preload.srcset = image.srcset;
    preload.src = source;
  });
}

async function waitForPageImages() {
  await afterPaint();
  const ready = async () => {
    const images = Array.from(document.querySelectorAll<HTMLImageElement>(".public-site img:not([data-loader-logo])"));
    await Promise.allSettled(images.map(imageReady));
  };
  await ready();
  await delay(80);
  await ready();
}

async function waitForBackgroundImages() {
  await afterPaint();
  const urls = new Set<string>();
  document.querySelectorAll<HTMLElement>(".public-site *").forEach((element) => {
    if (element.closest("[data-site-loader]")) return;

    const background = getComputedStyle(element).backgroundImage;
    for (const match of background.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
      const url = match[1];
      if (url && !url.startsWith("data:")) urls.add(url);
    }
  });
  await Promise.allSettled([...urls].map((url) => new Promise<void>((resolve) => {
    const image = new Image();
    image.onload = image.onerror = () => resolve();
    image.src = url;
  })));
}

function waitForWindowLoad() {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
}

function criticalAssetFor(pathname: string) {
  if (pathname === "/products") return "products-intro";
  if (pathname === "/meet-icon") return "meet-globe";
  return null;
}

export function SiteLoader() {
  const pathname = usePathname();
  const firstLoad = useRef(true);
  const run = useRef(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [progress, setProgress] = useState(6);

  useLayoutEffect(() => {
    const currentRun = ++run.current;
    const started = performance.now();
    const criticalAsset = criticalAssetFor(pathname);
    let disposed = false;
    let leaveTimer = 0;
    let progressTimer = 0;

    setPhase("loading");
    setProgress(6);
    resetMotionReady();
    if (criticalAsset) resetCriticalAsset(criticalAsset);
    document.documentElement.classList.add("site-is-loading");
    document.body.setAttribute("aria-busy", "true");

    const tasks: Promise<unknown>[] = [
      afterPaint(),
      document.fonts?.ready ?? Promise.resolve(),
      waitForWindowLoad(),
      waitForPageImages(),
      waitForBackgroundImages(),
      waitForMotionReady(pathname),
    ];
    if (criticalAsset) tasks.push(waitForCriticalAsset(criticalAsset));

    let completed = 0;
    const tracked = tasks.map((task) => Promise.resolve(task).catch(() => undefined).then(() => {
      completed += 1;
      if (!disposed && run.current === currentRun) setProgress((value) => Math.max(value, Math.round(8 + (completed / tasks.length) * 84)));
    }));

    progressTimer = window.setInterval(() => {
      setProgress((value) => value < 88 ? value + 1 : value);
    }, 180);

    const maximumWait = firstLoad.current ? 12000 : 8000;
    const minimumDisplay = firstLoad.current ? 1200 : 520;
    const deadline = delay(maximumWait);

    void Promise.race([Promise.allSettled(tracked), deadline]).then(async () => {
      const remaining = Math.max(0, minimumDisplay - (performance.now() - started));
      if (remaining) await delay(remaining);
      if (disposed || run.current !== currentRun) return;
      window.clearInterval(progressTimer);
      setProgress(100);
      await delay(180);
      if (disposed || run.current !== currentRun) return;
      setPhase("leaving");
      leaveTimer = window.setTimeout(() => {
        if (disposed || run.current !== currentRun) return;
        setPhase("hidden");
        firstLoad.current = false;
        document.documentElement.classList.remove("site-is-loading");
        document.body.removeAttribute("aria-busy");
        window.dispatchEvent(new CustomEvent(SITE_LOADER_COMPLETE_EVENT, { detail: { pathname } }));
        window.dispatchEvent(new Event("resize"));
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 230 : 920);
    });

    return () => {
      disposed = true;
      window.clearInterval(progressTimer);
      window.clearTimeout(leaveTimer);
      document.documentElement.classList.remove("site-is-loading");
      document.body.removeAttribute("aria-busy");
    };
  }, [pathname]);

  return <>
    <div aria-label={`Loading ${pathname === "/" ? "ICON website" : "page"}`} aria-live="polite" className={`site-loader-shell ${styles.loader}`} data-site-loader data-state={phase} role="status">
      <span aria-hidden="true" className={styles.frame} />
      <div className={styles.content}>
        <p className={styles.kicker}>A world of material and space</p>
        <div className={styles.mark}><img alt="ICON - World of Tile" data-loader-logo fetchPriority="high" src="/brand/icon-logo-horizontal.png" /></div>
        <div aria-hidden="true" className={styles.materialBars}><span /><span /><span /></div>
        <div className={styles.status}>
          <span>{progress < 100 ? "Preparing the experience" : "Experience ready"}</span>
          <strong>{String(progress).padStart(2, "0")}%</strong>
          <div className={styles.track} aria-hidden="true"><span style={{ "--loader-progress": `${progress}%` } as React.CSSProperties} /></div>
        </div>
      </div>
      <span aria-hidden="true" className={styles.edition}>ICON / Since 1987</span>
    </div>
    <noscript><style>{`.site-loader-shell{display:none!important}`}</style></noscript>
  </>;
}
