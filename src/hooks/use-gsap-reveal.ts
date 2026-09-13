"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import {
  motionDuration,
  motionEase,
  scrollRevealDefaults,
} from "@/animations/presets";

export type RevealVariant = "editorial" | "mask" | "soft";

type RevealOptions = Readonly<{
  delay?: number;
  distance?: number;
  duration?: number;
  start?: string;
  variant?: RevealVariant;
}>;

export function useGsapReveal<TElement extends HTMLElement>({
  delay = 0,
  distance = 28,
  duration = motionDuration.base,
  start = scrollRevealDefaults.start,
  variant = "editorial",
}: RevealOptions = {}) {
  const elementRef = useRef<TElement>(null);

  useEffect(() => {
    const element = elementRef.current;

    if (
      !element ||
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
          const fromVars =
            variant === "mask"
              ? {
                  autoAlpha: 0.72,
                  clipPath: "inset(0 0 18% 0)",
                  y: distance,
                }
              : variant === "soft"
                ? { autoAlpha: 0, y: distance * 0.55 }
                : {
                    autoAlpha: 0,
                    clipPath: "inset(0 0 8% 0)",
                    y: distance,
                  };

          gsap.fromTo(element, fromVars, {
            autoAlpha: 1,
            clipPath: "inset(0 0 0% 0)",
            y: 0,
            delay,
            duration,
            ease: motionEase.reveal,
            scrollTrigger: {
              trigger: element,
              start,
              once: scrollRevealDefaults.once,
            },
          });
        }, element);

        cleanup = () => context.revert();
      })
      .catch(() => {
        // Content remains visible if the optional animation bundle cannot load.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [delay, distance, duration, start, variant]);

  return elementRef;
}
