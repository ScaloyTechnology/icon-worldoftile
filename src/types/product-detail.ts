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

export type ProductTechnicalMedia = Readonly<{
  label: string;
  src: string;
  mimeType: string;
  alt: string;
}>;

export type ProductDetailData = Readonly<{
  product: Product;
  productCode: string | null;
  collectionName: string | null;
  description: string;
  sizes: readonly ProductSizeOption[];
  details: readonly ProductDetailField[];
  specifications: readonly ProductSpecification[];
  documents: readonly ProductDocument[];
  applicationDescription: string;
  technicalDescription: string;
  technicalMedia: ProductTechnicalMedia | null;
  detailMedia: HomeMedia;
  applicationMedia: HomeMedia | null;
  relatedProducts: readonly Product[];
  imageAspect: number;
  thicknessMm: number | null;
  inspectorTextureSrc: string | null;
  seo: Readonly<{ title: string | null; description: string | null; imageSrc: string | null; noIndex: boolean }> | null;
}>;
