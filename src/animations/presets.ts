export const scrollRevealDefaults = {
  start: "top 74%",
  once: true,
} as const;

export const motionEase = {
  entrance: "power3.out",
  reveal: "power2.out",
  editorial: "expo.out",
} as const;

export const motionDuration = {
  fast: 0.45,
  base: 0.8,
  slow: 1.15,
} as const;

export const motionMedia = {
  desktop: "(min-width: 64rem) and (prefers-reduced-motion: no-preference)",
  tablet:
    "(min-width: 48rem) and (max-width: 63.999rem) and (prefers-reduced-motion: no-preference)",
  mobile: "(max-width: 47.999rem) and (prefers-reduced-motion: no-preference)",
  reduced: "(prefers-reduced-motion: reduce)",
} as const;
