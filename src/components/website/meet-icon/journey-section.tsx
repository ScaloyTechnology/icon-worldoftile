import { Reveal } from "@/components/animations/reveal";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { IconicJourney } from "@/components/website/meet-icon/iconic-journey";
import type { MeetIconContent } from "@/types/meet-icon";

type JourneySectionProps = Readonly<{
  content: MeetIconContent["journey"];
}>;

export function JourneySection({ content }: JourneySectionProps) {
  return (
    <section
      aria-labelledby="journey-title"
      className="overflow-hidden bg-surface-dark text-on-dark"
    >
      <Container className="pt-[var(--section-space)]" size="wide">
        <Reveal className="grid gap-8 md:grid-cols-12" variant="mask">
          <SectionHeader
            className="md:col-span-8 lg:col-span-7"
            description={content.description}
            eyebrow={content.eyebrow}
            inverse
            title={<span id="journey-title">{content.title}</span>}
          />
          <p className="type-caption self-end text-on-dark-muted md:col-span-3 md:col-start-10 md:text-right">
            Scroll-led story / vertical fallback
          </p>
        </Reveal>
        <IconicJourney items={content.items} />
      </Container>
    </section>
  );
}
