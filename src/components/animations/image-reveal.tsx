"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { motionEase, scrollRevealDefaults } from "@/animations/presets";

type ImageRevealProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  direction?: "horizontal" | "vertical";
  start?: string;
}>;

export function ImageReveal({
  children,
  className = "",
  direction = "vertical",
  start = "top 82%",
}: ImageRevealProps) {
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

        const inner = root.firstElementChild;
        const context = gsap.context(() => {
          const timeline = gsap.timeline({
            defaults: { ease: motionEase.editorial },
            scrollTrigger: {
              trigger: root,
              start,
              once: scrollRevealDefaults.once,
            },
          });

          timeline.fromTo(
            root,
            {
              clipPath:
                direction === "horizontal"
                  ? "inset(0 100% 0 0)"
                  : "inset(100% 0 0 0)",
            },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1.05 },
          );

          if (inner) {
            timeline.fromTo(
              inner,
              { scale: 1.09 },
              { scale: 1, duration: 1.2 },
              "<",
            );
          }
        }, root);

        cleanup = () => context.revert();
      })
      .catch(() => {
        // Media remains visible when the progressive animation cannot load.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [direction, start]);

  return (
    <div className={`overflow-hidden ${className}`} ref={rootRef}>
      {children}
    </div>
  );
}
