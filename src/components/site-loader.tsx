"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { markPageAssetsReady, MOTION_READY_EVENT, SITE_LOADER_COMPLETE_EVENT } from "@/lib/animation/site-loader";
import { BrandLoader, LOADER_EXIT_MS, type LoaderPhase } from "./brand-loader";

type LoadingState = { pathname: string; phase: LoaderPhase; progress: number; message?: string };
type ImageState = { source: string; status: "waiting" | "decoding" | "ready" | "error"; cleanup: () => void };

/** Release only after assets decode, the opening visual paints and motion initializes. */
export function SiteLoader() {
  const pathname = usePathname();
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<LoadingState>({ pathname, phase: "loading", progress: 0 });
  const active: LoadingState = state.pathname === pathname ? state : { pathname, phase: "loading", progress: 0 };

  useLayoutEffect(() => {
    let disposed = false;
    let leaving = false;
    let frame = 0;
    let exitTimer = 0;
    let progress = 0;
    let message: string | undefined;
    let slow = false;
    let assetsPublished = false;
    let stableFrames = 0;
    const watched = new Map<HTMLImageElement, ImageState>();
    const site = document.querySelector(".public-site") ?? document.body;
    delete document.documentElement.dataset.iconAssetsPath;
    setHydrated(true);
    setState({ pathname, phase: "loading", progress: 0 });
    document.documentElement.classList.add("site-is-loading");
    document.body.setAttribute("aria-busy", "true");

    const publish = (value: number, nextMessage?: string) => {
      const next = Math.max(progress, Math.min(99, Math.round(value)));
      if (disposed || leaving || (next === progress && nextMessage === message)) return;
      progress = next;
      message = nextMessage;
      setState({ pathname, phase: "loading", progress, message });
    };
    const stopWatching = () => {
      observer.disconnect();
      watched.forEach(item => item.cleanup());
      watched.clear();
      window.removeEventListener(MOTION_READY_EVENT, schedule);
      document.fonts.removeEventListener("loadingdone", schedule);
      document.fonts.removeEventListener("loadingerror", schedule);
      clearTimeout(slowTimer);
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const finish = () => {
      if (disposed || leaving) return;
      leaving = true;
      stopWatching();
      setState({ pathname, phase: "leaving", progress: 100 });
      exitTimer = window.setTimeout(() => {
        if (disposed) return;
        setState({ pathname, phase: "hidden", progress: 100 });
        document.documentElement.classList.remove("site-is-loading");
        document.body.removeAttribute("aria-busy");
        window.dispatchEvent(new CustomEvent(SITE_LOADER_COMPLETE_EVENT, { detail: { pathname } }));
        window.dispatchEvent(new Event("resize"));
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : LOADER_EXIT_MS);
    };
    function schedule() {
      if (!disposed && !leaving && !frame) frame = requestAnimationFrame(inspect);
    }
    function imageState(image: HTMLImageElement) {
      // Only opening images reach this function; offscreen images stay lazy.
      if (image.loading === "lazy") image.loading = "eager";
      const source = image.currentSrc || image.src;
      let item = watched.get(image);
      if (!item || item.source !== source) {
        item?.cleanup();
        image.addEventListener("load", schedule);
        image.addEventListener("error", schedule);
        item = { source, status: "waiting", cleanup: () => {
          image.removeEventListener("load", schedule);
          image.removeEventListener("error", schedule);
        } };
        watched.set(image, item);
      }
      if (item.status === "waiting" && image.complete) {
        if (!image.naturalWidth) item.status = "error";
        else {
          item.status = "decoding";
          const current = item;
          const decoded = typeof image.decode === "function" ? image.decode() : Promise.resolve();
          void decoded.then(() => {
            if (disposed || watched.get(image) !== current) return;
            current.status = "ready";
            schedule();
          }, () => {
            if (disposed || watched.get(image) !== current) return;
            current.status = "error";
            schedule();
          });
        }
      }
      return item.status;
    }
    function inspect() {
      frame = 0;
      if (disposed || leaving) return;
      const main = document.getElementById("main");
      const pending = !main || Boolean(site.querySelector("[data-route-pending]"));
      const hero = main?.querySelector<HTMLElement>("[data-frame-hero]");
      const framesReady = pathname !== "/" || hero?.dataset.frameLoadReady === "true";
      const frameError = hero?.dataset.frameLoadError === "true";
      const images = Array.from(site.querySelectorAll<HTMLImageElement>("img")).filter(image => {
        if (image.closest(".site-loader-shell")) return false;
        // The canvas reports its own decoded and painted state.
        if (image.closest("[data-frame-hero]") && hero?.dataset.painted === "true") return false;
        if (!image.getAttribute("src") && !image.getAttribute("srcset")) return false;
        if (image.dataset.initialImage === "true") return true;
        const bounds = image.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight
          && bounds.right > 0 && bounds.left < window.innerWidth;
      });
      const present = new Set(images);
      watched.forEach((item, image) => {
        if (!present.has(image)) { item.cleanup(); watched.delete(image); }
      });
      let decoded = 0;
      let failures = 0;
      images.forEach(image => {
        const status = imageState(image);
        if (status === "ready") decoded += 1;
        if (status === "error") failures += 1;
      });
      const fontsReady = document.fonts.status === "loaded";
      const imageProgress = images.length ? decoded / images.length : pending ? 0 : 1;
      const frameProgress = pathname === "/" ? (Number(hero?.dataset.frameLoadProgress) || 0) / 100 : 1;
      const assetsReady = !pending && framesReady && !frameError && decoded === images.length && fontsReady;
      if (assetsReady && !assetsPublished) {
        assetsPublished = true;
        markPageAssetsReady(pathname);
      }
      const motionReady = document.documentElement.dataset.iconMotionPath === pathname
        && document.documentElement.dataset.iconMotionReady === "true";
      const visualsReady = !Array.from(main?.querySelectorAll<HTMLElement>('[data-render-ready="false"], [data-tile-motion-ready="false"]') ?? []).some(visual => {
        // Offscreen canvases intentionally pause; a restored scroll position
        // must not wait for an invisible animation to run.
        const bounds = visual.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
      });
      publish(imageProgress * 45 + frameProgress * 35 + (fontsReady ? 10 : 0) + (motionReady && visualsReady ? 9 : 0),
        frameError ? "The surface images could not load. Please reload to try again."
          : failures ? "Some images could not load. Please reload to try again."
          : slow ? "Still preparing the images and animations. Please wait, or reload to try again." : undefined);
      if (assetsReady && motionReady && visualsReady) {
        // Let decoded images and measured animation layouts reach the screen.
        stableFrames += 1;
        if (stableFrames >= 2) finish();
        else schedule();
      } else stableFrames = 0;
    }
    const observer = new MutationObserver(schedule);
    observer.observe(site, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["data-frame-load-progress", "data-frame-load-ready", "data-frame-load-error", "data-painted", "data-render-ready", "data-tile-motion-ready", "src", "srcset", "sizes"],
    });
    window.addEventListener(MOTION_READY_EVENT, schedule);
    document.fonts.addEventListener("loadingdone", schedule);
    document.fonts.addEventListener("loadingerror", schedule);
    void document.fonts.ready.then(schedule);
    // Slow assets change the message, never get marked ready by a timer.
    const slowTimer = window.setTimeout(() => { slow = true; schedule(); }, 20000);
    schedule();
    return () => {
      disposed = true;
      clearTimeout(exitTimer);
      stopWatching();
      document.documentElement.classList.remove("site-is-loading");
      delete document.documentElement.dataset.iconAssetsPath;
      document.body.removeAttribute("aria-busy");
    };
  }, [pathname]);

  return <BrandLoader key={pathname} phase={active.phase} progress={hydrated ? active.progress : undefined} message={active.message}
    onRetry={() => window.location.reload()} label="Loading ICON page" />;
}
