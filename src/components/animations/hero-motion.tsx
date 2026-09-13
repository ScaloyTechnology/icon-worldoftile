"use client";

import { useEffect, useRef } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { motionMedia } from "@/animations/presets";

export function HeroMotion({ children, className = "" }: Readonly<{ children: React.ReactNode; className?: string }>) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void loadGsap().then(({ gsap }) => {
      if (cancelled) return;
      const mm = gsap.matchMedia();
      mm.add({ desktop: motionMedia.desktop, tablet: motionMedia.tablet, mobile: motionMedia.mobile }, ({ conditions }) => {
        const context = gsap.context(() => {
          const mobile = conditions?.mobile;
          // One coordinated entrance: primary content is usable within 1.5 seconds.
          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
          tl.fromTo("[data-hero-media]", { opacity: 0.5, scale: mobile ? 1.02 : 1.055, clipPath: "inset(4% 0 0 0)" },
            { opacity: 1, scale: 1, clipPath: "inset(0)", duration: mobile ? 0.65 : 1.25 }, 0)
            .fromTo("[data-hero-eyebrow]", { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5 }, 0.12)
            .fromTo("[data-hero-line] > span", { yPercent: 110 }, { yPercent: 0, duration: mobile ? 0.65 : 0.95, stagger: 0.08 }, 0.22)
            .fromTo("[data-hero-supporting]", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6 }, 0.72)
            .fromTo("[data-hero-scroll]", { opacity: 0 }, { opacity: 1, duration: 0.45 }, 1.0);
          if (conditions?.desktop) {
            const media = root.querySelector("[data-hero-media]")?.firstElementChild;
            const heading = root.querySelector("[data-hero-heading]");
            const scroll = gsap.timeline({ scrollTrigger: { trigger: root, start: "top top", end: "bottom top", scrub: 0.65, invalidateOnRefresh: true } });
            if (media) scroll.fromTo(media, { scale: 1.06, yPercent: -3 }, { scale: 1.02, yPercent: 3, ease: "none" }, 0);
            if (heading) scroll.to(heading, { y: -55, opacity: 0.35, ease: "none" }, 0);
          }
        }, root);
        return () => context.revert();
      });
      cleanup = () => mm.revert();
    }).catch(() => { /* Server-rendered content is visible without motion. */ });
    return () => { cancelled = true; cleanup?.(); };
  }, []);
  return <div className={className} ref={rootRef}>{children}</div>;
}
