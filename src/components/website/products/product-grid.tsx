import { ProductItem } from "@/components/website/products/product-item";
import type { Product, ProductCollection } from "@/types/products";

type ProductGridProps = Readonly<{
  collections: readonly ProductCollection[];
  products: readonly Product[];
}>;

export function ProductGrid({ collections, products }: ProductGridProps) {
  const collectionNames = new Map(
    collections.map((collection) => [collection.id, collection.name]),
  );

  return (
    <div className="grid gap-x-6 gap-y-16 md:grid-cols-12 md:gap-y-24 lg:gap-x-10 lg:gap-y-32">
      {products.map((product, index) => (
        <ProductItem
          collectionName={
            collectionNames.get(product.collectionId) ?? "Collection"
          }
          index={index}
          key={product.id}
          product={product}
        />
      ))}
    </div>
  );
}
