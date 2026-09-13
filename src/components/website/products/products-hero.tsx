import { HeroMotion } from "@/components/animations/hero-motion";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MediaFrame } from "@/components/ui/media-frame";
import type { ProductsPageContent } from "@/types/products";

type ProductsHeroProps = Readonly<{
  content: ProductsPageContent["hero"];
}>;

export function ProductsHero({ content }: ProductsHeroProps) {
  return (
    <section
      aria-labelledby="products-title"
      className="relative -mt-[var(--header-height)] min-h-[100svh] overflow-hidden bg-surface-dark text-on-dark"
    >
      <HeroMotion className="relative min-h-[100svh]">
        <div className="absolute -inset-y-[8%] inset-x-0" data-hero-media>
          <MediaFrame
            className="absolute inset-0"
            media={content.media}
            priority
            sizes="100vw"
          />
        </div>
        <div
          aria-hidden="true"
          className="hero-scrim absolute inset-0"
        />

        <Container
          className="relative z-10 flex min-h-[100svh] flex-col justify-end pt-[calc(var(--header-height)+5rem)] pb-8 sm:pb-12 lg:pb-14"
          size="wide"
        >
          <Eyebrow className="text-on-dark-muted" data-hero-eyebrow>
            {content.eyebrow}
          </Eyebrow>

          <div className="mt-8 grid items-end gap-10 md:grid-cols-12 md:gap-x-10">
            <h1
              className="products-hero-type md:col-span-9 lg:col-span-8"
              id="products-title" data-hero-heading
            >
              {content.titleLines.map((line, index) => (
                <span
                  className="hero-line block overflow-hidden"
                  data-hero-line
                  key={line}
                >
                  <span
                    className={`block ${index === 1 ? "pl-[5vw] italic" : ""}`}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <div
              className="md:col-span-3 md:pb-2 lg:col-start-10"
              data-hero-supporting
            >
              <p className="type-body-lg max-w-md text-on-dark-muted">
                {content.description}
              </p>
            </div>
          </div>

          <a
            className="mt-12 flex min-h-12 items-center gap-5 self-end border-b border-on-dark/40 pb-2 text-xs font-semibold tracking-[0.14em] uppercase transition-[gap,opacity] duration-300 hover:gap-7 hover:opacity-70"
            data-hero-scroll
            href="#featured-collections"
          >
            {content.browseLabel}
            <span aria-hidden="true">↓</span>
          </a>
        </Container>
      </HeroMotion>
    </section>
  );
}
