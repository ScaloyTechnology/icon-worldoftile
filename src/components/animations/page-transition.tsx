"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { loadGsap } from "@/animations/load-gsap";
import { motionEase } from "@/animations/presets";

type PageTransitionProps = Readonly<{
  children: React.ReactNode;
}>;

export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
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

        const context = gsap.context(() => {
          gsap.fromTo(
            root,
            { clipPath: "inset(0 0 3rem 0)", y: 14 },
            {
              clipPath: "inset(0 0 0rem 0)",
              y: 0,
              duration: 0.55,
              ease: motionEase.entrance,
              clearProps: "clipPath,transform",
            },
          );
        }, root);

        cleanup = () => context.revert();
      })
      .catch(() => {
        // Navigation remains immediate and usable without the visual entrance.
      });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [pathname]);

  return (
    <div className="flex flex-1 flex-col" ref={rootRef}>
      {children}
    </div>
  );
}
