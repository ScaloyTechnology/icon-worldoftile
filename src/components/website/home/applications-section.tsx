import Link from "next/link";

import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import { applications } from "@/content/home";

export function ApplicationsSection() {
  return (
    <Section aria-labelledby="applications-title" className="bg-background">
      <Container size="wide">
        <Reveal className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <SectionHeader
            className="lg:col-span-8"
            description="Client visualizations for different ways of living and working. Application imagery is inspiration, not a technical suitability specification."
            eyebrow="Applications"
            title={<span id="applications-title">Spaces with purpose.</span>}
          />
          <div className="lg:col-span-4 lg:justify-self-end">
            <TextLink href="/applications">View applications</TextLink>
          </div>
        </Reveal>

        <StaggerReveal className="mt-14 md:mt-20" variant="directional">
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 md:grid-cols-2 lg:gap-x-12 lg:gap-y-16">
            {applications.map((application, index) => (
              <article
                className={index % 2 === 1 ? "md:translate-y-20" : ""}
                data-stagger-item
                key={application.id}
              >
                <Link className="group block" data-cursor="Explore" href="/applications">
                  {/* Replace with approved photography for this application category. */}
                  <MediaFrame
                    className="media-interactive aspect-[5/4] md:aspect-[4/3]"
                    imageClassName="transition-transform duration-700 group-hover:scale-[1.025]"
                    media={application.media}
                    sizes="(min-width: 768px) 50vw, 100vw"
                  />
                  <div className="mt-4 flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-[clamp(1.45rem,2.4vw,2.2rem)] leading-none">
                      {application.name}
                    </h3>
                    <span
                      className="type-caption text-muted"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        </StaggerReveal>
      </Container>
    </Section>
  );
}
