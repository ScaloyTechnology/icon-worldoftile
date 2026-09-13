"use client";

type GsapModules = Readonly<{
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
}>;

let gsapModulesPromise: Promise<GsapModules> | undefined;

export function loadGsap(): Promise<GsapModules> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("GSAP animation modules can only be loaded in the browser."),
    );
  }

  gsapModulesPromise ??= Promise.all([
    import("gsap"),
    import("gsap/ScrollTrigger"),
  ]).then(([gsapModule, scrollTriggerModule]) => {
    const gsap = gsapModule.gsap;
    const ScrollTrigger = scrollTriggerModule.ScrollTrigger;

    gsap.registerPlugin(ScrollTrigger);

    return { gsap, ScrollTrigger };
  });

  return gsapModulesPromise;
}
