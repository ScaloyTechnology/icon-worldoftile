"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";

export function ScrollProgress() {
  const progressRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const progress = progressRef.current;

    if (
      !progress ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void loadGsap()
      .then(({ gsap }) => {
        if (cancelled) {
          return;
        }

        const context = gsap.context(() => {
          gsap.fromTo(
            progress,
            { scaleY: 0 },
            {
              scaleY: 1,
              ease: "none",
              scrollTrigger: {
                trigger: document.documentElement,
                start: "top top",
                end: "bottom bottom",
                scrub: 0.2,
              },
            },
          );
        });

        cleanup = () => context.revert();
      })
      .catch(() => {
        // The native scrollbar remains the primary progress affordance.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <span
      aria-hidden="true"
      className="pointer-events-none fixed top-0 right-0 z-[80] hidden h-screen w-px bg-on-dark/20 lg:block"
    >
      <span className="block h-full origin-top bg-accent" ref={progressRef} />
    </span>
  );
}
