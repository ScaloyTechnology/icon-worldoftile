import { ImageReveal } from "@/components/animations/image-reveal";
import { ParallaxMedia } from "@/components/animations/parallax-media";
import { Reveal } from "@/components/animations/reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import type { MeetIconContent } from "@/types/meet-icon";

type ResearchSectionProps = Readonly<{
  content: MeetIconContent["research"];
}>;

export function ResearchSection({ content }: ResearchSectionProps) {
  return (
    <Section
      aria-labelledby="research-title"
      className="overflow-hidden bg-surface-dark text-on-dark"
    >
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-x-16">
          <ImageReveal className="lg:col-span-7">
            <ParallaxMedia className="overflow-hidden">
              <MediaFrame
                className="aspect-[4/5] sm:aspect-[5/4]"
                media={content.media}
                sizes="(min-width: 1024px) 58vw, 100vw"
              />
            </ParallaxMedia>
          </ImageReveal>

          <Reveal className="lg:col-span-5" distance={42} variant="mask">
            <SectionHeader
              description={content.description}
              eyebrow={content.eyebrow}
              inverse
              title={<span id="research-title">{content.title}</span>}
            />
            <p className="type-h3 mt-10">{content.statement}</p>
            <ul className="mt-10 border-y border-on-dark/15">
              {content.details.map((detail, index) => (
                <li
                  className="flex gap-5 border-b border-on-dark/15 py-4 last:border-b-0"
                  key={detail}
                >
                  <span className="type-caption text-on-dark-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-on-dark-muted">{detail}</span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
