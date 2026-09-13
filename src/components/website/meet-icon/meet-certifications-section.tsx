import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import type { MeetIconContent } from "@/types/meet-icon";

type MeetCertificationsSectionProps = Readonly<{
  content: MeetIconContent["certifications"];
}>;

export function MeetCertificationsSection({
  content,
}: MeetCertificationsSectionProps) {
  return (
    <Section
      aria-labelledby="meet-certifications-title"
      className="bg-surface"
      compact
    >
      <Container size="wide">
        <Reveal className="grid gap-8 md:grid-cols-12" variant="mask">
          <SectionHeader
            className="md:col-span-8"
            description={content.description}
            eyebrow={content.eyebrow}
            title={<span id="meet-certifications-title">{content.title}</span>}
          />
        </Reveal>

        <StaggerReveal className="mt-14 md:mt-20" variant="sequence">
          <div className="grid border-t border-border md:grid-cols-3">
            {content.items.map((certification, index) => (
              <article
                className="min-h-72 border-b border-border py-7 md:min-h-80 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                data-stagger-item
                key={certification.id}
              >
                <div
                  aria-label={`Certification logo placeholder for ${certification.label}`}
                  className="grid h-20 w-20 place-items-center border border-border font-display text-3xl"
                  role="img"
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-14 text-base font-medium">
                  {certification.label}
                </h3>
                <p className="type-small mt-3 max-w-64 text-muted">
                  {certification.supportingText}
                </p>
                {certification.issuer ? (
                  <p className="type-caption mt-6 text-muted">
                    {certification.issuer}
                    {certification.year ? ` / ${certification.year}` : ""}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </StaggerReveal>
      </Container>
    </Section>
  );
}
