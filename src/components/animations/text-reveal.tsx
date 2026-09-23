"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { motionEase, scrollRevealDefaults } from "@/animations/presets";

type TextRevealProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  start?: string;
}>;

export function TextReveal({
  children,
  className = "",
  start = "top 74%",
}: TextRevealProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;

    if (
      !root ||
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

        const lines = root.querySelectorAll("[data-text-line] > span");

        if (lines.length === 0) {
          return;
        }

        const context = gsap.context(() => {
          gsap.fromTo(
            lines,
            { rotate: 1, transformOrigin: "left bottom", yPercent: 112 },
            {
              rotate: 0,
              yPercent: 0,
              duration: 0.95,
              ease: motionEase.editorial,
              stagger: 0.09,
              scrollTrigger: {
                trigger: root,
                start,
                once: scrollRevealDefaults.once,
              },
            },
          );
        }, root);

        cleanup = () => context.revert();
      })
      .catch(() => {
        // Text remains in its server-rendered position without enhancement.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [start]);

  return (
    <div className={className} ref={rootRef}>
      {children}
    </div>
  );
}
