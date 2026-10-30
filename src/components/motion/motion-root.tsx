"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { loadGsap } from "@/animations/load-gsap";
import { markMotionReady, resetMotionReady, waitForPageAssets } from "@/lib/animation/site-loader";
import { useEasedWheelScroll } from "./use-eased-wheel-scroll";

/** Route-scoped progressive enhancement. Native document scrolling is retained. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEasedWheelScroll(pathname);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const controller = new AbortController();
    resetMotionReady();

    void loadGsap().then(async ({ gsap, ScrollTrigger }) => {
      if (disposed) return;
      await waitForPageAssets(pathname, controller.signal);
      if (disposed || !root.current) return;
      ScrollTrigger.config({ ignoreMobileResize: true });
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          // Streamed homepage sections own their motion after hydration.
          if (pathname === "/") return;
          gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((chapter) => {
            gsap.from(chapter.children, {
              autoAlpha: 0,
              y: 10,
              duration: .75,
              stagger: .08,
              ease: "power2.out",
              clearProps: "all",
              scrollTrigger: { trigger: chapter, start: "top 74%", once: true },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-editorial-copy]").forEach((copy) => {
            gsap.from(copy.children, {
              autoAlpha: 0,
              clipPath: "inset(0 0 18% 0)",
              y: 22,
              duration: 1.05,
              stagger: .1,
              ease: "power3.out",
              clearProps: "all",
              scrollTrigger: { trigger: copy, start: "top 72%", once: true },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-statistics]").forEach((list) => {
            gsap.from(list.children, {
              autoAlpha: 0,
              y: 16,
              duration: .85,
              stagger: .075,
              ease: "power2.out",
              clearProps: "all",
              scrollTrigger: { trigger: list, start: "top 74%", once: true },
            });
          });

          const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
          if (reveals.length) ScrollTrigger.batch(reveals, {
            start: "top 74%",
            once: true,
            interval: .08,
            batchMax: 4,
            onEnter: (batch) => gsap.from(batch, {
              autoAlpha: 0,
              y: 16,
              duration: .82,
              stagger: .07,
              ease: "power2.out",
              clearProps: "all",
            }),
          });
        });

        match.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          if (pathname === "/products") {
            const hero = root.current?.querySelector("[data-hero-scroll-stage]");
            const heroSection = hero?.closest("section");
            if (hero && heroSection) gsap.to(hero, {
              y: 38, scale: .975, ease: "none",
              scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom top", scrub: 1.7 },
            });
          }
          if (pathname === "/") return;
          gsap.utils.toArray<HTMLElement>("[data-image-reveal]").forEach((frame) => {
            gsap.from(frame, {
              clipPath: "inset(0 0 16% 0)",
              y: 18,
              duration: 1.3,
              ease: "power3.out",
              clearProps: "all",
              scrollTrigger: { trigger: frame, start: "top 72%", once: true },
            });
          });
          gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((frame) => {
            const media = frame.querySelector<HTMLElement>("img") ?? frame;
            gsap.fromTo(media, { yPercent: -2.2, scale: 1.04, force3D: true }, {
              yPercent: 2.2,
              scale: 1.04,
              force3D: true,
              ease: "none",
              scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: 1.35 },
            });
          });
        });
      }, root);
      let refreshFrame = 0;
      let previousSize = "";
      const resize = new ResizeObserver(([entry]) => {
        if (!entry || disposed) return;
        const size = `${Math.round(entry.contentRect.width)}:${Math.round(entry.contentRect.height)}`;
        if (size === previousSize) return;
        previousSize = size;
        cancelAnimationFrame(refreshFrame);
        refreshFrame = requestAnimationFrame(() => { if (!disposed) ScrollTrigger.refresh(); });
      });
      if (root.current) resize.observe(root.current);
      cleanup = () => {
        cancelAnimationFrame(refreshFrame);
        resize.disconnect();
        match.revert();
        context.revert();
      };
      ScrollTrigger.refresh();
      markMotionReady(pathname);
    }).catch(() => {
      if (disposed) return;
      markMotionReady(pathname);
      /* Content remains visible and functional without motion enhancement. */
    });

    return () => {
      disposed = true;
      controller.abort();
      cleanup?.();
    };
  }, [pathname]);

  return <div ref={root}>{children}</div>;
}
