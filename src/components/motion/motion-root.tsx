"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
/** One route-scoped GSAP context. Content remains visible without JS or on failed imports. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ gsap }, { ScrollTrigger }]) => {
      if (disposed || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          const heroLines = gsap.utils.toArray<HTMLElement>("[data-hero-line]");
          if (heroLines.length) gsap.from(heroLines, { yPercent: 105, duration: 1.15, stagger: .13, ease: "power3.out", clearProps: "all" });
          gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach(el => gsap.from(el, { opacity: 0, duration: .85, ease: "power2.out", scrollTrigger: { trigger: el, start: "top 90%", once: true }, clearProps: "all" }));
        });
        match.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          gsap.utils.toArray<HTMLElement>("[data-parallax]").forEach(el => gsap.fromTo(el, { yPercent: -2, force3D: true }, { yPercent: 2, force3D: true, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: 1.05 } }));
          gsap.utils.toArray<HTMLElement>("[data-image-reveal]").forEach(el => gsap.from(el, { clipPath: "inset(0 0 12% 0)", duration: 1.2, scrollTrigger: { trigger: el, start: "top 85%", once: true }, clearProps: "all" }));
        });
      }, root);
      cleanup = () => { match.revert(); context.revert(); };
    }).catch(() => { /* Progressive enhancement: keep all content accessible. */ });
    return () => { disposed = true; cleanup?.(); };
  }, [pathname]);
  return <div ref={root}>{children}</div>;
}
