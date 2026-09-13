import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import { catalogues } from "@/content/home";

const catalogueOffsets = [
  "",
  "md:translate-y-14",
  "md:translate-y-28",
] as const;

export function CatalogueShowcaseSection() {
  return (
    <Section
      aria-labelledby="catalogues-showcase-title"
      className="overflow-hidden bg-accent text-on-dark"
    >
      <Container size="wide">
        <div className="grid gap-16 lg:grid-cols-12 lg:gap-x-16">
          <Reveal className="lg:col-span-4 lg:pt-12">
            <SectionHeader
              description="A future library for approved collection catalogues and publications. Downloadable files will be connected in a later phase."
              eyebrow="Catalogues"
              inverse
              title={
                <span id="catalogues-showcase-title">
                  The collection, in print.
                </span>
              }
            />
            <TextLink className="mt-10" href="/catalogues">
              Browse catalogues
            </TextLink>
          </Reveal>

          <StaggerReveal className="lg:col-span-8" variant="depth">
            <div className="grid grid-cols-3 gap-3 sm:gap-5 md:gap-7">
              {catalogues.map((catalogue, index) => (
                <article
                  className={catalogueOffsets[index] ?? ""}
                  data-stagger-item
                  key={catalogue.id}
                >
                  <Link className="group block" href="/catalogues">
                    {/* Replace with the approved cover artwork for this catalogue. */}
                    <MediaFrame
                      className="catalogue-cover aspect-[3/4]"
                      captionClassName="hidden sm:flex"
                      imageClassName="transition-transform duration-700 group-hover:scale-[1.025]"
                      media={catalogue.media}
                      sizes="(min-width: 1024px) 20vw, 30vw"
                    />
                    <h3 className="mt-4 font-display text-xl leading-none sm:text-2xl">
                      {catalogue.title}
                    </h3>
                    <p className="type-caption mt-1 text-on-dark/70">
                      {catalogue.edition}
                    </p>
                  </Link>
                </article>
              ))}
            </div>
          </StaggerReveal>
        </div>
      </Container>
    </Section>
  );
}
