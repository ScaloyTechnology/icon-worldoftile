import type { HomeMedia } from "@/types/home";
import type { Product } from "@/types/products";

export type ProductSizeOption = Readonly<{
  label: string;
  widthMm: number;
  heightMm: number;
}>;

export type ProductDetailField = Readonly<{
  label: string;
  value: string;
}>;

export type ProductDetailData = Readonly<{
  product: Product;
  productCode: string | null;
  collectionName: string | null;
  description: string;
  sizes: readonly ProductSizeOption[];
  details: readonly ProductDetailField[];
  detailMedia: HomeMedia;
  applicationMedia: HomeMedia | null;
  relatedProducts: readonly Product[];
  imageAspect: number;
  thicknessMm: number | null;
  inspectorTextureSrc: string | null;
  seo: Readonly<{ title: string | null; description: string | null; imageSrc: string | null; noIndex: boolean }> | null;
}>;
