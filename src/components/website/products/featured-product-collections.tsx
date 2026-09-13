import Link from "next/link";

import { ImageReveal } from "@/components/animations/image-reveal";
import { Reveal } from "@/components/animations/reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import type { ProductCollection, ProductsPageContent } from "@/types/products";

type FeaturedProductCollectionsProps = Readonly<{
  collections: readonly ProductCollection[];
  content: ProductsPageContent["featured"];
}>;

export function FeaturedProductCollections({
  collections,
  content,
}: FeaturedProductCollectionsProps) {
  const featuredCollections = collections.filter(
    (collection) => collection.featured,
  );

  return (
    <Section
      aria-labelledby="featured-products-title"
      className="overflow-visible bg-background-secondary"
      id="featured-collections"
    >
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-x-16">
          <Reveal
            className="self-start lg:sticky lg:top-[calc(var(--header-height)+2rem)] lg:col-span-4"
            variant="mask"
          >
            <SectionHeader
              description={content.description}
              eyebrow={content.eyebrow}
              title={<span id="featured-products-title">{content.title}</span>}
            />
            <p className="type-caption mt-10 text-muted">
              Scroll through the development collection sequence
            </p>
          </Reveal>

          <div className="space-y-20 md:space-y-28 lg:col-span-7 lg:col-start-6">
            {featuredCollections.map((collection, index) => (
              <article key={collection.id}>
                <Link
                  className="group block" data-cursor="Explore"
                  href={`/products?collection=${encodeURIComponent(collection.id)}#product-library`}
                >
                  <ImageReveal
                    direction={index % 2 === 0 ? "vertical" : "horizontal"}
                  >
                    <MediaFrame
                      className="media-interactive aspect-[4/5] sm:aspect-[5/4]"
                      media={collection.media}
                      sizes="(min-width: 1024px) 55vw, 100vw"
                    />
                  </ImageReveal>
                  <div className="mt-6 grid gap-5 border-t border-border pt-5 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="type-caption text-muted">
                        Featured / {String(index + 1).padStart(2, "0")}
                      </p>
                      <h3 className="type-h3 mt-3 transition-transform duration-500 group-hover:translate-x-1">
                        {collection.name}
                      </h3>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-3xl transition-transform duration-500 group-hover:translate-x-2"
                    >
                      →
                    </span>
                    <p className="type-small max-w-xl text-muted sm:col-span-2">
                      {collection.description}
                    </p>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
