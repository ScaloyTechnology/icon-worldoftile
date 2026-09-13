import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import type { MeetIconContent } from "@/types/meet-icon";

type ValuesSectionProps = Readonly<{
  content: MeetIconContent["values"];
}>;

export function ValuesSection({ content }: ValuesSectionProps) {
  return (
    <Section aria-labelledby="values-title" className="bg-surface">
      <Container size="wide">
        <Reveal className="grid gap-8 md:grid-cols-12" variant="mask">
          <SectionHeader
            className="md:col-span-9 lg:col-span-8"
            description={content.description}
            eyebrow={content.eyebrow}
            title={<span id="values-title">{content.title}</span>}
          />
        </Reveal>

        <StaggerReveal className="mt-16 md:mt-24" variant="sequence">
          <div className="border-t border-border">
            {content.items.map((item) => (
              <article
                className="group grid gap-5 border-b border-border py-7 transition-colors duration-500 hover:bg-background/55 sm:grid-cols-[4rem_1fr] md:grid-cols-12 md:items-center md:gap-x-7 md:py-5"
                data-stagger-item
                key={item.id}
              >
                <p className="type-caption text-muted md:col-span-1">
                  {item.label}
                </p>
                <h3 className="font-display text-[clamp(2.8rem,6vw,6.5rem)] leading-[0.86] tracking-[-0.045em] sm:col-start-2 md:col-span-4 md:col-start-2">
                  {item.title}
                </h3>
                <p className="type-small max-w-md text-muted sm:col-start-2 md:col-span-3 md:col-start-7">
                  {item.description}
                </p>
                <MediaFrame
                  className="media-interactive hidden aspect-[4/3] md:col-span-2 md:col-start-11 md:block"
                  media={item.media}
                  sizes="16vw"
                />
              </article>
            ))}
          </div>
        </StaggerReveal>
      </Container>
    </Section>
  );
}
