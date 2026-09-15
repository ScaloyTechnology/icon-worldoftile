import type { ProductShowcaseMedia } from "@/types/home-product-showcase";

export type CuratedShowcaseMedia = Readonly<{
  slug: string;
  media: ProductShowcaseMedia;
  sourcePath: string;
}>;

export const curatedShowcaseMedia: readonly CuratedShowcaseMedia[] = [
  {
    slug: "pecan-white",
    media: {
      src: "/assets/home/product-showcase/pecan-white.webp",
      alt: "Pecan White long-format wood-look tile face",
      width: 900,
      height: 1800,
    },
    sourcePath: "photos/200X1200-20260910T201837Z-1-002/200X1200/JPG/PECAN WHITE/PECAN WHITE (7).jpg",
  },
  {
    slug: "denim-blue-royal-floral",
    media: {
      src: "/assets/home/product-showcase/denim-blue-royal-floral.webp",
      alt: "Denim Blue and Royal Floral decorative tile surface",
      width: 1000,
      height: 1500,
    },
    sourcePath: "photos/DENIM BLUE + ROYAL FLORAL.jpg",
  },
  {
    slug: "cotto-gold",
    media: {
      src: "/assets/home/product-showcase/cotto-gold.webp",
      alt: "Cotto Gold warm clay-toned tile surface",
      width: 1000,
      height: 1500,
    },
    sourcePath: "photos/COTTO GOLD PREVIEW.jpg",
  },
  {
    slug: "star-nero",
    media: {
      src: "/assets/home/product-showcase/star-nero.webp",
      alt: "Star Nero deep mineral tile surface",
      width: 1000,
      height: 1500,
    },
    sourcePath: "photos/STAR_NERO.jpg",
  },
  {
    slug: "classic-black",
    media: {
      src: "/assets/home/product-showcase/classic-black.webp",
      alt: "Classic Black long-format dark wood-look tile face",
      width: 900,
      height: 1800,
    },
    sourcePath: "photos/200X1200-20260910T201837Z-1-006/200X1200/JPG/CLASSIC BLACK/CLASSIC BLACK (9).jpg",
  },
] as const;
