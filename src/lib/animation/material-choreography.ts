export const smooth = (value: number, start: number, end: number) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)));
  return t * t * (3 - 2 * t);
};

export function heroTilePose(p: number, viewportWidth: number, viewportHeight: number, aspect: number) {
  const isolate = smooth(p, 0.29, 0.47);
  const turn = smooth(p, 0.48, 0.65);
  const width = Math.min(viewportWidth * 0.70, 760, viewportHeight * 0.56 * aspect);
  return {
    width, height: width / aspect,
    x: -viewportWidth * 0.22 * (1 - isolate),
    y: -viewportHeight * 0.14 * (1 - isolate),
    scale: 0.55 + isolate * 0.45,
    rotateX: -turn * 0.12, rotateY: turn * 0.30,
    z: turn * 0.42,
  };
}

// An architectural six-panel installation, all slots are 2:1 or 1:2.
// Different product ratios fit inside slots, never stretch their UVs.
export const wallSlots = [
  { x: 0, y: 0, w: 2, h: 1, side: -1 },
  { x: 2, y: 0, w: 1, h: 2, side: 1 },
  { x: 3, y: 0, w: 1, h: 2, side: 1 },
  { x: 0, y: 1, w: 1, h: 2, side: -1 },
  { x: 1, y: 1, w: 1, h: 2, side: -1 },
  { x: 2, y: 2, w: 2, h: 1, side: 1 },
] as const;
