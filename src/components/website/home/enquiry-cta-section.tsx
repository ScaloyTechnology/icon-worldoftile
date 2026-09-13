import { Reveal } from "@/components/animations/reveal";
import { TextReveal } from "@/components/animations/text-reveal";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Section } from "@/components/ui/section";
import { TextLink } from "@/components/ui/text-link";

export function EnquiryCtaSection() {
  return (
    <Section aria-labelledby="enquiry-title" className="bg-background">
      <Container size="wide">
        <div>
          <div className="grid gap-10 border-t border-border pt-8 md:grid-cols-12 md:gap-x-10 lg:pt-12">
            <Eyebrow className="text-muted md:col-span-3">
              Material conversations
            </Eyebrow>
            <div className="md:col-span-9">
              <TextReveal>
                <h2 className="type-h1 max-w-6xl" id="enquiry-title">
                  <span className="block overflow-hidden" data-text-line>
                    <span className="block">Begin with a surface.</span>
                  </span>
                  <span className="block overflow-hidden" data-text-line>
                    <span className="block">Shape a space.</span>
                  </span>
                </h2>
              </TextReveal>
              <Reveal variant="soft">
                <div className="mt-10 flex flex-col items-start justify-between gap-8 sm:flex-row sm:items-end lg:mt-14">
                  <p className="type-body-lg max-w-lg text-muted">
                    Connect with ICON for a future project, material enquiry, or
                    catalogue request.
                  </p>
                  <TextLink href="/contact">Contact ICON</TextLink>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </Container>
    </Section>
  );
}
