import { ImageReveal } from "@/components/animations/image-reveal";
import { ParallaxMedia } from "@/components/animations/parallax-media";
import { Reveal } from "@/components/animations/reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import { discoverMedia } from "@/content/home";

export function DiscoverIconSection() {
  return (
    <Section aria-labelledby="discover-icon-title" className="bg-surface">
      <Container size="wide">
        <div className="grid items-start gap-12 md:grid-cols-12 md:gap-x-10 lg:gap-x-16">
          <Reveal
            className="md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9"
            variant="mask"
          >
            <SectionHeader
              description="A dialogue between light and texture. Discover the materials that give a room its character."
              eyebrow="Discover ICON"
              title={
                <span id="discover-icon-title">
                  A quieter kind of statement.
                </span>
              }
            />
            <TextLink className="mt-10" href="/meet-icon">
              Meet ICON
            </TextLink>
          </Reveal>

          <div className="relative mt-2 md:col-span-7 md:col-start-1 md:row-start-1 md:mt-24 lg:col-span-7">
            <span
              aria-hidden="true"
              className="type-display absolute -top-16 -right-2 z-10 text-accent/25 md:-top-24"
            >
              02
            </span>
            <ImageReveal>
              <ParallaxMedia className="overflow-hidden">
                {/* Replace with approved architectural photography that introduces the ICON brand. */}
                <MediaFrame
                  className="aspect-[4/5] sm:aspect-[5/4] md:aspect-[4/5]"
                  media={discoverMedia}
                  sizes="(min-width: 768px) 58vw, 100vw"
                />
              </ParallaxMedia>
            </ImageReveal>
          </div>
        </div>
      </Container>
    </Section>
  );
}
