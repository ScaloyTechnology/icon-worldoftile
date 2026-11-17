"use client";

import { useEffect } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { meetIconSections } from "@/content/meet-icon-navigation";

/** Keep deep links aligned after the journey's pin spacer has been measured. */
export function MeetSectionNavigation() {
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let destination = "";
    let removeRefreshListener: (() => void) | undefined;
    const readDestination = () => {
      const id = window.location.hash.slice(1);
      return meetIconSections.some(section => section.id === id) ? id : "";
    };
    const align = (smooth: boolean) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (disposed || !destination) return;
        const section = document.getElementById(destination);
        if (!section) return;
        const headerHeight = document.querySelector<HTMLElement>(".site-header")?.getBoundingClientRect().height ?? 100;
        const top = Math.max(0, window.scrollY + section.getBoundingClientRect().top - headerHeight - 16);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, behavior: smooth && !reduced ? "smooth" : "instant" });
      });
    };
    const navigate = () => {
      destination = readDestination();
      align(true);
    };
    const release = () => {
      destination = "";
      cancelAnimationFrame(frame);
    };
    const releaseOnKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Tab"].includes(event.key)) release();
    };
    window.addEventListener("hashchange", navigate);
    window.addEventListener("popstate", navigate);
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchstart", release, { passive: true });
    window.addEventListener("pointerdown", release, { passive: true });
    window.addEventListener("keydown", releaseOnKey);
    destination = readDestination();
    align(false);
    void loadGsap().then(({ ScrollTrigger }) => {
      if (disposed) return;
      // Later font/media and route-loader refreshes can move the anchor by the
      // full pinned timeline distance. Stop correcting as soon as the user acts.
      const refresh = () => { if (destination) align(false); };
      ScrollTrigger.addEventListener("refresh", refresh);
      removeRefreshListener = () => ScrollTrigger.removeEventListener("refresh", refresh);
      refresh();
    }).catch(() => { if (!disposed && destination) align(false); });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      removeRefreshListener?.();
      window.removeEventListener("hashchange", navigate);
      window.removeEventListener("popstate", navigate);
      window.removeEventListener("wheel", release);
      window.removeEventListener("touchstart", release);
      window.removeEventListener("pointerdown", release);
      window.removeEventListener("keydown", releaseOnKey);
    };
  }, []);
  return null;
}
