"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import type Lenis from "lenis";

import { loadGsap } from "@/animations/load-gsap";

/**
 * Keeps native document scrolling while easing wheel input onto the same
 * animation clock as GSAP. Touch remains native and reduced-motion is honored.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    let disposed = false;
    let disposeController: (() => void) | undefined;

    void Promise.all([import("lenis"), loadGsap()])
      .then(([{ default: LenisController }, { gsap, ScrollTrigger }]) => {
        if (disposed) return;

        const lenis = new LenisController({
          lerp: 0.075,
          smoothWheel: true,
          syncTouch: false,
          wheelMultiplier: 0.88,
          touchMultiplier: 1,
          autoResize: true,
          anchors: { offset: -88 },
          allowNestedScroll: true,
          overscroll: true,
          stopInertiaOnNavigate: true,
          respectReducedMotion: true,
        });
        lenisRef.current = lenis;

        const updateScrollTriggers = () => ScrollTrigger.update();
        const tick = (time: number) => lenis.raf(time * 1000);

        lenis.on("scroll", updateScrollTriggers);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);
        ScrollTrigger.refresh();

        disposeController = () => {
          lenis.off("scroll", updateScrollTriggers);
          gsap.ticker.remove(tick);
          gsap.ticker.lagSmoothing(500, 33);
          lenis.destroy();
          lenisRef.current = null;
        };
      })
      .catch(() => {
        /* Native scrolling remains the progressive-enhancement fallback. */
      });

    return () => {
      disposed = true;
      disposeController?.();
    };
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      lenisRef.current?.resize();
      void loadGsap().then(({ ScrollTrigger }) => ScrollTrigger.refresh());
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  return children;
}
