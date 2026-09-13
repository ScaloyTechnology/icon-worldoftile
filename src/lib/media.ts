export type EditorialMedia = { src: string; alt: string; width: number; height: number; sourceLabel: string };
export const editorialMedia: Record<string, EditorialMedia> = {
  hero: { src: "/media/hero-room.webp", alt: "Light-filled living space with pale architectural tile surfaces and a curved cream sofa", width: 1920, height: 1370, sourceLabel: "ENIGMA CREMA CAPSUL PUNCH" },
  stone: { src: "/media/stone-room.webp", alt: "Sunlit stone-look tiled living area with woven chairs and tall glazing", width: 1200, height: 848, sourceLabel: "CROSS CUT & VIEN CUT BEIGE" },
  wood: { src: "/media/wood-room.webp", alt: "Dining area viewed from above, with warm wood-look flooring", width: 1000, height: 500, sourceLabel: "17003 preview" },
  detail: { src: "/media/material-detail.webp", alt: "Close view of a grey tile floor beside a lounge chair and round table", width: 1200, height: 840, sourceLabel: "MYSTONE GREY" },
  application: { src: "/media/application-room.webp", alt: "Open terrace dining area framed by warm neutral tile surfaces", width: 1400, height: 990, sourceLabel: "MYSTONE OPAL + SPECTRA EARTH" },
  polar: { src: "/media/material-polar-charcoal.webp", alt: "Close view of a dark charcoal tile surface", width: 1200, height: 800, sourceLabel: "POLAR CHARCOAL" },
  austin: { src: "/media/material-austin-silver.webp", alt: "Close view of a pale silver stone-look tile surface", width: 1200, height: 800, sourceLabel: "AUSTIN SILVER" },
  travertine: { src: "/media/material-travertine-sand.webp", alt: "Close view of a warm sand-coloured linear stone surface", width: 1200, height: 800, sourceLabel: "TRAVERTINO HONEY" },
};

export function getEditorialMedia(key: string): EditorialMedia {
  const item = editorialMedia[key];
  if (!item) throw new Error(`Unknown editorial media key: ${key}`);
  return item;
}
/** Storage keys are independent of provider. Only a configured HTTPS CDN is accepted. */
export function mediaUrl(key: string, base = process.env.MEDIA_BASE_URL) {
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes("..") || key.startsWith("/")) throw new Error("Invalid media key");
  if (!base) return `/media/${key}`;
  const origin = new URL(base);
  if (origin.protocol !== "https:") throw new Error("Media CDN must use HTTPS");
  return new URL(key, `${origin.href.replace(/\/$/, "")}/`).href;
}
