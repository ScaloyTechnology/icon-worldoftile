import { ImageReveal } from "@/components/animations/image-reveal";
import { Reveal } from "@/components/animations/reveal";
import { TextReveal } from "@/components/animations/text-reveal";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import type { MeetIconContent } from "@/types/meet-icon";

type MarketsSectionProps = Readonly<{
  content: MeetIconContent["markets"];
}>;

export function MarketsSection({ content }: MarketsSectionProps) {
  return (
    <Section aria-labelledby="markets-title" className="bg-background">
      <Container size="wide">
        <div className="grid gap-14 md:grid-cols-12 md:gap-x-10 lg:gap-x-16">
          <div className="md:col-span-7 lg:col-span-8">
            <Eyebrow className="text-muted">{content.eyebrow}</Eyebrow>
            <TextReveal className="mt-5">
              <h2 className="type-h2" id="markets-title">
                <span className="block overflow-hidden" data-text-line>
                  <span className="block">{content.title}</span>
                </span>
              </h2>
            </TextReveal>
            <Reveal className="mt-10" variant="soft">
              <p className="type-body-lg max-w-2xl text-muted">
                {content.description}
              </p>
            </Reveal>
          </div>

          <Reveal
            className="border-t border-border pt-7 md:col-span-4 md:col-start-9 md:mt-24"
            variant="mask"
          >
            <p className="type-label text-accent">{content.statusLabel}</p>
            <p className="type-h3 mt-6">{content.statement}</p>
          </Reveal>
        </div>

        <ImageReveal className="mt-14 md:mt-20" direction="horizontal">
          <MediaFrame
            className="aspect-[5/4] sm:aspect-[16/8]"
            media={content.media}
            sizes="100vw"
          />
        </ImageReveal>
      </Container>
    </Section>
  );
}
