import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { ProductGrid } from "@/components/website/products/product-grid";
import type {
  Product,
  ProductCollection,
  ProductsPageContent,
} from "@/types/products";

type ProductExplorerFallbackProps = Readonly<{
  collections: readonly ProductCollection[];
  content: ProductsPageContent["listing"];
  products: readonly Product[];
}>;

export function ProductExplorerFallback({
  collections,
  content,
  products,
}: ProductExplorerFallbackProps) {
  return (
    <Section
      aria-labelledby="product-library-title"
      className="bg-background"
      id="product-library"
    >
      <Container size="wide">
        <SectionHeader
          description={content.description}
          eyebrow={content.eyebrow}
          title={<span id="product-library-title">{content.title}</span>}
        />
        <p className="type-caption mt-10 border-y border-border py-5 text-muted">
          {products.length} development products
        </p>
        <div className="mt-14 md:mt-20">
          <ProductGrid collections={collections} products={products} />
        </div>
      </Container>
    </Section>
  );
}
