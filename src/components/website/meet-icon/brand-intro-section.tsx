import { Reveal } from "@/components/animations/reveal";
import { TextReveal } from "@/components/animations/text-reveal";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";
import type { MeetIconContent } from "@/types/meet-icon";

type BrandIntroSectionProps = Readonly<{
  content: MeetIconContent["intro"];
}>;

export function BrandIntroSection({ content }: BrandIntroSectionProps) {
  return (
    <Section aria-labelledby="meet-intro-title" className="bg-surface">
      <Container size="wide">
        <div className="grid gap-12 md:grid-cols-12 md:gap-x-10 lg:gap-x-16">
          <Eyebrow className="text-muted md:col-span-3">
            {content.eyebrow}
          </Eyebrow>

          <div className="md:col-span-9">
            <TextReveal>
              <h2 className="type-h1 max-w-6xl" id="meet-intro-title">
                {content.statementLines.map((line) => (
                  <span
                    className="block overflow-hidden"
                    data-text-line
                    key={line}
                  >
                    <span className="block">{line}</span>
                  </span>
                ))}
              </h2>
            </TextReveal>

            <Reveal
              className="mt-12 grid gap-8 border-t border-border pt-8 md:grid-cols-9 lg:mt-16 lg:pt-10"
              variant="soft"
            >
              <span
                aria-hidden="true"
                className="type-display text-accent/35 md:col-span-3"
              >
                01
              </span>
              <p className="type-body-lg max-w-2xl text-muted md:col-span-5 md:col-start-5">
                {content.description}
              </p>
            </Reveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
