"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { Arrow } from "@/components/arrow";
import type { HomepageContentData } from "@/types/homepage-content";
import styles from "./discover-icon.module.css";

/** Isolated from the approved Surface presentation and its motion selectors. */
export function DiscoverIcon({ data }: { data: HomepageContentData }) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadGsap().then(({ gsap }) => {
      if (disposed || !root.current) return;
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          gsap.from("[data-discover-copy] > p, [data-discover-copy] h2 > *, [data-discover-copy] > a", {
            opacity: 0, y: 24, duration: 1.25,
            stagger: .1, ease: "power3.out", clearProps: "opacity,transform",
            scrollTrigger: { trigger: "[data-discover-copy]", start: "top 72%", once: true },
          });
          gsap.from("[data-discover-main]", {
            opacity: 0, y: 30, scale: .985, duration: 1.55, ease: "power3.out",
            clearProps: "opacity,transform",
            scrollTrigger: { trigger: "[data-discover-main]", start: "top 74%", once: true },
          });
          const values = gsap.utils.toArray<HTMLElement>("[data-stat-value]");
          const statistics = gsap.timeline({
            scrollTrigger: { trigger: "[data-discover-stats]", start: "top 74%", once: true },
          });
          statistics.from("[data-discover-stats] li", {
            opacity: 0, y: 20, duration: 1.1, stagger: .12,
            ease: "power3.out", clearProps: "opacity,transform",
          }, 0);
          values.forEach((element, index) => {
            const finalText = element.dataset.statValue ?? element.textContent ?? "";
            const target = Number(finalText.replace(/[^0-9.]/g, ""));
            if (!Number.isFinite(target)) return;
            const suffix = finalText.endsWith("+") ? "+" : "";
            const counter = { value: 0 };
            statistics.to(counter, {
              value: target, duration: 2.4, ease: "power3.out",
              onUpdate: () => { element.textContent = `${Math.round(counter.value).toLocaleString("en-US")}${suffix}`; },
              onComplete: () => { element.textContent = finalText; },
            }, index * .07);
          });
          // Restore complete figures when motion preferences change mid-animation.
          return () => values.forEach((element) => {
            element.textContent = element.dataset.statValue ?? element.textContent;
          });
        });
        match.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          gsap.fromTo("[data-discover-main] img", { yPercent: -2, scale: 1.05 }, {
            yPercent: 2, ease: "none",
            scrollTrigger: { trigger: "[data-discover-main]", start: "top bottom", end: "bottom top", scrub: 1.4 },
          });
          gsap.fromTo("[data-discover-detail]", { y: 14 }, {
            y: -14, ease: "none",
            scrollTrigger: { trigger: "[data-discover-main]", start: "top bottom", end: "bottom top", scrub: 1.5 },
          });
        });
      }, root);
      cleanup = () => { match.revert(); context.revert(); };
    }).catch(() => { /* The editorial spread remains visible without animation. */ });
    return () => { disposed = true; cleanup?.(); };
  }, []);

  return <section aria-labelledby="discover-icon-title" className={styles.discover} data-home-header-tone="light" id="discover-icon" ref={root}>
    <header className={styles.chapter}><p>02 / Discover ICON</p><span>Morbi / India</span></header>
    <div className={styles.spread}>
      <div className={styles.copy} data-discover-copy>
        <p className={styles.kicker}>The house of ICON</p>
        <h2 aria-label={data.discover.heading} id="discover-icon-title"><span>Nearly four<br />decades of</span><i>imagination.</i></h2>
        <p>{data.discover.intro}</p>
        <Link className={styles.link} href={data.discover.cta.href}>{data.discover.cta.label}<Arrow diagonal /></Link>
      </div>
      <div className={styles.visual}>
        <figure className={styles.mainImage} data-discover-main>
          {data.discover.image.src ? <Image alt={data.discover.image.alt} fill loading="lazy" quality={90} sizes="(max-width: 899px) 90vw, 50vw" src={data.discover.image.src} style={{ objectFit: "cover", objectPosition: data.discover.image.position }} /> : null}
          <figcaption>Material and space / ICON archive</figcaption>
        </figure>
        <div className={styles.detailPosition} data-discover-detail>
          <figure aria-label="Travertino Rome Decor material detail" className={styles.detail} tabIndex={0}>
            <div className={styles.detailImage}>
              {data.surfaceArchiveImage.src ? <Image alt={data.surfaceArchiveImage.alt} fill loading="lazy" quality={90} sizes="(max-width: 899px) 35vw, 16vw" src={data.surfaceArchiveImage.src} style={{ objectFit: "cover", objectPosition: "60% 25%" }} /> : null}
            </div>
            <figcaption><span>Material study</span><strong>Travertino Rome Decor</strong></figcaption>
          </figure>
        </div>
      </div>
    </div>
    <ol aria-label="ICON company statistics" className={styles.facts} data-discover-stats>
      {data.discover.stats.map((stat) => <li key={stat.label}>
        <strong aria-label={stat.value}><span aria-hidden="true" data-stat-value={stat.value}>{stat.value}</span></strong><span>{stat.label}</span>{stat.note ? <small>{stat.note}</small> : null}
      </li>)}
    </ol>
  </section>;
}
