import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import { featuredCollections } from "@/content/home";

const collectionLayouts = [
  "md:col-span-7 lg:col-span-6",
  "md:col-span-5 lg:col-span-4 lg:col-start-8 lg:mt-28",
  "md:col-span-5 md:mt-10 lg:col-span-4 lg:col-start-2 lg:mt-24",
  "md:col-span-7 lg:col-span-6 lg:col-start-7 lg:-mt-12",
] as const;

const collectionMediaLayouts = [
  "aspect-[4/5] sm:aspect-[5/4] md:aspect-[5/4]",
  "aspect-[4/5]",
  "aspect-[4/5]",
  "aspect-[4/5] sm:aspect-[5/4] md:aspect-[5/4]",
] as const;

export function FeaturedCollectionsSection() {
  return (
    <Section
      aria-labelledby="featured-collections-title"
      className="overflow-hidden bg-background-secondary"
    >
      <Container size="wide">
        <Reveal className="grid items-end gap-8 md:grid-cols-12">
          <SectionHeader
            className="md:col-span-8"
            description="Four visual studies from the client selection. Official collection groupings are awaiting confirmation."
            eyebrow="Featured collections"
            title={
              <span id="featured-collections-title">A study in material.</span>
            }
          />
          <div className="md:col-span-4 md:justify-self-end">
            <TextLink href="/products">View all products</TextLink>
          </div>
        </Reveal>

        <StaggerReveal className="mt-16 md:mt-24" variant="depth">
          <div className="-mx-[var(--container-gutter)] flex snap-x gap-4 overflow-x-auto px-[var(--container-gutter)] pb-5 md:mx-0 md:grid md:grid-cols-12 md:gap-x-6 md:gap-y-8 md:overflow-visible md:px-0 md:pb-0 lg:gap-x-9">
            {featuredCollections.map((collection, index) => (
              <article
                className={`w-[78vw] max-w-[28rem] shrink-0 snap-start md:w-auto md:max-w-none ${collectionLayouts[index] ?? ""}`}
                data-stagger-item
                key={collection.id}
              >
                <Link className="group block" data-cursor="Explore" href={`/products?collection=${collection.id}#product-library`}>
                  {/* Replace each frame with approved photography for its named collection. */}
                  <MediaFrame
                    className={`media-interactive overflow-hidden ${collectionMediaLayouts[index] ?? ""}`}
                    imageClassName="transition-transform duration-700 group-hover:scale-[1.025]"
                    media={collection.media}
                    sizes="(min-width: 1024px) 45vw, (min-width: 768px) 55vw, 78vw"
                  />
                  <div className="mt-5 flex items-end justify-between gap-5 border-t border-border pt-4">
                    <div>
                      <p className="type-caption text-muted">
                        {collection.eyebrow}
                      </p>
                      <h3 className="mt-2 font-display text-3xl leading-none">
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
