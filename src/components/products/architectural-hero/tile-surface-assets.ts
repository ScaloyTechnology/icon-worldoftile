import type { HomepageHeroCategory } from "@/types/homepage-content";

// Matched original colour/height pair supplied in tile 1.rar. Keep both maps
// in the same orientation; relief must never be inferred from printed veins.
export const MATT_REFERENCE_URL = "/assets/home/iro-mud/IRO%20MUD%20sq%20diffuse.jpg";
export const MATT_BUMP_URL = "/assets/home/iro-mud/IRO%20MUD%20sq%20bump.jpg";

export function withMattReference(category: HomepageHeroCategory): HomepageHeroCategory {
  if (category.productImage.src && !category.productImage.src.startsWith("/assets/home/october-edit/")) return category;
  if (!/\bmatt\b/i.test(`${category.id} ${category.title}`)) return category;
  return { ...category, productImage: { ...category.productImage, src: MATT_REFERENCE_URL, width: 1200, height: 1200 } };
}

/** Resize only above the GPU budget; do not upscale or filter source colours. */
export function tileColorSource(image: HTMLImageElement): HTMLImageElement | HTMLCanvasElement {
  const longest = Math.max(image.naturalWidth, image.naturalHeight);
  if (longest <= 2048) return image;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.naturalWidth * 2048 / longest);
  canvas.height = Math.round(image.naturalHeight * 2048 / longest);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tile colour canvas unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function loadTileImage(url: string, signal: AbortSignal): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("Tile load cancelled")); return; }
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    const clean = () => {
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      signal.removeEventListener("abort", abort);
    };
    const fail = (message: string) => {
      clean();
      image.src = "";
      reject(new Error(message));
    };
    const abort = () => fail("Tile load cancelled");
    const timeout = setTimeout(() => fail("Tile image load timed out"), 30000);
    image.onload = () => {
      if (!image.naturalWidth || !image.naturalHeight) { fail("Empty tile image"); return; }
      clean();
      resolve(image);
    };
    image.onerror = () => fail("Tile image failed to load");
    signal.addEventListener("abort", abort, { once: true });
    image.src = url;
  });
}

/** Centred cover fit: every sampled UV stays inside the source image. */
export function tileCover(image: HTMLImageElement) {
  const aspect = image.naturalWidth / image.naturalHeight;
  const repeatX = Math.min(1, 1 / aspect);
  const repeatY = Math.min(1, aspect);
  return { repeatX, repeatY, offsetX: (1 - repeatX) / 2, offsetY: (1 - repeatY) / 2 };
}

/** Only relief maps use this canvas. The colour map uses the original image. */
export function tileHeightCanvas(image: HTMLImageElement, outputSize?: number): HTMLCanvasElement {
  const fit = tileCover(image);
  const side = outputSize ?? Math.min(2048, image.naturalWidth, image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Tile relief canvas unavailable");
  context.drawImage(image,
    image.naturalWidth * fit.offsetX, image.naturalHeight * fit.offsetY,
    image.naturalWidth * fit.repeatX, image.naturalHeight * fit.repeatY,
    0, 0, side, side);
  return canvas;
}
