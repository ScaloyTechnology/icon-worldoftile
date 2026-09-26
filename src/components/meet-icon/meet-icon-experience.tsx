"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { Arrow } from "@/components/arrow";
import { GlobalPresenceSection } from "@/components/meet-icon/global-presence-section";
import type { HomeMedia } from "@/types/home";
import type { MeetIconContent } from "@/types/meet-icon";
import type { ContactUnit } from "@/types/contact-settings";

type MeetIconExperienceProps = Readonly<{
  content: MeetIconContent;
  contactUnits: readonly ContactUnit[];
}>;

function StoryMedia({
  media,
  priority = false,
  sizes = "100vw",
}: Readonly<{ media: HomeMedia; priority?: boolean; sizes?: string }>) {
  if (!media.src) {
    return (
      <div className={`meet-media meet-media--placeholder meet-media--${media.tone}`} role="img" aria-label={media.placeholderLabel}>
        <span className="meet-media__cross" aria-hidden="true" />
        <span className="eyebrow">Client media required</span>
        <span>{media.placeholderLabel}</span>
      </div>
    );
  }

  return (
    <div className="meet-media">
      <Image
        alt={media.alt}
        fill
        preload={priority}
        sizes={sizes}
        src={media.src}
        style={{ objectFit: "cover", objectPosition: media.position ?? "50% 50%" }}
      />
    </div>
  );
}

export function MeetIconExperience({ content, contactUnits }: MeetIconExperienceProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [activeTechnology, setActiveTechnology] = useState(0);
  const activeTechnologyItem = content.technology.steps[activeTechnology] ?? content.technology.steps[0];

  useEffect(() => {
    const root = rootRef.current;
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!root || !header) return;

    let frame = 0;
    const syncHeader = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sampleY = Math.min(header.getBoundingClientRect().height / 2, window.innerHeight / 2);
        const darkSection = Array.from(root.querySelectorAll<HTMLElement>("[data-header-theme='dark']")).find((section) => {
          const rect = section.getBoundingClientRect();
          return rect.top <= sampleY && rect.bottom > sampleY;
        });
        header.dataset.theme = darkSection ? "dark" : "light";
      });
    };

    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    window.addEventListener("resize", syncHeader);

    let cancelled = false;
    let animationCleanup: (() => void) | undefined;

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void loadGsap().then(({ gsap, ScrollTrigger }) => {
        if (cancelled) return;

        const context = gsap.context(() => {
          const hero = root.querySelector<HTMLElement>(".meet-hero");
          const heroFrame = root.querySelector<HTMLElement>(".meet-hero__frame");
          const heroImage = root.querySelector<HTMLElement>(".meet-hero__frame .meet-media");
          const heroTitle = root.querySelector<HTMLElement>(".meet-hero__title");
          const heroSupport = root.querySelector<HTMLElement>(".meet-hero__support");
          if (hero && heroFrame && heroImage && heroTitle && heroSupport) {
            gsap.timeline({
              scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: 0.65, invalidateOnRefresh: true },
            })
              .to(heroImage, { scale: 1.12, yPercent: 4, ease: "none" }, 0)
              .to(heroFrame, { clipPath: "inset(8% 11% 15% 11%)", ease: "none" }, 0)
              .to(heroTitle, { xPercent: -7, yPercent: -7, opacity: 0.38, ease: "none" }, 0)
              .to(heroSupport, { xPercent: 8, opacity: 0.15, ease: "none" }, 0);
          }

          const introHeading = root.querySelector<HTMLElement>(".meet-intro h2");
          const introLines = gsap.utils.toArray<HTMLElement>(".meet-mask-line", root);
          if (introHeading && introLines.length) {
            gsap.from(introLines, {
              yPercent: 108,
              duration: 0.72,
              stagger: 0.08,
              ease: "power3.out",
              scrollTrigger: { trigger: introHeading, start: "top 84%", once: true },
            });
          }

          const journey = root.querySelector<HTMLElement>(".meet-journey__timeline");
          const journeyLine = root.querySelector<HTMLElement>(".meet-journey__progress");
          if (journey && journeyLine) {
            gsap.fromTo(journeyLine, { scaleY: 0 }, {
              scaleY: 1,
              ease: "none",
              scrollTrigger: { trigger: journey, start: "top 76%", end: "bottom 42%", scrub: 0.7 },
            });
          }
          gsap.utils.toArray<HTMLElement>(".meet-journey__item", root).forEach((item, index) => {
            const visual = item.querySelector<HTMLElement>(".meet-journey__visual");
            const copy = item.querySelector<HTMLElement>(".meet-journey__copy");
            if (visual) gsap.fromTo(visual,
              { clipPath: index % 2 ? "inset(0 0 0 100%)" : "inset(0 100% 0 0)", scale: 1.025 },
              {
                clipPath: "inset(0% 0% 0% 0%)", scale: 1, ease: "none",
                scrollTrigger: { trigger: item, start: "top 84%", end: "top 52%", scrub: 0.7, invalidateOnRefresh: true },
              },
            );
            if (copy) gsap.fromTo(copy,
              { x: index % 2 ? 54 : -54, opacity: 0 },
              {
                x: 0, opacity: 1, ease: "none",
                scrollTrigger: { trigger: item, start: "top 86%", end: "top 56%", scrub: 0.65, invalidateOnRefresh: true },
              },
            );
          });

          const manufacturing = root.querySelector<HTMLElement>(".meet-manufacturing");
          const sequence = root.querySelector<HTMLElement>(".meet-manufacturing__sequence");
          const manufacturingFrames = gsap.utils.toArray<HTMLElement>(".meet-manufacturing__frame", root);
          const mediaQuery = gsap.matchMedia();
          mediaQuery.add("(min-width: 64rem)", () => {
            if (!manufacturing || !sequence || manufacturingFrames.length < 2) return;
            const firstFrame = manufacturingFrames[0];
            if (!firstFrame) return;
            manufacturing.classList.add("meet-motion-ready");
            gsap.set(manufacturingFrames, { autoAlpha: 0 });
            gsap.set(firstFrame, { autoAlpha: 1 });
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: sequence, start: "top top", end: () => `+=${window.innerHeight * 1.7}`, pin: true, scrub: 0.75, anticipatePin: 1, invalidateOnRefresh: true },
            });
            manufacturingFrames.slice(1).forEach((item, index) => {
              const previous = manufacturingFrames[index];
              if (!previous) return;
              timeline.to(previous, { autoAlpha: 0, scale: 0.965, duration: 0.45, ease: "power2.inOut" }, index)
                .fromTo(item, { autoAlpha: 0, clipPath: "inset(100% 0 0 0)" }, { autoAlpha: 1, clipPath: "inset(0% 0 0 0)", duration: 0.55, ease: "power2.inOut" }, index + 0.25);
            });
            return () => manufacturing.classList.remove("meet-motion-ready");
          });

          gsap.utils.toArray<HTMLElement>(".meet-technology__entry", root).forEach((entry, index) => {
            ScrollTrigger.create({
              trigger: entry,
              start: "top 72%",
              end: "bottom 36%",
              onEnter: () => setActiveTechnology(index),
              onEnterBack: () => setActiveTechnology(index),
            });
          });

          gsap.utils.toArray<HTMLElement>(".meet-values__word", root).forEach((word, index) => {
            gsap.fromTo(word, { xPercent: index % 2 ? 5 : -5 }, { xPercent: index % 2 ? -2 : 2, ease: "none", scrollTrigger: { trigger: word, start: "top 92%", end: "bottom 28%", scrub: 0.65 } });
          });

          gsap.utils.toArray<HTMLElement>(".meet-sustainability article, .meet-infrastructure__stats article, .meet-quality__copy li, .meet-suppliers li", root).forEach((item) => {
            gsap.from(item, { y: 22, opacity: 0, duration: 0.55, ease: "power2.out", scrollTrigger: { trigger: item, start: "top 84%", once: true } });
          });
          gsap.utils.toArray<HTMLElement>(".meet-process li", root).forEach((item, index) => {
            gsap.from(item, { opacity: 0.25, x: -14, duration: 0.48, delay: Math.min(index * 0.015, 0.16), ease: "power2.out", scrollTrigger: { trigger: item, start: "top 86%", once: true } });
          });

          const globalPresence = root.querySelector<HTMLElement>(".meet-global");
          if (globalPresence) {
            gsap.fromTo(".meet-global__chapter, .meet-global__intro h2, .meet-global__intro>p:not(.eyebrow), .meet-global__stat, .meet-global__locations", {
              y: 25, opacity: 0,
            }, {
              y: 0, opacity: 1, stagger: .08, ease: "none",
              scrollTrigger: { trigger: globalPresence, start: "top 82%", end: "top 50%", scrub: 0.7, invalidateOnRefresh: true },
            });
            gsap.fromTo(".meet-global__stage", {
              opacity: 0, scale: .965,
            }, {
              opacity: 1, scale: 1, ease: "none",
              scrollTrigger: { trigger: globalPresence, start: "top 80%", end: "top 46%", scrub: 0.75, invalidateOnRefresh: true },
            });
          }

          animationCleanup = () => {
            mediaQuery.revert();
            context.revert();
          };
        }, root);

        // Avoid a late refresh moving a pinned section after the visitor has
        // already started scrolling. The page is fully measurable at mount.
      }).catch(() => {
        // The document remains complete and readable without animation.
      });
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncHeader);
      window.removeEventListener("resize", syncHeader);
      animationCleanup?.();
      delete header.dataset.theme;
    };
  }, [content.journey.items.length, content.manufacturing.frames.length, content.technology.steps.length]);

  return (
    <main className="meet-page" id="main" ref={rootRef}>
      <section className="meet-hero" data-header-theme="dark" aria-labelledby="meet-hero-title">
        <div className="meet-hero__stage">
          <div className="meet-hero__frame"><StoryMedia media={content.hero.media} priority sizes="100vw" /></div>
          <div className="meet-hero__scrim" aria-hidden="true" />
          <div className="meet-hero__grid" aria-hidden="true" />
          <div className="meet-hero__content">
            <p className="eyebrow">{content.hero.eyebrow}</p>
            <h1 className="meet-hero__title" id="meet-hero-title">
              {content.hero.titleLines.map((line) => <span key={line}>{line}</span>)}
            </h1>
            <div className="meet-hero__support">
              <p>{content.hero.description}</p>
              <span className="meet-scroll-cue"><span>Scroll to begin</span><i aria-hidden="true" /></span>
            </div>
          </div>
        </div>
      </section>

      <section className="meet-intro" aria-labelledby="meet-intro-title">
        <p className="eyebrow">01 — {content.intro.eyebrow}</p>
        <div className="meet-intro__statement">
          <h2 id="meet-intro-title">
            {content.intro.statementLines.map((line) => <span className="meet-mask" key={line}><span className="meet-mask-line">{line}</span></span>)}
          </h2>
          <div className="meet-intro__aside"><span aria-hidden="true">01</span><p>{content.intro.description}</p></div>
        </div>
      </section>

      <section className="meet-journey" aria-labelledby="meet-journey-title">
        <header className="meet-section-head">
          <p className="eyebrow">02 — {content.journey.eyebrow}</p>
          <h2 id="meet-journey-title">{content.journey.title}</h2>
          <p>{content.journey.description}</p>
          <span className="meet-status">{content.journey.statusLabel}</span>
        </header>
        <ol className="meet-journey__timeline">
          <span className="meet-journey__rail" aria-hidden="true"><span className="meet-journey__progress" /></span>
          {content.journey.items.map((item, index) => (
            <li className="meet-journey__item" key={item.id}>
              <div className="meet-journey__copy">
                <div className="meet-journey__meta"><span>{item.year ?? "Date pending"}</span><span>{item.label}</span></div>
                <h3>{item.title}</h3>{item.description !== item.title ? <p>{item.description}</p> : null}
              </div>
              <div className="meet-journey__visual"><StoryMedia media={item.media} sizes="(max-width: 760px) 100vw, 48vw" /><span className="meet-journey__index">{String(index + 1).padStart(2, "0")}</span></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="meet-sustainability" aria-labelledby="meet-sustainability-title">
        <div className="meet-sustainability__media"><StoryMedia media={content.sustainability.media} sizes="(max-width: 760px) 100vw, 50vw" /></div>
        <div className="meet-sustainability__copy">
          <p className="eyebrow">03 — {content.sustainability.eyebrow}</p>
          <h2 id="meet-sustainability-title">{content.sustainability.title}</h2>
          <div className="meet-sustainability__items">{content.sustainability.items.map((item, index) => <article key={item.title}><span>{String(index + 1).padStart(2, "0")}</span>{item.metric ? <strong>{item.metric}</strong> : null}<h3>{item.title}</h3><p>{item.description}</p></article>)}</div>
        </div>
      </section>

      <section className="meet-manufacturing" aria-labelledby="meet-manufacturing-title">
        <header className="meet-section-head meet-section-head--dark-copy">
          <p className="eyebrow">04 — {content.manufacturing.eyebrow}</p>
          <h2 id="meet-manufacturing-title">{content.manufacturing.title}</h2>
          <p>{content.manufacturing.description}</p>
          <span className="meet-status">{content.manufacturing.statusLabel}</span>
        </header>
        <div className="meet-infrastructure__stats">
          {content.manufacturing.infrastructure.stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}
        </div>
        <div className="meet-manufacturing__sequence">
          {content.manufacturing.frames.map((item, index) => (
            <article className="meet-manufacturing__frame" key={item.id}>
              <div className="meet-manufacturing__technical" aria-hidden="true"><span>X / {String(index + 1).padStart(2, "0")}</span><span>PROCESS FRAME</span></div>
              <div className="meet-manufacturing__media"><StoryMedia media={item.media} sizes="(max-width: 760px) 100vw, 66vw" /></div>
              <div className="meet-manufacturing__copy"><p className="eyebrow">{item.label}</p><h3>{item.title}</h3><p>{item.description}</p></div>
            </article>
          ))}
        </div>
        <div className="meet-process" aria-labelledby="meet-process-title">
          <div className="meet-process__head"><p className="eyebrow">How tiles are made</p><h3 id="meet-process-title">From material to dispatch.</h3></div>
          <ol>{content.manufacturing.process.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, "0")}</span><strong>{stage}</strong></li>)}</ol>
        </div>
      </section>

      <section className="meet-technology" aria-labelledby="meet-technology-title">
        <header className="meet-section-head meet-section-head--dark-copy">
          <p className="eyebrow">05 — {content.technology.eyebrow}</p>
          <h2 id="meet-technology-title">{content.technology.title}</h2>
          <p>{content.technology.description}</p>
        </header>
        <div className="meet-technology__layout">
          <div className="meet-technology__sticky" aria-live="polite">
            {activeTechnologyItem ? <div className="meet-technology__media-change" key={activeTechnologyItem.id}><StoryMedia media={activeTechnologyItem.media} sizes="(max-width: 1023px) 100vw, 50vw" /></div> : null}
            <span className="meet-technology__active">{String(activeTechnology + 1).padStart(2, "0")} / {String(content.technology.steps.length).padStart(2, "0")}</span>
          </div>
          <ol className="meet-technology__list">
            {content.technology.steps.map((item, index) => (
              <li className="meet-technology__entry" key={item.id}>
                <button type="button" aria-pressed={activeTechnology === index} onClick={() => setActiveTechnology(index)} onFocus={() => setActiveTechnology(index)} onPointerEnter={() => setActiveTechnology(index)}>
                  <span className="meet-technology__number">{String(index + 1).padStart(2, "0")}</span>
                  <span><small>{item.label}</small><strong>{item.title}</strong><em>{item.description}</em></span>
                  <Arrow diagonal />
                </button>
              </li>
            ))}
          </ol>
        </div>
        <div className="meet-machinery">
          <span className="eyebrow">Machinery / Technology partners</span>
          {content.technology.machineryPartners.length ? <p>{content.technology.machineryPartners.map((partner) => partner.name).join(" / ")}</p> : <p>{content.technology.machineryStatusLabel}</p>}
        </div>
      </section>

      <section className="meet-quality" aria-labelledby="meet-quality-title">
        <div className="meet-quality__media"><StoryMedia media={content.quality.media} sizes="(max-width: 760px) 100vw, 52vw" /><span className="eyebrow">Process-wise checkpoints</span></div>
        <div className="meet-quality__copy">
          <p className="eyebrow">06 — {content.quality.eyebrow}</p><h2 id="meet-quality-title">{content.quality.title}</h2><p>{content.quality.description}</p>
          <ol>{content.quality.items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol>
          <div className="meet-quality__marks" aria-label="Certification marks shown in the company profile">{content.quality.marks.map((mark) => <span key={mark}>{mark}</span>)}</div>
        </div>
      </section>

      <section className="meet-values" aria-labelledby="meet-values-title">
        <header className="meet-section-head">
          <p className="eyebrow">07 — {content.values.eyebrow}</p><h2 id="meet-values-title">{content.values.title}</h2><p>{content.values.description}</p>
        </header>
        <div className="meet-values__list">
          {content.values.items.map((item) => <article key={item.id}><span>{item.label}</span><h3 className="meet-values__word">{item.title}</h3><p>{item.description}</p></article>)}
        </div>
      </section>

      <section className="meet-innovation" aria-labelledby="meet-innovation-title">
        <div className="meet-innovation__copy"><p className="eyebrow">08 — {content.innovation.eyebrow}</p><h2 id="meet-innovation-title">{content.innovation.title}</h2><p>{content.innovation.description}</p><div className="meet-innovation__marks">{content.innovation.marks.map((mark) => <span key={mark}>{mark}</span>)}</div></div>
        <div className="meet-innovation__media"><StoryMedia media={content.innovation.media} sizes="(max-width: 760px) 100vw, 55vw" /></div>
        <div className="meet-nature"><p className="eyebrow">Nature / Material</p><h3>{content.innovation.natureTitle}</h3><p>{content.innovation.natureDescription}</p></div>
      </section>

      <section className="meet-specifications" aria-labelledby="meet-specifications-title">
        <header><p className="eyebrow">09 — {content.specifications.eyebrow}</p><h2 id="meet-specifications-title">{content.specifications.title}</h2></header>
        <div className="meet-specifications__grid"><div><span className="eyebrow">Surfaces / {content.specifications.surfaces.length}</span><ul>{content.specifications.surfaces.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul></div><div><span className="eyebrow">Sizes / {content.specifications.sizes.length}</span><ul>{content.specifications.sizes.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul></div></div>
      </section>

      <GlobalPresenceSection content={content.markets} units={contactUnits} />

      <section className="meet-suppliers" aria-labelledby="meet-suppliers-title">
        <header><p className="eyebrow">11 — {content.suppliers.eyebrow}</p><h2 id="meet-suppliers-title">{content.suppliers.title}</h2></header>
        <ul>{content.suppliers.items.map((supplier, index) => <li key={supplier}><span>{String(index + 1).padStart(2, "0")}</span><strong>{supplier}</strong></li>)}</ul>
      </section>

      <section className="meet-certifications" aria-labelledby="meet-certifications-title">
        <header className="meet-section-head meet-section-head--dark-copy">
          <p className="eyebrow">12 — {content.certifications.eyebrow}</p><h2 id="meet-certifications-title">{content.certifications.title}</h2><p>{content.certifications.description}</p>
        </header>
        <ol className="meet-certifications__rail">
          {content.certifications.items.map((item, index) => (
            <li key={item.id}>
              <div className="meet-certifications__mark" aria-hidden="true">{String(index + 1).padStart(2, "0")}</div>
              <div><span className="eyebrow">Profile mark</span><h3>{item.label}</h3><p>{item.supportingText}</p></div>
              {item.documentHref ? <Link className="text-link" href={item.documentHref}>View document <Arrow /></Link> : <span className="meet-certifications__pending">Shown in company profile</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="meet-research" aria-labelledby="meet-research-title">
        <div className="meet-research__media"><StoryMedia media={content.research.media} sizes="(max-width: 760px) 100vw, 54vw" /></div>
        <div className="meet-research__copy">
          <p className="eyebrow">13 — {content.research.eyebrow}</p><h2 id="meet-research-title">{content.research.title}</h2><p className="meet-research__statement">{content.research.statement}</p><p>{content.research.description}</p>
          <ul>{content.research.details.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul>
        </div>
      </section>

      <section className="meet-next" data-header-theme="dark" aria-labelledby="meet-next-title">
        <div className="meet-next__media"><StoryMedia media={content.finalCta.media} sizes="100vw" /></div>
        <div className="meet-next__scrim" aria-hidden="true" />
        <div className="meet-next__content"><p className="eyebrow">{content.finalCta.eyebrow}</p><h2 id="meet-next-title">{content.finalCta.title}</h2><p>{content.finalCta.description}</p><Link className="meet-next__link" href={content.finalCta.href}>{content.finalCta.linkLabel}<span className="circle"><Arrow diagonal /></span></Link></div>
      </section>
    </main>
  );
}
