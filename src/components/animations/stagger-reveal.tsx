"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { motionEase } from "@/animations/presets";

type StaggerVariant = "depth" | "directional" | "rise" | "sequence";

type StaggerRevealProps = Readonly<{
  children: React.ReactNode;
  className?: string;
  variant?: StaggerVariant;
}>;

export function StaggerReveal({
  children,
  className = "",
  variant = "rise",
}: StaggerRevealProps) {
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

        const items = root.querySelectorAll("[data-stagger-item]");
        const context = gsap.context(() => {
          const fromVars =
            variant === "depth"
              ? {
                  autoAlpha: 0,
                  clipPath: "inset(12% 0 0 0)",
                  scale: 0.965,
                  y: 56,
                }
              : variant === "directional"
                ? {
                    autoAlpha: 0,
                    clipPath: "inset(0 8% 0 0)",
                    x: 36,
                  }
                : variant === "sequence"
                  ? { autoAlpha: 0, clipPath: "inset(0 0 16% 0)", y: 20 }
                  : { autoAlpha: 0, y: 36 };

          gsap.fromTo(items, fromVars, {
            autoAlpha: 1,
            clipPath: "inset(0% 0% 0% 0%)",
            scale: 1,
            x: 0,
            y: 0,
            duration: variant === "depth" ? 1 : 0.8,
            stagger: variant === "sequence" ? 0.13 : 0.09,
            ease: motionEase.reveal,
            scrollTrigger: {
              trigger: root,
              start: "top 80%",
              once: true,
            },
          });
        }, root);

        cleanup = () => context.revert();
      })
      .catch(() => {
        // Keep the content visible if progressive animation is unavailable.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [variant]);

  return (
    <div className={className} ref={rootRef}>
      {children}
    </div>
  );
}
