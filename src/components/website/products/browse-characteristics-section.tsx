import Link from "next/link";

import { ImageReveal } from "@/components/animations/image-reveal";
import { ParallaxMedia } from "@/components/animations/parallax-media";
import { Reveal } from "@/components/animations/reveal";
import { StaggerReveal } from "@/components/animations/stagger-reveal";
import { Container } from "@/components/ui/container";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { TextLink } from "@/components/ui/text-link";
import type {
  ProductFilterGroup,
  ProductFilterKey,
  ProductsPageContent,
} from "@/types/products";

type BrowseCharacteristicsSectionProps = Readonly<{
  content: ProductsPageContent["browse"];
  filterGroups: readonly ProductFilterGroup[];
}>;

function filterHref(param: string, value: string) {
  const searchParams = new URLSearchParams();
  searchParams.set(param, value);
  return `/products?${searchParams.toString()}#product-library`;
}

function requireGroup(
  groups: readonly ProductFilterGroup[],
  key: ProductFilterKey,
) {
  const group = groups.find((candidate) => candidate.key === key);

  if (!group) {
    throw new Error(`Missing product filter group: ${key}`);
  }

  return group;
}

export function BrowseCharacteristicsSection({
  content,
  filterGroups,
}: BrowseCharacteristicsSectionProps) {
  const sizes = requireGroup(filterGroups, "sizes");
  const finishes = requireGroup(filterGroups, "finishes");
  const surfaces = requireGroup(filterGroups, "surfaces");
  const colors = requireGroup(filterGroups, "colors");
  const looks = requireGroup(filterGroups, "looks");
  const applications = requireGroup(filterGroups, "applications");

  return (
    <Section
      aria-labelledby="browse-characteristics-title"
      className="material-chapter overflow-hidden bg-surface-dark text-on-dark"
    >
      <Container size="wide">
        <Reveal className="grid gap-8 md:grid-cols-12" variant="mask">
          <SectionHeader
            className="md:col-span-9 lg:col-span-8"
            description={content.description}
            eyebrow={content.eyebrow}
            inverse
            title={
              <span id="browse-characteristics-title">{content.title}</span>
            }
          />
        </Reveal>

        <div className="mt-20 space-y-24 md:mt-28 md:space-y-36">
          <section aria-labelledby="browse-size-title">
            <div className="grid gap-10 border-t border-on-dark/15 pt-7 md:grid-cols-12">
              <div className="md:col-span-4">
                <p className="type-caption text-on-dark-muted">01 / 06</p>
                <h3 className="type-h3 mt-4" id="browse-size-title">
                  Browse by size
                </h3>
                <p className="type-small mt-5 max-w-sm text-on-dark-muted">
                  {sizes.description}
                </p>
              </div>
              <StaggerReveal className="md:col-span-8" variant="directional">
                <div className="grid grid-cols-2 border-t border-l border-on-dark/15 sm:grid-cols-4">
                  {sizes.options.map((option, index) => (
                    <Link
                      className="group flex aspect-square flex-col justify-between border-r border-b border-on-dark/15 p-4 transition-colors hover:bg-on-dark hover:text-foreground sm:p-5"
                      data-stagger-item
                      href={filterHref(sizes.param, option.value)}
                      key={option.value}
                    >
                      <span className="type-caption opacity-65">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-[clamp(1.75rem,3vw,3rem)] leading-none">
                        {option.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </StaggerReveal>
            </div>
          </section>

          <section aria-labelledby="browse-finish-title">
            <div className="grid gap-10 border-t border-on-dark/15 pt-7 md:grid-cols-12">
              <div className="md:col-span-4">
                <p className="type-caption text-on-dark-muted">02 / 06</p>
                <h3 className="type-h3 mt-4" id="browse-finish-title">
                  Browse by finish
                </h3>
                <p className="type-small mt-5 max-w-sm text-on-dark-muted">
                  {finishes.description}
                </p>
              </div>
              <StaggerReveal className="md:col-span-8" variant="sequence">
                <div className="border-t border-on-dark/15">
                  {finishes.options.map((option, index) => (
                    <Link
                      className="group grid min-h-28 grid-cols-[4rem_1fr_auto] items-center gap-5 border-b border-on-dark/15 py-4 transition-colors hover:bg-on-dark/5 sm:grid-cols-[6rem_1fr_auto]"
                      data-stagger-item
                      href={filterHref(finishes.param, option.value)}
                      key={option.value}
                    >
                      {option.media ? (
                        <MediaFrame
                          className="media-interactive aspect-square"
                          captionClassName="hidden"
                          media={option.media}
                          sizes="6rem"
                        />
                      ) : null}
                      <div>
                        <p className="type-caption text-on-dark-muted">
                          Development {String(index + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-2 font-display text-3xl leading-none sm:text-4xl">
                          {option.label}
                        </p>
                      </div>
                      <span
                        aria-hidden="true"
                        className="text-2xl transition-transform duration-300 group-hover:translate-x-2"
                      >
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </StaggerReveal>
            </div>
          </section>

          <section aria-labelledby="browse-surface-title">
            <div className="border-t border-on-dark/15 pt-7">
              <div className="grid gap-8 md:grid-cols-12">
                <div className="md:col-span-5">
                  <p className="type-caption text-on-dark-muted">03 / 06</p>
                  <h3 className="type-h3 mt-4" id="browse-surface-title">
                    Browse by surface
                  </h3>
                </div>
                <p className="type-small max-w-md text-on-dark-muted md:col-span-4 md:col-start-9">
                  {surfaces.description}
                </p>
              </div>

              <div className="mt-10 grid gap-5 sm:grid-cols-3">
                {surfaces.options.map((option, index) => (
                  <Link
                    className={`group block ${index === 1 ? "sm:mt-16" : ""}`}
                    href={filterHref(surfaces.param, option.value)}
                    key={option.value}
                  >
                    {option.media ? (
                      <ImageReveal>
                        <ParallaxMedia className="overflow-hidden">
                          <MediaFrame
                            className="media-interactive aspect-[4/5]"
                            media={option.media}
                            sizes="(min-width: 640px) 33vw, 100vw"
                          />
                        </ParallaxMedia>
                      </ImageReveal>
                    ) : null}
                    <div className="mt-4 flex items-center justify-between gap-5">
                      <span className="font-display text-3xl">
                        {option.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="transition-transform duration-300 group-hover:translate-x-2"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section aria-labelledby="browse-color-title">
            <div className="grid gap-10 border-t border-on-dark/15 pt-7 md:grid-cols-12">
              <div className="md:col-span-4">
                <p className="type-caption text-on-dark-muted">04 / 06</p>
                <h3 className="type-h3 mt-4" id="browse-color-title">
                  Browse by colour
                </h3>
                <p className="type-small mt-5 max-w-sm text-on-dark-muted">
                  {colors.description}
                </p>
              </div>
              <StaggerReveal className="md:col-span-8" variant="depth">
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  {colors.options.map((option) => (
                    <Link
                      className="group block"
                      data-stagger-item
                      href={filterHref(colors.param, option.value)}
                      key={option.value}
                    >
                      <span
                        aria-hidden="true"
                        className="block aspect-square border border-on-dark/15 transition-transform duration-500 group-hover:scale-[0.97]"
                        style={{ backgroundColor: option.swatch }}
                      />
                      <span className="type-caption mt-4 block text-on-dark-muted">
                        Temporary
                      </span>
                      <span className="mt-1 block">{option.label}</span>
                    </Link>
                  ))}
                </div>
              </StaggerReveal>
            </div>
          </section>

          <section aria-labelledby="browse-look-title">
            <div className="grid gap-10 border-t border-on-dark/15 pt-7 md:grid-cols-12">
              <div className="md:col-span-4">
                <p className="type-caption text-on-dark-muted">05 / 06</p>
                <h3 className="type-h3 mt-4" id="browse-look-title">
                  Browse by look
                </h3>
                <p className="type-small mt-5 max-w-sm text-on-dark-muted">
                  {looks.description}
                </p>
              </div>
              <StaggerReveal className="md:col-span-8" variant="sequence">
                <div className="border-t border-on-dark/15">
                  {looks.options.map((option, index) => (
                    <Link
                      className="group flex items-center justify-between gap-8 border-b border-on-dark/15 py-6"
                      data-stagger-item
                      href={filterHref(looks.param, option.value)}
                      key={option.value}
                    >
                      <span className="type-caption text-on-dark-muted">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-[clamp(2.4rem,6vw,6rem)] leading-none transition-transform duration-500 group-hover:-translate-x-2">
                        {option.label}
                      </span>
                      <span
                        aria-hidden="true"
                        className="text-2xl transition-transform duration-500 group-hover:translate-x-2"
                      >
                        →
                      </span>
                    </Link>
                  ))}
                </div>
              </StaggerReveal>
            </div>
          </section>

          <section aria-labelledby="browse-application-title">
            <div className="grid gap-10 border-t border-on-dark/15 pt-7 md:grid-cols-12">
              <div className="md:col-span-4">
                <p className="type-caption text-on-dark-muted">06 / 06</p>
                <h3 className="type-h3 mt-4" id="browse-application-title">
                  Browse by application
                </h3>
                <p className="type-small mt-5 max-w-sm text-on-dark-muted">
                  {applications.description}
                </p>
                <TextLink className="mt-8" href="/applications">
                  Explore applications
                </TextLink>
              </div>
              <StaggerReveal className="md:col-span-8" variant="directional">
                <div className="grid grid-cols-2 border-t border-l border-on-dark/15 sm:grid-cols-3">
                  {applications.options.map((option, index) => (
                    <Link
                      className="group flex min-h-36 flex-col justify-between border-r border-b border-on-dark/15 p-4 transition-colors hover:bg-on-dark hover:text-foreground sm:min-h-44 sm:p-5"
                      data-stagger-item
                      href={filterHref(applications.param, option.value)}
                      key={option.value}
                    >
                      <span className="type-caption opacity-60">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-2xl leading-none sm:text-3xl">
                        {option.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </StaggerReveal>
            </div>
          </section>
        </div>
      </Container>
    </Section>
  );
}
