import { ImageReveal } from "@/components/animations/image-reveal";
import { ParallaxMedia } from "@/components/animations/parallax-media";
import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import type { MeetIconContent } from "@/types/meet-icon";

type TechnologySectionProps = Readonly<{
  content: MeetIconContent["technology"];
}>;

export function TechnologySection({ content }: TechnologySectionProps) {
  return (
    <Section
      aria-labelledby="technology-title"
      className="overflow-hidden bg-background-secondary"
    >
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-x-14">
          <Reveal className="lg:col-span-5 lg:pt-10" variant="mask">
            <SectionHeader
              description={content.description}
              eyebrow={content.eyebrow}
              title={<span id="technology-title">{content.title}</span>}
            />
          </Reveal>

          <ImageReveal className="lg:col-span-7" direction="horizontal">
            <ParallaxMedia className="overflow-hidden">
              <MediaFrame
                className="aspect-[4/5] sm:aspect-[16/11] lg:aspect-[5/4]"
                media={content.media}
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
            </ParallaxMedia>
          </ImageReveal>
        </div>

        <StaggerReveal className="mt-16 lg:mt-24" variant="directional">
          <ol className="grid border-t border-border lg:grid-cols-3">
            {content.steps.map((step, index) => (
              <li
                className="min-h-64 border-b border-border py-7 lg:min-h-80 lg:border-r lg:px-8 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
                data-stagger-item
                key={step.id}
              >
                <div className="flex items-center justify-between gap-6">
                  <span className="type-label text-muted">{step.label}</span>
                  <span className="type-caption text-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="type-h3 mt-16 max-w-sm">{step.title}</h3>
                <p className="type-small mt-5 max-w-sm text-muted">
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </StaggerReveal>
      </Container>
    </Section>
  );
}
