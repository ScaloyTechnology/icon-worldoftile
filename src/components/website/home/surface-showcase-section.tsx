import { ImageReveal } from "@/components/animations/image-reveal";
import { ParallaxMedia } from "@/components/animations/parallax-media";
import { Reveal } from "@/components/animations/reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import { surfaceDetails, surfaceMedia } from "@/content/home";

export function SurfaceShowcaseSection() {
  return (
    <Section
      aria-labelledby="surface-showcase-title"
      className="material-chapter overflow-hidden bg-surface-dark text-on-dark"
    >
      <Container size="wide">
        <div className="grid gap-14 lg:grid-cols-12 lg:items-center lg:gap-x-14">
          <ImageReveal className="lg:col-span-8" direction="horizontal">
            <ParallaxMedia className="overflow-hidden">
              {/* Replace with approved macro photography of an ICON tile finish or texture. */}
              <MediaFrame
                className="aspect-[4/5] sm:aspect-[16/10] lg:aspect-[4/5]"
                media={surfaceMedia}
                sizes="(min-width: 1024px) 66vw, 100vw"
              />
            </ParallaxMedia>
          </ImageReveal>

          <Reveal
            className="lg:col-span-4 lg:pl-3"
            distance={36}
            variant="mask"
          >
            <SectionHeader
              description="Lines catch the light. Tonal shifts reveal depth. A closer look at the supplied Travertino Rome + Decor visualization."
              eyebrow="Surface study"
              inverse
              title={
                <span id="surface-showcase-title">
                  Detail changes perception.
                </span>
              }
            />
            <ol className="mt-10 border-y border-on-dark/15">
              {surfaceDetails.map((detail, index) => (
                <li
                  className="flex items-center gap-5 border-b border-on-dark/15 py-4 last:border-b-0"
                  key={detail}
                >
                  <span className="type-caption text-on-dark-muted">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{detail}</span>
                </li>
              ))}
            </ol>
            <TextLink className="mt-10" href="/technical-specs">
              Explore technical information
            </TextLink>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}
