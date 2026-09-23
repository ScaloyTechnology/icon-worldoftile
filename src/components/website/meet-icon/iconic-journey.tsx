"use client";

import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { motionEase, motionMedia } from "@/animations/presets";
import { MediaFrame } from "@/components/ui/media-frame";
import type { JourneyItem } from "@/types/meet-icon";

type IconicJourneyProps = Readonly<{
  items: readonly JourneyItem[];
}>;

export function IconicJourney({ items }: IconicJourneyProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const pin = pinRef.current;

    if (!root || !pin) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (cancelled) {
          return;
        }

        const panels = Array.from(
          root.querySelectorAll<HTMLElement>("[data-journey-panel]"),
        );
        const progress = root.querySelector<HTMLElement>(
          "[data-journey-progress]",
        );
        const matchMedia = gsap.matchMedia();
        const context = gsap.context(() => {
          matchMedia.add(motionMedia.desktop, () => {
            const firstPanel = panels[0];

            if (!firstPanel) {
              return;
            }

            gsap.set(pin, { minHeight: "100svh" });
            gsap.set(panels, {
              autoAlpha: 0,
              inset: 0,
              pointerEvents: "none",
              position: "absolute",
              yPercent: 9,
            });
            gsap.set(firstPanel, {
              autoAlpha: 1,
              pointerEvents: "auto",
              yPercent: 0,
            });
            gsap.set(progress, { scaleX: 0, transformOrigin: "left" });

            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: root,
                start: "top top",
                end: () => `+=${window.innerHeight * 2.35}`,
                pin,
                pinSpacing: true,
                scrub: 1.2,
                invalidateOnRefresh: true,
                anticipatePin: 1,
              },
            });

            if (progress) {
              timeline.to(
                progress,
                {
                  scaleX: 1,
                  duration: Math.max(1, panels.length - 1),
                  ease: "none",
                },
                0,
              );
            }

            panels.slice(1).forEach((panel, index) => {
              const previous = panels[index];
              const position = index + 0.72;

              if (!previous) {
                return;
              }

              timeline
                .to(
                  previous,
                  {
                    autoAlpha: 0,
                    pointerEvents: "none",
                    yPercent: -7,
                    duration: 0.42,
                    ease: "power2.in",
                  },
                  position,
                )
                .fromTo(
                  panel,
                  { autoAlpha: 0, yPercent: 9 },
                  {
                    autoAlpha: 1,
                    pointerEvents: "auto",
                    yPercent: 0,
                    duration: 0.58,
                    ease: motionEase.entrance,
                  },
                  position + 0.18,
                );
            });
          });

          matchMedia.add(
            {
              mobile: motionMedia.mobile,
              tablet: motionMedia.tablet,
            },
            () => {
              panels.forEach((panel) => {
                gsap.fromTo(
                  panel,
                  { autoAlpha: 0, clipPath: "inset(0 0 12% 0)", y: 28 },
                  {
                    autoAlpha: 1,
                    clipPath: "inset(0 0 0% 0)",
                    y: 0,
                    duration: 0.82,
                    ease: motionEase.reveal,
                    scrollTrigger: {
                      trigger: panel,
                      start: "top 72%",
                      once: true,
                    },
                  },
                );
              });
            },
          );
        }, root);

        cleanup = () => {
          matchMedia.revert();
          context.revert();
        };

        void document.fonts.ready.then(() => {
          if (!cancelled) {
            ScrollTrigger.refresh();
          }
        });
      })
      .catch(() => {
        // The complete vertical story remains readable without GSAP.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [items.length]);

  return (
    <div ref={rootRef}>
      <div className="relative" ref={pinRef}>
        {items.map((item, index) => (
          <article
            className="grid min-h-[78svh] gap-9 border-t border-on-dark/15 py-10 md:grid-cols-12 md:items-center md:gap-x-10 lg:min-h-[100svh] lg:py-20"
            data-journey-panel
            key={item.id}
          >
            <div className="md:col-span-5 lg:col-span-4">
              <p className="type-label text-on-dark-muted">{item.label}</p>
              <h3 className="type-h2 mt-5">{item.title}</h3>
              <p className="type-body-lg mt-7 max-w-lg text-on-dark-muted">
                {item.description}
              </p>
              <p className="type-caption mt-10 text-on-dark-muted">
                {String(index + 1).padStart(2, "0")} /{" "}
                {String(items.length).padStart(2, "0")}
              </p>
            </div>

            <MediaFrame
              className="aspect-[4/5] md:col-span-7 md:aspect-[5/4] lg:col-span-7 lg:col-start-6"
              media={item.media}
              sizes="(min-width: 1024px) 56vw, (min-width: 768px) 58vw, 100vw"
            />
          </article>
        ))}

        <span
          aria-hidden="true"
          className="absolute right-0 bottom-8 left-0 hidden h-px bg-on-dark/15 lg:block"
        >
          <span className="block h-full bg-accent" data-journey-progress />
        </span>
      </div>
    </div>
  );
}
