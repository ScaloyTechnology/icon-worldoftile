"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { loadGsap } from "@/animations/load-gsap";

/** One route-scoped GSAP context. Content remains visible without JS or on failed imports. */
export function MotionRoot({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (disposed || !root.current) return;
        ScrollTrigger.config({ ignoreMobileResize: true });
        const match = gsap.matchMedia();
        const context = gsap.context(() => {
          match.add("(prefers-reduced-motion: no-preference)", () => {
            const heroLines =
              gsap.utils.toArray<HTMLElement>("[data-hero-line]");
            if (heroLines.length)
              gsap.from(heroLines, {
                yPercent: 105,
                duration: 1.15,
                stagger: 0.13,
                ease: "power3.out",
                clearProps: "all",
              });
            const reveals = gsap.utils.toArray<HTMLElement>("[data-reveal]");
            const revealTriggers = reveals.length
              ? ScrollTrigger.batch(reveals, {
                  start: "top 90%",
                  once: true,
                  interval: 0.08,
                  batchMax: 4,
                  onEnter: (batch) =>
                    gsap.from(batch, {
                      autoAlpha: 0,
                      y: 18,
                      duration: 0.68,
                      stagger: 0.08,
                      ease: "power2.out",
                      clearProps: "all",
                    }),
                })
              : [];

            const copyTweens = gsap.utils
              .toArray<HTMLElement>("[data-home-copy]")
              .map((group) =>
                gsap.from(Array.from(group.children), {
                  autoAlpha: 0,
                  y: 32,
                  duration: 1.05,
                  stagger: 0.11,
                  ease: "power3.out",
                  clearProps: "all",
                  scrollTrigger: {
                    trigger: group,
                    start: "top 86%",
                    once: true,
                  },
                }),
              );

            const staggerTweens = gsap.utils
              .toArray<HTMLElement>("[data-stagger-reveal]")
              .map((group) =>
                gsap.from(Array.from(group.children), {
                  autoAlpha: 0,
                  y: 24,
                  duration: 0.88,
                  stagger: 0.09,
                  ease: "power2.out",
                  clearProps: "all",
                  scrollTrigger: {
                    trigger: group,
                    start: "top 88%",
                    once: true,
                  },
                }),
              );

            return () => {
              revealTriggers.forEach((trigger) => trigger.kill());
              [...copyTweens, ...staggerTweens].forEach((tween) => {
                tween.scrollTrigger?.kill();
                tween.kill();
              });
            };
          });
          match.add(
            "(min-width: 900px) and (prefers-reduced-motion: no-preference)",
            () => {
              gsap.utils
                .toArray<HTMLElement>("[data-parallax]")
                .forEach((frame) => {
                  const media =
                    frame.querySelector<HTMLElement>("img") ?? frame;
                  gsap.fromTo(
                    media,
                    { yPercent: -2.5, scale: 1.045, force3D: true },
                    {
                      yPercent: 2.5,
                      scale: 1.045,
                      force3D: true,
                      ease: "none",
                      scrollTrigger: {
                        trigger: frame,
                        start: "top bottom",
                        end: "bottom top",
                        scrub: 1.1,
                      },
                    },
                  );
                });
              const imageReveals = gsap.utils.toArray<HTMLElement>(
                "[data-image-reveal]",
              );
              const imageTriggers = imageReveals.length
                ? ScrollTrigger.batch(imageReveals, {
                    start: "top 85%",
                    once: true,
                    interval: 0.1,
                    batchMax: 3,
                    onEnter: (batch) =>
                      gsap.from(batch, {
                        autoAlpha: 0,
                        clipPath: "inset(8% 0 8% 0)",
                        y: 28,
                        duration: 1.2,
                        stagger: 0.12,
                        ease: "power3.out",
                        clearProps: "all",
                      }),
                  })
                : [];
              return () => imageTriggers.forEach((trigger) => trigger.kill());
            },
          );
        }, root);
        cleanup = () => {
          match.revert();
          context.revert();
        };
      })
      .catch(() => {
        /* Progressive enhancement: keep all content accessible. */
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [pathname]);
  return <div ref={root}>{children}</div>;
}
