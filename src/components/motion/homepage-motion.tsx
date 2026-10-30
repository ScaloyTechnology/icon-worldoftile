"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { loadGsap } from "@/animations/load-gsap";

/** Own the animation inside the streamed boundary that owns its markup.
 * A parent layout effect can run while that boundary is still dehydrated. */
export function HomepageMotion({ children, region }: { children: ReactNode; region: "content" | "footer" }) {
  const root = useRef<HTMLElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== "/") return;
    const element = root.current;
    if (!element) return;
    element.dataset.homeMotionReady = "false";
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      const page = root.current;
      if (disposed || !page) return;
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          const compact = window.matchMedia("(max-width: 899px)").matches;
          const reveal = (trigger: Element | null, targets: Element[], image = false, delay = 0, zoom = true) => {
            if (!trigger || !targets.length || trigger.getBoundingClientRect().top < window.innerHeight * .74) return;
            gsap.from(targets, {
              opacity: 0,
              y: compact ? 14 : image ? 30 : 24,
              ...(image && zoom ? { scale: 1.025 } : {}),
              duration: compact ? 1.15 : image ? 1.8 : 1.45,
              stagger: { amount: Math.min(targets.length * (compact ? .045 : .085), .55) },
              delay, ease: "power3.out", clearProps: "opacity,transform",
              scrollTrigger: { trigger, start: "top 74%", once: true },
            });
          };
          if (region === "footer") {
            Array.from(page.children).forEach(row => {
              if (!row.classList.contains("footer-bottom")) reveal(row, Array.from(row.children));
            });
            return;
          }
          const discover = page.querySelector("#discover-icon");
          const chapter = discover?.querySelector("header") ?? null;
          reveal(chapter, chapter ? Array.from(chapter.children) : []);
          const detail = discover?.querySelector("[data-discover-detail] figure");
          if (detail && detail.getBoundingClientRect().top >= window.innerHeight * .74) {
            gsap.from(detail, {
              opacity: 0, duration: 1.55, ease: "sine.out", clearProps: "opacity",
              scrollTrigger: { trigger: detail, start: "top 74%", once: true },
            });
          }
          const desk = page.querySelector("#collections [data-desk-samples]");
          const cards = Array.from(page.querySelectorAll("#collections [data-collection-card]"));
          reveal(desk, cards.flatMap(card => card.children[0] ? [card.children[0]] : []), true);
          reveal(desk, cards.flatMap(card => card.children[1] ? [card.children[1]] : []), false, .18);
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
          if (enquiry) reveal(enquiry, Array.from(enquiry.children).filter(child => !child.hasAttribute("data-editorial-copy")));
        });
        match.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          if (region !== "content") return;
          const enquiry = page.querySelector('[aria-labelledby="home-enquiry-title"]');
          const heading = enquiry?.querySelector("[data-editorial-copy]");
          if (enquiry && heading) gsap.fromTo(heading, { y: 18 }, {
            y: -18, ease: "none",
            scrollTrigger: { trigger: enquiry, start: "top bottom", end: "bottom top", scrub: 1.55 },
          });
        });
      }, page);
      cleanup = () => { match.revert(); context.revert(); };
      ScrollTrigger.refresh();
      element.dataset.homeMotionReady = "true";
    }).catch(() => {
      cleanup?.();
      // The static, visible presentation is the fallback if motion cannot load.
      if (!disposed) element.dataset.homeMotionReady = "true";
    });
    return () => { disposed = true; cleanup?.(); };
  }, [pathname, region]);

  const attach = (element: HTMLElement | null) => { root.current = element; };
  return region === "footer"
    ? <footer ref={attach} className="site-footer" data-home-header-tone="dark" data-home-motion-ready="false">{children}</footer>
    : <div ref={attach} style={{ display: "contents" }} data-home-motion-ready="false">{children}</div>;
}
