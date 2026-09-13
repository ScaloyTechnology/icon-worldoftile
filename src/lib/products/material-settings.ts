export type TileMaterialSettings = {
  roughness: number;
  metalness: number;
  clearcoat: number;
  clearcoatRoughness: number;
};

const defaultSettings: TileMaterialSettings = {
  roughness: 0.58,
  metalness: 0,
  clearcoat: 0.08,
  clearcoatRoughness: 0.62,
};

/** Central finish-to-light-response mapping. Unknown values stay deliberately neutral. */
export function getMaterialSettingsForFinish(finish: string | null | undefined): TileMaterialSettings {
  const value = finish?.trim().toLowerCase() ?? "";
  if (/(high.?gloss|glossy|polished|pgvt)/.test(value)) return { roughness: 0.2, metalness: 0, clearcoat: 0.48, clearcoatRoughness: 0.16 };
  if (/(matt|matte|natural)/.test(value)) return { roughness: 0.78, metalness: 0, clearcoat: 0.03, clearcoatRoughness: 0.8 };
  if (/(carv|textur|structured|stone)/.test(value)) return { roughness: 0.7, metalness: 0, clearcoat: 0.02, clearcoatRoughness: 0.76 };
  return defaultSettings;
}

export const fallbackThicknessRatio = 0.016;

export function getTileProportions(widthMm: number | null, heightMm: number | null, thicknessMm: number | null, imageAspect = 2) {
  const dimensionsKnown = Number.isFinite(widthMm) && Number.isFinite(heightMm) && (widthMm ?? 0) > 0 && (heightMm ?? 0) > 0;
  const thicknessKnown = dimensionsKnown && Number.isFinite(thicknessMm) && (thicknessMm ?? 0) > 0;
  const aspect = dimensionsKnown ? widthMm! / heightMm! : Number.isFinite(imageAspect) && imageAspect > 0 ? imageAspect : 2;
  const width = 4;
  const height = width / aspect;
  // Missing thickness is a visual fallback only and is never displayed as product data.
  const depth = thicknessKnown ? (thicknessMm! / widthMm!) * width : Math.min(width, height) * fallbackThicknessRatio;
  return { width, height, depth, usedFallbackDimensions: !dimensionsKnown, usedFallbackThickness: !thicknessKnown };
}
