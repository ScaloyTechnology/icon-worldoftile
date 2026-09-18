"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { loadGsap } from "@/animations/load-gsap";
import { useEasedWheelScroll } from "./use-eased-wheel-scroll";

/** Route-scoped progressive enhancement. Native document scrolling is retained. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEasedWheelScroll(pathname);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (disposed || !root.current) return;
      ScrollTrigger.config({ ignoreMobileResize: true });
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          if (pathname === "/") {
            // Homepage-only additions: no layout changes or motion on other routes.
            const revealGroup = (trigger: Element, targets: Element[], images = false) => {
              if (!targets.length) return;
              gsap.from(targets, {
                autoAlpha: 0,
                ...(images ? { clipPath: "inset(0 0 12% 0)" } : { y: 12 }),
                duration: images ? .85 : .6,
                stagger: .065, ease: "power3.out", clearProps: "all",
                scrollTrigger: { trigger, start: "top 93%", once: true },
              });
            };
            root.current?.querySelectorAll("#surfaces a").forEach((panel) => {
              const children = Array.from(panel.children);
              if (children[0]) revealGroup(panel, [children[0]], true);
              if (children[1]) revealGroup(panel, Array.from(children[1].children));
            });
            root.current?.querySelectorAll("#collections [data-collection-card]").forEach((card) => {
              // Inner layers only; the drag controller owns the outer card transforms.
              revealGroup(card, Array.from(card.children), true);
            });
            const discover = root.current?.querySelector("#discover-icon");
            const chapter = discover?.querySelector("header");
            if (chapter) revealGroup(chapter, Array.from(chapter.children));
            const detail = discover?.querySelector("[data-discover-detail] figure");
            if (detail) revealGroup(detail, [detail], true);
            const cta = root.current?.querySelector('[aria-labelledby="home-enquiry-title"]');
            if (cta) revealGroup(cta, Array.from(cta.children).filter((child) => !child.hasAttribute("data-editorial-copy")));
            const footer = document.querySelector(".site-footer");
            if (footer) Array.from(footer.children).forEach((row) => revealGroup(row, Array.from(row.children)));
            const header = document.querySelector(".site-header");
            if (header) gsap.from(header.children, {
              opacity: 0, y: -8, duration: .6, stagger: .06,
              ease: "power2.out", clearProps: "all",
            });
          }
          gsap.utils.toArray<HTMLElement>("[data-chapter]").forEach((chapter) => {
            gsap.from(chapter.children, {
              autoAlpha: 0,
              y: 10,
              duration: .58,
              stagger: .08,
              ease: "power2.out",
              clearProps: "all",
              scrollTrigger: { trigger: chapter, start: "top 90%", once: true },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-editorial-copy]").forEach((copy) => {
            gsap.from(copy.children, {
              autoAlpha: 0,
              clipPath: "inset(0 0 18% 0)",
              y: 22,
              duration: .86,
              stagger: .1,
              ease: "power3.out",
              clearProps: "all",
              scrollTrigger: { trigger: copy, start: "top 84%", once: true },
            });
          });

          gsap.utils.toArray<HTMLElement>("[data-statistics]").forEach((list) => {
            gsap.from(list.children, {
              autoAlpha: 0,
              y: 16,
              duration: .66,
              stagger: .075,
              ease: "power2.out",
              clearProps: "all",
              scrollTrigger: { trigger: list, start: "top 88%", once: true },
            });
          });

          const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
          if (reveals.length) ScrollTrigger.batch(reveals, {
            start: "top 90%",
            once: true,
            interval: .08,
            batchMax: 4,
            onEnter: (batch) => gsap.from(batch, {
              autoAlpha: 0,
              y: 16,
              duration: .6,
              stagger: .07,
              ease: "power2.out",
              clearProps: "all",
            }),
          });
        });

        match.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          gsap.utils.toArray<HTMLElement>("[data-image-reveal]").forEach((frame) => {
            if (pathname === "/" && frame.closest("#surfaces")) return;
            gsap.from(frame, {
              clipPath: "inset(0 0 16% 0)",
              y: 18,
              duration: 1.05,
              ease: "power3.out",
              clearProps: "all",
              scrollTrigger: { trigger: frame, start: "top 86%", once: true },
            });
          });
          gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach((frame) => {
            const media = frame.querySelector<HTMLElement>("img") ?? frame;
            gsap.fromTo(media, { yPercent: -2.2, scale: 1.04, force3D: true }, {
              yPercent: 2.2,
              scale: 1.04,
              force3D: true,
              ease: "none",
              scrollTrigger: { trigger: frame, start: "top bottom", end: "bottom top", scrub: .8 },
            });
          });
        });
      }, root);
      cleanup = () => {
        match.revert();
        context.revert();
      };
    }).catch(() => {
      /* Content remains visible and functional without motion enhancement. */
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [pathname]);

  return <div ref={root}>{children}</div>;
}
