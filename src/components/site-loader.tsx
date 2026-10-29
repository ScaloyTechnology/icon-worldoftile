"use client";

import { useLayoutEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SITE_LOADER_COMPLETE_EVENT } from "@/lib/animation/site-loader";
import { BrandLoader, LOADER_EXIT_MS, type LoaderPhase } from "./brand-loader";

type LoadingState = { pathname: string; phase: LoaderPhase; progress: number };

/** One overlay owns all public route transitions, including home frame readiness. */
export function SiteLoader() {
  const pathname = usePathname();
  const [state, setState] = useState<LoadingState>({ pathname, phase: "loading", progress: 0 });
  const active = state.pathname === pathname ? state : { pathname, phase: "loading" as const, progress: 0 };

  useLayoutEffect(() => {
    let disposed = false;
    let leaving = false;
    let frame = 0;
    let exitTimer = 0;
    let progress = 0;
    let assetWaitExpired = false;
    const watched = new Map<HTMLImageElement, () => void>();
    setState({ pathname, phase: "loading", progress: 0 });
    document.documentElement.classList.add("site-is-loading");
    document.body.setAttribute("aria-busy", "true");

    const publish = (value: number) => {
      const next = Math.max(progress, Math.min(100, Math.round(value)));
      if (next === progress || disposed || leaving) return;
      progress = next;
      setState({ pathname, phase: "loading", progress });
    };
    const stopWatching = () => {
      observer.disconnect();
      watched.forEach(cleanup => cleanup()); watched.clear();
      cancelAnimationFrame(frame); frame = 0;
    };
    const finish = () => {
      if (disposed || leaving) return;
      leaving = true;
      clearTimeout(deadline);
      stopWatching();
      progress = 100;
      setState({ pathname, phase: "leaving", progress });
      exitTimer = window.setTimeout(() => {
        if (disposed) return;
        setState({ pathname, phase: "hidden", progress });
        document.documentElement.classList.remove("site-is-loading");
        document.body.removeAttribute("aria-busy");
        window.dispatchEvent(new CustomEvent(SITE_LOADER_COMPLETE_EVENT, { detail: { pathname } }));
        window.dispatchEvent(new Event("resize"));
      }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : LOADER_EXIT_MS);
    };
    const schedule = () => {
      if (!disposed && !leaving && !frame) frame = requestAnimationFrame(inspect);
    };
    function inspect() {
      frame = 0;
      if (disposed || leaving) return;
      const main = document.getElementById("main");
      if (!main || main.querySelector("[data-route-pending]")) return;
      // The time limit applies to assets, not the server's route fallback.
      // Keep covering streamed placeholders until actual page content arrives.
      if (assetWaitExpired) { finish(); return; }
      if (pathname === "/") {
        const hero = main.querySelector<HTMLElement>("[data-frame-hero]");
        if (!hero) return;
        publish(Number(hero.dataset.frameLoadProgress) || 0);
        if (hero.dataset.frameLoadReady === "true") finish();
        return;
      }
      // Observe the browser's existing opening images, never clone/download the
      // entire page, wait for lazy images, or block on GSAP/3D enhancement.
      const opening = Array.from(main.querySelectorAll<HTMLImageElement>("img")).filter(image => {
        if (image.closest(".site-loader-shell")) return false;
        if (image.dataset.initialImage === "true") return true;
        if (image.loading === "lazy") return false;
        const bounds = image.getBoundingClientRect();
        return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight;
      }).slice(0, 4);
      let complete = 0;
      opening.forEach(image => {
        if (image.complete) { complete += 1; return; }
        if (!watched.has(image)) {
          image.addEventListener("load", schedule);
          image.addEventListener("error", schedule);
          watched.set(image, () => { image.removeEventListener("load", schedule); image.removeEventListener("error", schedule); });
        }
      });
      publish(opening.length ? 50 + complete / opening.length * 50 : 100);
      if (complete === opening.length) finish();
    }
    const observer = new MutationObserver(schedule);
    observer.observe(document.querySelector(".public-site") ?? document.body, {
      childList: true, subtree: true, attributes: true,
      attributeFilter: ["data-frame-load-progress", "data-frame-load-ready", "src", "srcset"],
    });
    // A slow/failed asset must not hold the whole website behind an overlay.
    const deadline = window.setTimeout(() => {
      assetWaitExpired = true;
      schedule();
    }, 4000);
    schedule();
    return () => {
      disposed = true;
      clearTimeout(deadline); clearTimeout(exitTimer); stopWatching();
      document.documentElement.classList.remove("site-is-loading");
      document.body.removeAttribute("aria-busy");
    };
  }, [pathname]);

  return <BrandLoader key={pathname} phase={active.phase} progress={active.progress} label="Loading ICON page" />;
}
