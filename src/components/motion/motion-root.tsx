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

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (disposed || !root.current) return;
      ScrollTrigger.config({ ignoreMobileResize: true });
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          if (pathname === "/") {
            const page = root.current;
            if (!page) return;
            const compact = window.matchMedia("(max-width: 899px)").matches;
            // One reveal per group, rather than a separate trigger on every image
            // and label. Do not hide content already visible on a restored scroll.
            const reveal = (trigger: Element | null, targets: Element[], image = false, delay = 0, zoom = true) => {
              if (!trigger || !targets.length || trigger.getBoundingClientRect().top < window.innerHeight * .9) return;
              gsap.from(targets, {
                opacity: 0,
                y: compact ? 14 : image ? 30 : 24,
                ...(image && zoom ? { scale: 1.025 } : {}),
                duration: compact ? .95 : image ? 1.5 : 1.2,
                stagger: { amount: Math.min(targets.length * (compact ? .045 : .085), .55) },
                delay,
                ease: "power3.out",
                clearProps: "opacity,transform",
                scrollTrigger: { trigger, start: "top 90%", once: true },
              });
            };
            const discover = page.querySelector("#discover-icon");
            const chapter = discover?.querySelector("header") ?? null;
            reveal(chapter, chapter ? Array.from(chapter.children) : []);
            const detail = discover?.querySelector("[data-discover-detail] figure");
            // Its parent owns parallax and its figure owns hover: opacity only.
            if (detail && detail.getBoundingClientRect().top >= window.innerHeight * .9) {
              gsap.from(detail, {
                opacity: 0, duration: 1.3, ease: "sine.out", clearProps: "opacity",
                scrollTrigger: { trigger: detail, start: "top 90%", once: true },
              });
            }

            const desk = page.querySelector("#collections [data-desk-samples]");
            const collectionCards = Array.from(page.querySelectorAll("#collections [data-collection-card]"));
            reveal(desk, collectionCards.flatMap(card => card.children[0] ? [card.children[0]] : []), true);
            reveal(desk, collectionCards.flatMap(card => card.children[1] ? [card.children[1]] : []), false, .18);

            page.querySelectorAll("[data-chapter]").forEach(chapter => reveal(chapter, Array.from(chapter.children)));
            page.querySelectorAll("[data-editorial-copy]").forEach(copy => {
              const heading = copy.querySelector("h2");
              const lines = heading ? Array.from(heading.children) : [];
              const supporting = Array.from(copy.children).filter(child => child !== heading);
              reveal(copy, [...(lines.length ? lines : heading ? [heading] : []), ...supporting]);
            });

            const gallery = page.querySelector("#surfaces [data-image-reveal]");
            const panels = Array.from(page.querySelectorAll("#surfaces a"));
            reveal(gallery, panels.flatMap(panel => panel.children[0] ? [panel.children[0]] : []), true, 0, false);
            reveal(gallery, panels.flatMap(panel => panel.children[1] ? [panel.children[1]] : []), false, .22);
            const enquiry = page.querySelector('[aria-labelledby="home-enquiry-title"]');
            if (enquiry) {
              reveal(enquiry, Array.from(enquiry.children).filter(child => !child.hasAttribute("data-editorial-copy")));
            }
            const footer = document.querySelector(".site-footer");
            if (footer) Array.from(footer.children).forEach(row => reveal(row, Array.from(row.children)));

            // The homepage has its own choreography. Do not run generic reveals
            // over the same elements or compete with component-owned animation.
            return;
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
          if (pathname === "/") {
            const hero = root.current?.querySelector("[data-hero-scroll-stage]");
            const heroSection = hero?.closest("section");
            if (hero && heroSection) gsap.to(hero, {
              y: 38, scale: .975, ease: "none",
              scrollTrigger: { trigger: heroSection, start: "top top", end: "bottom top", scrub: 1.1 },
            });
            const enquiry = root.current?.querySelector('[aria-labelledby="home-enquiry-title"]');
            const heading = enquiry?.querySelector("[data-editorial-copy]");
            if (enquiry && heading) gsap.fromTo(heading, { y: 18 }, {
              y: -18, ease: "none",
              scrollTrigger: { trigger: enquiry, start: "top bottom", end: "bottom top", scrub: 1 },
            });
            return;
          }
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
