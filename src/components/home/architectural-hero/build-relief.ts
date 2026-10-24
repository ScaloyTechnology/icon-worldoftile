import * as THREE from "three";
import { tileHeightCanvas } from "./tile-surface-assets";

export type ReliefOptions = {
  heightImage?: HTMLImageElement;
  ridgeStrength: number;
  fineStrength: number;
  grooveGrid: { cols: number; rows: number } | null;
  normalScale: number;
  baseRoughness: number;
  anisotropy: number;
  cancelled: () => boolean;
};

const clamp = THREE.MathUtils.clamp;
const smooth = THREE.MathUtils.smoothstep;

/** Prefer authored height; infer relief only for tiles without a supplied map.
 * Never modifies or returns a colour image. */
export async function buildRelief(image: HTMLImageElement, options: ReliefOptions) {
  // Keep the authored bump at native detail. Photo-inferred relief needs a
  // smaller working map; the original colour texture remains full resolution.
  const canvas = tileHeightCanvas(image, Math.min(options.heightImage ? 2048 : 1024, image.naturalWidth, image.naturalHeight));
  const size = canvas.width;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Relief canvas unavailable");
  const pixels = context.getImageData(0, 0, size, size).data;
  const count = size * size;
  const lum = new Float32Array(count);
  const column = new Float32Array(size);
  const row = new Float32Array(size);
  let red = 0, green = 0, blue = 0, borderSamples = 0;
  const border = Math.max(2, Math.round(size * .015));
  let sliceStarted = performance.now();
  const yieldWork = async () => {
    if (options.cancelled()) throw new Error("Relief generation cancelled");
    // Nested zero-delay timers are clamped by browsers. Yield on a time budget
    // instead of paying that delay for every 32 rows in every image pass.
    if (performance.now() - sliceStarted < 6) return;
    await new Promise<void>(resolve => setTimeout(resolve, 0));
    if (options.cancelled()) throw new Error("Relief generation cancelled");
    sliceStarted = performance.now();
  };
  for (let y = 0; y < size; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < size; x++) {
      const p = y * size + x, i = p * 4;
      const value = (pixels[i]! * .2126 + pixels[i + 1]! * .7152 + pixels[i + 2]! * .0722) / 255;
      lum[p] = value;
      column[x] = column[x]! + value / size;
      row[y] = row[y]! + value / size;
      if (Math.min(x, y, size - 1 - x, size - 1 - y) < border) {
        red += pixels[i]!; green += pixels[i + 1]!; blue += pixels[i + 2]!; borderSamples++;
      }
    }
  }

  // Separable Gaussian passes, clamped at all borders. Work is chunked so
  // preloading never monopolizes the animation frame or pointer interaction.
  const blur = async (field: Float32Array, sigma: number) => {
    const radius = Math.ceil(sigma * 2);
    const kernel = new Float32Array(radius * 2 + 1);
    let sum = 0;
    for (let k = -radius; k <= radius; k++) {
      const weight = Math.exp(-k * k / (2 * sigma * sigma));
      kernel[k + radius] = weight; sum += weight;
    }
    for (let k = 0; k < kernel.length; k++) kernel[k] = kernel[k]! / sum;
    const horizontal = new Float32Array(count), result = new Float32Array(count);
    for (let y = 0; y < size; y++) {
      if (y % 32 === 0) await yieldWork();
      for (let x = 0; x < size; x++) {
        let value = 0;
        for (let k = -radius; k <= radius; k++) value += field[y * size + clamp(x + k, 0, size - 1)]! * kernel[k + radius]!;
        horizontal[y * size + x] = value;
      }
    }
    for (let y = 0; y < size; y++) {
      if (y % 32 === 0) await yieldWork();
      for (let x = 0; x < size; x++) {
        let value = 0;
        for (let k = -radius; k <= radius; k++) value += horizontal[clamp(y + k, 0, size - 1) * size + x]! * kernel[k + radius]!;
        result[y * size + x] = value;
      }
    }
    return result;
  };
  // Authored relief does not use colour-derived detail or vein detection.
  const fineBlur = options.heightImage ? lum : await blur(lum, 1);
  const ridgeBlur = options.heightImage ? lum : await blur(lum, 2);
  let authoredHeight: Float32Array | null = null;
  let authoredDetail: Float32Array | null = null;
  if (options.heightImage) {
    // Read height as linear data, without sRGB decoding or colour tinting.
    // Identical crop, resolution and flipY keep the relief aligned to the print.
    const heightCanvas = tileHeightCanvas(options.heightImage, size);
    const heightContext = heightCanvas.getContext("2d", { willReadFrequently: true });
    if (!heightContext) throw new Error("Authored tile height unavailable");
    const heightPixels = heightContext.getImageData(0, 0, size, size).data;
    const sourceHeight = new Float32Array(count);
    for (let y = 0; y < size; y++) {
      if (y % 32 === 0) await yieldWork();
      for (let x = 0; x < size; x++) {
        const p = y * size + x, i = p * 4;
        sourceHeight[p] = (heightPixels[i]! * .2126 + heightPixels[i + 1]! * .7152 + heightPixels[i + 2]! * .0722) / 255;
      }
    }
    // Gentle prefilter suppresses JPEG/noise aliasing at grazing angles.
    // Preserve the supplied heights: no contrast stretch or invented joints.
    authoredHeight = await blur(sourceHeight, 1);
    authoredDetail = await blur(authoredHeight, 2);
    const broadRelief = await blur(authoredHeight, 6);
    // Separate the supplied stone ridges from its finer pores. Lift each
    // gently without sharpening raw JPEG pixels or adding unrelated noise.
    for (let y = 0; y < size; y++) {
      if (y % 32 === 0) await yieldWork();
      for (let x = 0; x < size; x++) {
        const p = y * size + x;
        const ridge = authoredDetail[p]! - broadRelief[p]!;
        const grain = authoredHeight[p]! - authoredDetail[p]!;
        authoredHeight[p] = clamp(broadRelief[p]! + ridge * 1.25 + grain * 1.2, 0, 1);
      }
    }
  }
  const grid = authoredHeight ? null : options.grooveGrid;
  const cellCount = grid ? grid.cols * grid.rows : 1;
  const cellEnergy = new Float32Array(cellCount), cellSamples = new Uint32Array(cellCount);
  const cellAt = (x: number, y: number) => grid
    ? Math.min(grid.rows - 1, Math.floor(y / size * grid.rows)) * grid.cols + Math.min(grid.cols - 1, Math.floor(x / size * grid.cols)) : 0;
  for (let y = 0; grid && y < size; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < size; x++) {
      const p = y * size + x, cell = cellAt(x, y);
      cellEnergy[cell] = cellEnergy[cell]! + Math.abs(lum[p]! - fineBlur[p]!);
      cellSamples[cell] = cellSamples[cell]! + 1;
    }
  }
  for (let cell = 0; cell < cellCount; cell++) cellEnergy[cell] = cellEnergy[cell]! / Math.max(1, cellSamples[cell]!);

  const joints = (profile: Float32Array, cells: number) => {
    const lines = [0];
    const range = Math.max(2, Math.round(size * .008));
    for (let boundary = 1; boundary < cells; boundary++) {
      const expected = Math.round(boundary * size / cells);
      let best = expected, score = Infinity;
      for (let p = expected - range; p <= expected + range; p++) {
        const value = (profile[p - 1]! + profile[p]! * 2 + profile[p + 1]!) / 4;
        // Prefer a local luminance valley close to the known grid rather than
        // wandering into a dark slate ridge several pixels inside a cell.
        if (profile[p]! > profile[p - 1]! || profile[p]! > profile[p + 1]!) continue;
        const candidate = value + .006 * Math.abs(p - expected) / range;
        if (candidate < score) { best = p; score = candidate; }
      }
      lines.push(best);
    }
    lines.push(size - 1);
    return lines;
  };
  const distanceField = (lines: number[]) => {
    const field = new Float32Array(size);
    for (let p = 0; p < size; p++) {
      let nearest = size;
      for (const line of lines) nearest = Math.min(nearest, Math.abs(p - line));
      field[p] = nearest;
    }
    return field;
  };
  const gx = grid ? distanceField(joints(column, grid.cols)) : null;
  const gy = grid ? distanceField(joints(row, grid.rows)) : null;
  const height = new Float32Array(count);
  let minimum = Infinity, maximum = -Infinity;
  for (let y = 0; y < size; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const fine = lum[p]! - fineBlur[p]!;
      const cleftBoost = grid ? 1 + .28 * smooth(cellEnergy[cellAt(x, y)]!, .006, .025) : 1;
      const ridge = ridgeBlur[p]! + (ridgeBlur[p]! - .5) * (cleftBoost - 1);
      const value = authoredHeight ? authoredHeight[p]! : options.ridgeStrength * ridge + options.fineStrength * fine * 3;
      height[p] = value;
      minimum = Math.min(minimum, value); maximum = Math.max(maximum, value);
    }
  }
  const range = Math.max(.08, maximum - minimum);
  const halfGroove = size * .006 / 2;
  const grooveAt = (x: number, y: number) => gx && gy
    ? Math.min(gx[x]!, gy[y]!) : size;
  for (let y = 0; !authoredHeight && y < size; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < size; x++) {
      const p = y * size + x;
      const normalized = clamp(((height[p]! - minimum) / range - .5) * 1.12 + .5, 0, 1);
      const distance = grooveAt(x, y);
      const groove = 1 - smooth(distance, Math.max(0, halfGroove - 2), halfGroove + 2);
      const bevel = 1 - smooth(distance, halfGroove + 2, halfGroove + 5);
      height[p] = clamp(normalized - .35 * groove - .06 * bevel, 0, 1);
    }
  }

  const normalCanvas = document.createElement("canvas"), roughnessCanvas = document.createElement("canvas");
  normalCanvas.width = normalCanvas.height = roughnessCanvas.width = roughnessCanvas.height = size;
  const normalContext = normalCanvas.getContext("2d"), roughnessContext = roughnessCanvas.getContext("2d");
  if (!normalContext || !roughnessContext) throw new Error("Relief output unavailable");
  const normalPixels = normalContext.createImageData(size, size), roughnessPixels = roughnessContext.createImageData(size, size);
  // Derivatives are measured per texel. Scale authored relief with resolution
  // for a consistent, shallow stone surface rather than exaggerated gravel.
  const slopeStrength = authoredHeight ? size * .0042 : 2.75;
  const at = (x: number, y: number) => height[clamp(y, 0, size - 1) * size + clamp(x, 0, size - 1)]!;
  const noise = (x: number, y: number, salt = 0) => {
    let value = Math.imul(x + salt, 374761393) ^ Math.imul(y + 1, 668265263);
    value = Math.imul(value ^ (value >>> 13), 1274126177);
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  };
  for (let y = 0; y < size; y++) {
    if (y % 32 === 0) await yieldWork();
    for (let x = 0; x < size; x++) {
      const p = y * size + x, i = p * 4;
      const dx = (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1) - at(x + 1, y - 1) - 2 * at(x + 1, y) - at(x + 1, y + 1)) / 8;
      // Canvas Y points down. South-minus-north accounts for flipY=true;
      // normalScale.y stays positive and all maps share the same orientation.
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)) / 8;
      let nx = dx * slopeStrength, ny = dy * slopeStrength;
      if (authoredHeight) {
        // Smoothly limit the steepest joints so added definition does not
        // turn fine grain into harsh black pits as the tile rotates.
        const slopeLimit = 1 / Math.sqrt(1 + (nx * nx + ny * ny) / (.75 * .75));
        nx *= slopeLimit;
        ny *= slopeLimit;
      }
      const length = Math.hypot(nx, ny, 1);
      normalPixels.data[i] = (nx / length * .5 + .5) * 255 + noise(x, y) - .5;
      normalPixels.data[i + 1] = (ny / length * .5 + .5) * 255 + noise(x, y, 71) - .5;
      normalPixels.data[i + 2] = (1 / length * .5 + .5) * 255;
      normalPixels.data[i + 3] = 255;
      const local = authoredHeight && authoredDetail
        ? authoredHeight[p]! - authoredDetail[p]!
        : lum[p]! - fineBlur[p]!;
      const pits = smooth(-local, .015, .09);
      const groove = 1 - smooth(grooveAt(x, y), Math.max(0, halfGroove - 2), halfGroove + 2);
      // Positive narrow top-hat response finds pale quartz rather than whole
      // light-coloured cells. Joint pixels always remain rough, never glossy.
      const quartz = smooth(lum[p]! - ridgeBlur[p]!, .025, .09) * smooth(lum[p]!, .64, .88) * (1 - groove);
      const variation = clamp(local * 3, -.08, .08) * (grid ? 1 : authoredHeight ? .65 : .35);
      let roughness = options.baseRoughness + variation;
      if (authoredHeight) {
        // Recesses scatter slightly more light; keep this matt material matt.
        // Printed light/dark patches never become false polished areas.
        roughness = THREE.MathUtils.lerp(roughness, .9, pits * .65);
      } else if (grid) {
        roughness = THREE.MathUtils.lerp(roughness, .55, quartz);
        roughness = THREE.MathUtils.lerp(roughness, .92, Math.max(groove, pits));
      }
      const value = Math.round(clamp(roughness, .06, .96) * 255);
      roughnessPixels.data[i] = roughnessPixels.data[i + 1] = roughnessPixels.data[i + 2] = value;
      roughnessPixels.data[i + 3] = 255;
    }
  }
  normalContext.putImageData(normalPixels, 0, 0);
  roughnessContext.putImageData(roughnessPixels, 0, 0);
  const edgeCanvas = document.createElement("canvas");
  edgeCanvas.width = edgeCanvas.height = 64;
  const edgeContext = edgeCanvas.getContext("2d");
  if (!edgeContext) throw new Error("Tile edge canvas unavailable");
  const edgePixels = edgeContext.createImageData(64, 64);
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const i = (y * 64 + x) * 4;
    edgePixels.data[i] = 128 + (noise(x, y) - .5) * 16;
    edgePixels.data[i + 1] = 128 + (noise(x, y, 31) - .5) * 16;
    edgePixels.data[i + 2] = 255; edgePixels.data[i + 3] = 255;
  }
  edgeContext.putImageData(edgePixels, 0, 0);
  if (options.cancelled()) throw new Error("Relief generation cancelled");
  const normalMap = new THREE.CanvasTexture(normalCanvas), roughnessMap = new THREE.CanvasTexture(roughnessCanvas);
  const edgeNormalMap = new THREE.CanvasTexture(edgeCanvas);
  for (const texture of [normalMap, roughnessMap, edgeNormalMap]) {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true; texture.flipY = true;
    texture.anisotropy = options.anisotropy;
    texture.needsUpdate = true;
  }
  const edgeColour = new THREE.Color().setRGB(red / borderSamples / 255, green / borderSamples / 255, blue / borderSamples / 255, THREE.SRGBColorSpace).multiplyScalar(.62);
  return { normalMap, roughnessMap, edgeNormalMap, edgeColour, normalScale: options.normalScale };
}
