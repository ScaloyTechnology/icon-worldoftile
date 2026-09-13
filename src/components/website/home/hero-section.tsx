import { HeroMotion } from "@/components/animations/hero-motion";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MediaFrame } from "@/components/ui/media-frame";
import { TextLink } from "@/components/ui/text-link";
import { heroMedia } from "@/content/home";

export function HeroSection() {
  return (
    <section aria-labelledby="home-hero-title" className="cinematic-hero relative -mt-[var(--header-height)] overflow-hidden bg-surface-dark text-on-dark">
      <HeroMotion className="relative min-h-[100svh]">
        <div className="absolute -inset-y-[8%] inset-x-0" data-hero-media>
          <MediaFrame className="absolute inset-0" media={heroMedia} priority sizes="100vw" />
        </div>
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />
        <Container className="relative z-10 flex min-h-[100svh] flex-col justify-end pt-[calc(var(--header-height)+4rem)] pb-8 md:pb-12" size="wide">
          <Eyebrow className="text-on-dark" data-hero-eyebrow>ICON / World of Tile</Eyebrow>
          <h1 className="home-hero-type mt-9 max-w-[15ch]" id="home-hero-title" data-hero-heading>
            <span className="hero-line block overflow-hidden" data-hero-line><span className="block">Material.</span></span>
            <span className="hero-line block overflow-hidden" data-hero-line><span className="block pl-[8vw] italic">In its element.</span></span>
          </h1>
          <div className="mt-10 flex flex-col items-start justify-between gap-8 border-t border-on-dark/30 pt-6 md:flex-row md:items-end" data-hero-supporting>
            <p className="type-body-lg max-w-[25rem] text-on-dark">Architectural surfaces considered through proportion, texture, and light.</p>
            <TextLink href="/products" magnetic>Explore collections</TextLink>
          </div>
          <a className="type-caption mt-10 flex min-h-11 items-center gap-4 self-start" data-hero-scroll href="#discover-icon-title">
            <span className="scroll-stem" aria-hidden="true" /> Scroll to discover
          </a>
        </Container>
      </HeroMotion>
    </section>
  );
}
