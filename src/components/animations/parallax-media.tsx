"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { motionMedia } from "@/animations/presets";

type ParallaxMediaProps = Readonly<{
  children: React.ReactNode;
  className?: string;
}>;

export function ParallaxMedia({
  children,
  className = "",
}: ParallaxMediaProps) {
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

        const matchMedia = gsap.matchMedia();
        const context = gsap.context(() => {
          const media = root.firstElementChild;

          if (!media) {
            return;
          }

          matchMedia.add(
            {
              desktop: motionMedia.desktop,
              tablet: motionMedia.tablet,
            },
            ({ conditions }) => {
              const distance = conditions?.desktop ? 5 : 2.5;

              gsap.fromTo(
                media,
                { scale: 1.12, yPercent: -distance },
                {
                  scale: 1.12,
                  yPercent: distance,
                  ease: "none",
                  scrollTrigger: {
                    trigger: root,
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 0.7,
                    invalidateOnRefresh: true,
                  },
                },
              );
            },
          );
        }, root);

        cleanup = () => {
          matchMedia.revert();
          context.revert();
        };
      })
      .catch(() => {
        // Parallax is progressive enhancement; the media remains static.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return (
    <div className={className} ref={rootRef}>
      {children}
    </div>
  );
}
