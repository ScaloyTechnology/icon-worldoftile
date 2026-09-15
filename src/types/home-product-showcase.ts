export type ProductShowcaseMedia = Readonly<{
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
}>;

export type ProductShowcaseField = Readonly<{
  label: string;
  value: string;
}>;

export type ProductShowcaseItem = Readonly<{
  id: string;
  name: string;
  slug: string;
  collection: string | null;
  texture: ProductShowcaseMedia;
  inspectorMedia: ProductShowcaseMedia;
  widthMm: number | null;
  heightMm: number | null;
  thicknessMm: number | null;
  finish: string | null;
  fields: readonly ProductShowcaseField[];
  source: "database" | "development-fallback";
}>;
