import type { CSSProperties } from "react";
import Link from "next/link";

import { MediaFrame } from "@/components/ui/media-frame";
import type { Product } from "@/types/products";

const itemLayouts = [
  "md:col-span-7 lg:col-span-6",
  "md:col-span-5 md:mt-24 lg:col-span-4 lg:col-start-8 lg:mt-32",
  "md:col-span-5 md:mt-8 lg:col-span-4 lg:col-start-2 lg:mt-24",
  "md:col-span-7 lg:col-span-6 lg:col-start-7",
  "md:col-span-6 lg:col-span-5",
  "md:col-span-6 md:mt-20 lg:col-span-5 lg:col-start-8 lg:mt-28",
] as const;

const mediaLayouts = [
  "aspect-[5/4]",
  "aspect-[4/5]",
  "aspect-[4/5]",
  "aspect-[5/4]",
  "aspect-square",
  "aspect-[4/5]",
] as const;

type ProductItemProps = Readonly<{
  collectionName: string;
  index: number;
  product: Product;
}>;

export function ProductItem({
  collectionName,
  index,
  product,
}: ProductItemProps) {
  const layoutIndex = index % itemLayouts.length;

  return (
    <article
      className={`product-result-item ${itemLayouts[layoutIndex] ?? ""}`}
      style={{ "--product-index": index } as CSSProperties}
    >
      <Link className="group block" href={`/products/${product.slug}`} data-cursor="View">
        <MediaFrame
          className={`media-interactive ${mediaLayouts[layoutIndex] ?? "aspect-[4/5]"}`}
          imageClassName="transition-transform duration-700 group-hover:scale-[1.025]"
          media={product.primaryMedia}
          sizes="(min-width: 1024px) 48vw, (min-width: 768px) 58vw, 100vw"
        />

        <div className="mt-5 grid grid-cols-[1fr_auto] gap-x-6 border-t border-border pt-4">
          <div>
            <p className="type-caption text-muted">
              {collectionName} / {product.category}
            </p>
            <h3 className="mt-2 font-display text-[clamp(1.8rem,3vw,3rem)] leading-none transition-transform duration-500 group-hover:translate-x-1">
              {product.name}
            </h3>
          </div>
          <span
            aria-hidden="true"
            className="text-2xl transition-transform duration-500 group-hover:translate-x-2"
          >
            →
          </span>
          <p className="type-small col-span-2 mt-4 text-muted">
            {product.sizes.length} development size
            {product.sizes.length === 1 ? "" : "s"} / {product.finishes[0]}
          </p>
        </div>
      </Link>
    </article>
  );
}
