"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/arrow";
import { loadGsap } from "@/animations/load-gsap";
import type { ApplicationsPageData } from "@/types/applications";
import styles from "./applications.module.css";

const darkApplications = new Set(["commercial", "hospitality", "outdoor"]);

export function ApplicationsExperience({ data }: Readonly<{ data: ApplicationsPageData }>) {
  const rootRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const overviewRef = useRef<HTMLElement>(null);
  const [activeOverview, setActiveOverview] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!root || !header) return;
    let frame = 0;
    const syncHeader = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sampleY = Math.min(header.offsetHeight / 2, window.innerHeight / 2);
        const dark = Array.from(root.querySelectorAll<HTMLElement>("[data-header-theme='dark']")).some((section) => {
          const bounds = section.getBoundingClientRect();
          return bounds.top <= sampleY && bounds.bottom > sampleY;
        });
        header.dataset.theme = dark ? "dark" : "light";
      });
    };
    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    window.addEventListener("resize", syncHeader);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncHeader);
      window.removeEventListener("resize", syncHeader);
      delete header.dataset.theme;
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const hero = heroRef.current;
    const overview = overviewRef.current;
    if (!root || !hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;
    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return;
      const matchMedia = gsap.matchMedia();
      const context = gsap.context(() => {
        matchMedia.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          const heroMedia = hero.querySelector<HTMLElement>("[data-app-hero-media]");
          const heroCopy = hero.querySelector<HTMLElement>("[data-app-hero-copy]");
          const heroSurface = hero.querySelector<HTMLElement>("[data-app-surface-note]");
          if (heroMedia && heroCopy) {
            const heroTimeline = gsap.timeline({
              scrollTrigger: { trigger: hero, start: "top top", end: "bottom bottom", scrub: 1.3, invalidateOnRefresh: true },
            });
            heroTimeline
              .fromTo(heroMedia, { scale: 1.92, xPercent: -10, transformOrigin: "62% 42%" }, { scale: 1.035, xPercent: 0, ease: "none" }, 0)
              .fromTo(heroCopy, { yPercent: 24, opacity: 0.25 }, { yPercent: 0, opacity: 1, ease: "none" }, 0.16);
            if (heroSurface) heroTimeline.fromTo(heroSurface, { opacity: 1 }, { opacity: 0, ease: "none" }, 0);
          }

          if (overview) {
            let previous = -1;
            ScrollTrigger.create({
              trigger: overview,
              start: "top top",
              end: "bottom bottom",
              onUpdate: ({ progress }) => {
                const next = Math.min(data.applications.length - 1, Math.floor(progress * data.applications.length));
                if (next !== previous) {
                  previous = next;
                  setActiveOverview(next);
                }
              },
              onLeaveBack: () => setActiveOverview(0),
            });
          }

          root.querySelectorAll<HTMLElement>("[data-application-section]").forEach((section) => {
            const main = section.querySelector<HTMLElement>("[data-application-main]");
            const secondary = section.querySelector<HTMLElement>("[data-application-secondary]");
            const copy = section.querySelector<HTMLElement>("[data-application-copy]");
            if (!main || !copy) return;
            const transition = section.dataset.transition;
            const from = transition === "split" ? { clipPath: "inset(0 48% 0 48%)" }
              : transition === "mask" ? { clipPath: "circle(8% at 50% 50%)" }
              : transition === "drift" ? { xPercent: 15, clipPath: "inset(0 0 0 18%)" }
              : transition === "shift" ? { xPercent: -15, clipPath: "inset(0 22% 0 0)" }
              : transition === "grid" ? { clipPath: "polygon(0 0, 35% 0, 35% 55%, 100% 55%, 100% 100%, 0 100%)" }
              : { scale: 1.28, clipPath: "inset(8% 8% 8% 8%)" };
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: section, start: "top 68%", end: "top 16%", scrub: 1.65, invalidateOnRefresh: true },
            });
            timeline.fromTo(main, from, { xPercent: 0, scale: 1, clipPath: "inset(0% 0% 0% 0%)", ease: "none" }, 0)
              .fromTo(copy, { yPercent: 22, opacity: 0.2 }, { yPercent: 0, opacity: 1, ease: "none" }, 0.08);
            if (secondary) timeline.fromTo(secondary, { yPercent: 18, scale: 0.94 }, { yPercent: 0, scale: 1, ease: "none" }, 0.12);

            const image = main.querySelector("img");
            if (image) gsap.fromTo(image, { yPercent: -3, scale: 1.08 }, {
              yPercent: 3,
              scale: 1.08,
              ease: "none",
              scrollTrigger: { trigger: main, start: "top bottom", end: "bottom top", scrub: 1.4, invalidateOnRefresh: true },
            });
          });
        });
      }, root);
      cleanup = () => {
        matchMedia.revert();
        context.revert();
      };
    }).catch(() => {
      // Motion is progressive enhancement; all content remains visible.
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [data.applications]);

  return <main className={styles.page} id="main" ref={rootRef}>
    <section className={styles.hero} data-header-theme="dark" ref={heroRef} aria-labelledby="applications-title">
      <div className={styles.heroSticky}>
        <div className={styles.heroMedia} data-app-hero-media>
          <Image
            alt={data.hero.media.alt}
            fill
            priority
            quality={95}
            sizes="100vw"
            src={data.hero.media.src}
            style={{ objectFit: "cover", objectPosition: data.hero.media.position }}
          />
        </div>
        <div className={styles.heroShade} aria-hidden="true" />
        <span className={styles.surfaceNote} data-app-surface-note>Surface / close study</span>
        <div className={styles.heroCopy} data-app-hero-copy>
          <p className="eyebrow">{data.hero.eyebrow}</p>
          <h1 id="applications-title"><span>Surfaces</span><span>in context.</span></h1>
          <p>{data.hero.description}</p>
        </div>
        <div className={styles.heroProgress} aria-hidden="true"><span /><small>Material becomes architecture</small></div>
      </div>
    </section>

    <section className={styles.manifesto} aria-labelledby="manifesto-title">
      <p className="eyebrow">01 / Material becomes space</p>
      <h2 id="manifesto-title">One material.<br />Many environments.</h2>
      <div><span aria-hidden="true">01—06</span><p>A surface is first understood up close: texture, tone and light. Pull back, and it becomes part of the way a room is read, crossed and remembered.</p></div>
    </section>

    <section className={styles.overview} ref={overviewRef} aria-labelledby="application-index-title">
      <div className={styles.overviewSticky}>
        <div className={styles.overviewCopy}>
          <p className="eyebrow">02 / Application index</p>
          <h2 id="application-index-title">Move through<br />the spaces.</h2>
          <nav aria-label="Application sections">
            {data.applications.map((application, index) => <a
              aria-current={activeOverview === index ? "location" : undefined}
              href={`#${application.slug}`}
              key={application.id}
              onFocus={() => setActiveOverview(index)}
              onPointerEnter={() => setActiveOverview(index)}
            ><span>{application.index}</span><strong>{application.name}</strong><Arrow diagonal /></a>)}
          </nav>
        </div>
        <div className={styles.overviewVisual} aria-hidden="true">
          {data.applications.map((application, index) => <div className={activeOverview === index ? styles.overviewActive : ""} key={application.id}>
            <Image alt="" fill quality={90} sizes="(max-width: 899px) 100vw, 54vw" src={application.heroMedia.src} style={{ objectFit: "cover", objectPosition: application.heroMedia.position }} />
            <span>{application.index} / {application.name}</span>
          </div>)}
        </div>
      </div>
    </section>

    <div className={styles.stories}>
      {data.applications.map((application) => {
        const secondary = application.galleryMedia[0];
        const dark = darkApplications.has(application.slug);
        return <section
          className={`${styles.story} ${styles[application.slug]} ${styles[application.transition]}`}
          data-application-section
          data-header-theme={dark ? "dark" : "light"}
          data-transition={application.transition}
          id={application.slug}
          key={application.id}
          aria-labelledby={`${application.slug}-title`}
        >
          <header className={styles.storyCopy} data-application-copy>
            <p className="eyebrow">{application.index} / Application</p>
            <h2 id={`${application.slug}-title`}>{application.name}</h2>
            <p>{application.shortDescription}</p>
            <Link href={application.productHref}>Explore {application.name.toLocaleLowerCase()} surfaces <Arrow diagonal /></Link>
          </header>
          <div className={styles.storyMedia}>
            <figure className={styles.storyMain} data-application-main>
              <Image alt={application.heroMedia.alt} fill quality={95} sizes="(max-width: 899px) 100vw, 72vw" src={application.heroMedia.src} style={{ objectFit: "cover", objectPosition: application.heroMedia.position }} />
              <figcaption>Material in context <span>{application.index}</span></figcaption>
            </figure>
            {secondary ? <figure className={styles.storySecondary} data-application-secondary>
              <Image alt={secondary.alt} fill quality={90} sizes="(max-width: 899px) 82vw, 29vw" src={secondary.src} style={{ objectFit: "cover", objectPosition: secondary.position }} />
            </figure> : null}
          </div>
          {application.products.length ? <div className={styles.productPreview} aria-label={`${application.name} products`}>
            <p className="eyebrow">Mapped products</p>
            {application.products.map((product) => <Link href={`/products/${product.slug}`} key={product.id}><span>{product.category}</span><strong>{product.name}</strong><Arrow diagonal /></Link>)}
          </div> : null}
        </section>;
      })}
    </div>

    <section className={styles.discovery} aria-labelledby="discovery-title">
      <header><p className="eyebrow">09 / Discover by use</p><h2 id="discovery-title">Find your surface.</h2><p>Continue into the product world using only the application mappings currently available in the catalogue.</p></header>
      {data.discoveryLinks.length ? <nav aria-label="Browse products by use">
        {data.discoveryLinks.map((link) => <Link href={link.href} key={link.label}><span>{link.index}</span><strong>{link.label}</strong><Arrow diagonal /></Link>)}
      </nav> : <div className={styles.discoveryFallback}><span>Current material index</span><p>Begin with colour, look and collection while approved application mappings are being prepared.</p><Link href="/products">Explore all products <Arrow diagonal /></Link></div>}
    </section>

    <section className={styles.enquiry} data-header-theme="dark" aria-labelledby="application-enquiry-title">
      <p className="eyebrow">10 / Begin a conversation</p>
      <h2 id="application-enquiry-title">Planning<br />a space?</h2>
      <p>Explore a material direction with the ICON team.</p>
      <div><Link href="/contact">Start an enquiry <span><Arrow diagonal /></span></Link><Link href="/projects">Continue to projects <Arrow /></Link></div>
    </section>
  </main>;
}
