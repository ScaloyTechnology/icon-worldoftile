import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import type { ProductCollection, ProductsPageContent } from "@/types/products";

type AllCollectionsSectionProps = Readonly<{
  collections: readonly ProductCollection[];
  content: ProductsPageContent["allCollections"];
}>;

export function AllCollectionsSection({
  collections,
  content,
}: AllCollectionsSectionProps) {
  return (
    <Section aria-labelledby="all-collections-title" className="bg-surface">
      <Container size="wide">
        <Reveal className="grid gap-8 md:grid-cols-12" variant="mask">
          <SectionHeader
            className="md:col-span-8"
            description={content.description}
            eyebrow={content.eyebrow}
            title={<span id="all-collections-title">{content.title}</span>}
          />
        </Reveal>

        <StaggerReveal className="mt-14 md:mt-20" variant="depth">
          <div className="grid border-t border-border sm:grid-cols-2 lg:grid-cols-4">
            {collections.map((collection, index) => (
              <article
                className="border-b border-border sm:border-r sm:odd:border-r-0 lg:odd:border-r lg:last:border-r-0"
                data-stagger-item
                key={collection.id}
              >
                <Link
                  className="group block p-5 transition-colors duration-500 hover:bg-background/60 sm:p-7"
                  href={`/products?collection=${encodeURIComponent(collection.id)}#product-library`}
                >
                  <MediaFrame
                    className="media-interactive aspect-square"
                    media={collection.media}
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  />
                  <div className="mt-6 flex items-start justify-between gap-5">
                    <div>
                      <p className="type-caption text-muted">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-3 font-display text-3xl leading-none">
                        {collection.name}
                      </h3>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-xl transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </StaggerReveal>
      </Container>
    </Section>
  );
}
