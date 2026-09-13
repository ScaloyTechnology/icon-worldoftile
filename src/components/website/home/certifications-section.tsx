import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { certifications } from "@/content/home";

export function CertificationsSection() {
  return (
    <Section
      aria-labelledby="certifications-title"
      className="bg-surface"
      compact
    >
      <Container size="wide">
        <Reveal className="grid gap-10 lg:grid-cols-12">
          <SectionHeader
            className="lg:col-span-7"
            description="Approved standards, marks, and downloadable evidence will be added here once supplied. No certification claims are shown in this phase."
            eyebrow="Certifications"
            title={
              <span id="certifications-title">Standards, documented.</span>
            }
          />
        </Reveal>

        <StaggerReveal className="mt-14 md:mt-20" variant="sequence">
          <div className="grid border-t border-border md:grid-cols-3">
            {certifications.map((certification, index) => (
              <article
                className="min-h-64 border-b border-border py-7 md:min-h-72 md:border-r md:px-7 md:first:pl-0 md:last:border-r-0 md:last:pr-0"
                data-stagger-item
                key={certification.id}
              >
                {/* Replace the monogram below with the approved certification logo. */}
                <div
                  aria-label={`Logo placeholder for ${certification.label}`}
                  className="grid h-16 w-16 place-items-center border border-border font-display text-2xl"
                  role="img"
                >
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-12 text-base font-medium">
                  {certification.label}
                </h3>
                <p className="type-small mt-2 max-w-64 text-muted">
                  {certification.supportingText}
                </p>
              </article>
            ))}
          </div>
        </StaggerReveal>
      </Container>
    </Section>
  );
}
