import { Reveal } from "@/components/animations/reveal";
import { TextReveal } from "@/components/animations/text-reveal";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";
import { TextLink } from "@/components/ui/text-link";
import type { ProductsPageContent } from "@/types/products";

type ProductsFinalCtaProps = Readonly<{
  content: ProductsPageContent["finalCta"];
}>;

export function ProductsFinalCta({ content }: ProductsFinalCtaProps) {
  return (
    <Section
      aria-labelledby="products-final-title"
      className="bg-accent text-on-dark"
    >
      <Container size="wide">
        <div className="grid gap-10 border-t border-on-dark/25 pt-8 md:grid-cols-12 md:gap-x-10 lg:pt-12">
          <Eyebrow className="text-on-dark/70 md:col-span-3">
            {content.eyebrow}
          </Eyebrow>
          <div className="md:col-span-9">
            <TextReveal>
              <h2 className="type-h1 max-w-6xl" id="products-final-title">
                <span className="block overflow-hidden" data-text-line>
                  <span className="block">{content.title}</span>
                </span>
              </h2>
            </TextReveal>
            <Reveal variant="soft">
              <div className="mt-10 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end lg:mt-14">
                <p className="type-body-lg max-w-lg text-on-dark/75">
                  {content.description}
                </p>
                <TextLink href={content.href}>{content.linkLabel}</TextLink>
              </div>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
