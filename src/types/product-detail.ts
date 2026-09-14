import type { HomeMedia } from "@/types/home";
import type { Product, ProductSpecification } from "@/types/products";

export type ProductSizeOption = Readonly<{
  label: string;
  widthMm: number;
  heightMm: number;
}>;

export type ProductDetailField = Readonly<{
  label: string;
  value: string;
}>;

export type ProductDocument = Readonly<{
  label: string;
  href: string;
}>;

export type ProductDetailData = Readonly<{
  product: Product;
  collectionName: string | null;
  description: string;
  sizes: readonly ProductSizeOption[];
  details: readonly ProductDetailField[];
  specifications: readonly ProductSpecification[];
  documents: readonly ProductDocument[];
  detailMedia: HomeMedia;
  applicationMedia: HomeMedia | null;
  relatedProducts: readonly Product[];
  imageAspect: number;
  thicknessMm: number | null;
}>;
