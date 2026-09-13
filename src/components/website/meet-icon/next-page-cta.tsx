import Link from "next/link";

import { ImageReveal } from "@/components/animations/image-reveal";
import { Reveal } from "@/components/animations/reveal";
import { TextReveal } from "@/components/animations/text-reveal";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import type { MeetIconContent } from "@/types/meet-icon";

type NextPageCtaProps = Readonly<{
  content: MeetIconContent["finalCta"];
}>;

export function NextPageCta({ content }: NextPageCtaProps) {
  return (
    <Section
      aria-labelledby="meet-next-title"
      className="material-chapter overflow-hidden bg-surface-dark text-on-dark"
    >
      <Container size="wide">
        <Eyebrow className="text-on-dark/70">{content.eyebrow}</Eyebrow>
        <div className="mt-7 grid gap-12 md:grid-cols-12 md:items-end md:gap-x-10">
          <TextReveal className="md:col-span-9">
            <h2 className="type-h1" id="meet-next-title">
              <span className="block overflow-hidden" data-text-line>
                <span className="block">{content.title}</span>
              </span>
            </h2>
          </TextReveal>
          <Reveal className="md:col-span-3 md:justify-self-end" variant="soft">
            <p className="type-small max-w-sm text-on-dark/75">
              {content.description}
            </p>
          </Reveal>
        </div>

        <Link
          className="group mt-14 grid border-t border-on-dark/25 pt-7 md:mt-20 md:grid-cols-12 md:items-end md:gap-x-10"
          href={content.href} data-cursor="Explore"
        >
          <div className="md:col-span-8">
            <ImageReveal direction="horizontal">
              <MediaFrame
                className="aspect-[16/8]"
                media={content.media}
                sizes="(min-width: 768px) 66vw, 100vw"
              />
            </ImageReveal>
          </div>
          <div className="mt-7 flex items-center justify-between gap-8 md:col-span-4 md:mt-0 md:pl-8">
            <span className="font-display text-[clamp(2.2rem,4vw,4rem)] leading-none">
              {content.linkLabel}
            </span>
            <span
              aria-hidden="true"
              className="text-4xl transition-transform duration-500 group-hover:translate-x-2"
            >
              →
            </span>
          </div>
        </Link>
      </Container>
    </Section>
  );
}
