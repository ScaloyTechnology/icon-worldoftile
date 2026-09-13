import { HeroMotion } from "@/components/animations/hero-motion";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MediaFrame } from "@/components/ui/media-frame";
import type { MeetIconContent } from "@/types/meet-icon";

type MeetIconHeroProps = Readonly<{
  content: MeetIconContent["hero"];
}>;

export function MeetIconHero({ content }: MeetIconHeroProps) {
  return (
    <section
      aria-labelledby="meet-icon-title"
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
              className="type-display md:col-span-8 lg:col-span-7"
              id="meet-icon-title" data-hero-heading
            >
              {content.titleLines.map((line, index) => (
                <span
                  className="hero-line block overflow-hidden"
                  data-hero-line
                  key={line}
                >
                  <span
                    className={`block ${index === 1 ? "pl-[12vw] italic md:pl-[7vw]" : ""}`}
                  >
                    {line}
                  </span>
                </span>
              ))}
            </h1>

            <div
              className="md:col-span-4 md:pb-2 lg:col-span-3 lg:col-start-10"
              data-hero-supporting
            >
              <p className="type-body-lg max-w-md text-on-dark-muted">
                {content.description}
              </p>
            </div>
          </div>

          <div
            aria-hidden="true"
            className="mt-12 flex items-center gap-4 self-end lg:mt-16"
            data-hero-scroll
          >
            <span className="type-caption text-on-dark-muted">Scroll</span>
            <span className="h-14 w-px bg-on-dark/55" />
          </div>
        </Container>
      </HeroMotion>
    </section>
  );
}
