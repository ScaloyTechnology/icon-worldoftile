"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { Arrow } from "@/components/arrow";
import { ProductShowcaseHero } from "@/components/home/product-showcase-hero/product-showcase-hero";
import type { HomepageContentData } from "@/types/homepage-content";

import styles from "./homepage-content.module.css";

function number(index: number) {
  return String(index + 1).padStart(2, "0");
}

function surfaceResponse(name: string) {
  const key = name.toLowerCase();
  if (key.includes("gloss") || key.includes("pgvt")) return "focused";
  if (key.includes("carving") || key.includes("double")) return "raking";
  if (key.includes("full body") || key.includes("porcelain")) return "uniform";
  return "soft";
}

function surfaceDescriptor(name: string) {
  const response = surfaceResponse(name);
  if (response === "focused") return "Focused light study";
  if (response === "raking") return "Raking light study";
  if (response === "uniform") return "Balanced light study";
  return "Soft light study";
}

export function HomepageContent({ data }: { data: HomepageContentData }) {
  const [activeSurface, setActiveSurface] = useState(0);
  const surfaceStage = useRef<HTMLAnchorElement>(null);
  const lightFrame = useRef(0);
  const selectedSurface = data.surfaces[activeSurface] ?? data.surfaces[0];

  useEffect(
    () => () => {
      if (lightFrame.current) cancelAnimationFrame(lightFrame.current);
    },
    [],
  );

  const moveLight = (event: PointerEvent<HTMLAnchorElement>) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const stage = surfaceStage.current;
    if (!stage || lightFrame.current) return;
    const { clientX, clientY } = event;
    lightFrame.current = requestAnimationFrame(() => {
      lightFrame.current = 0;
      const bounds = stage.getBoundingClientRect();
      const x = Math.min(
        100,
        Math.max(0, ((clientX - bounds.left) / bounds.width) * 100),
      );
      const y = Math.min(
        100,
        Math.max(0, ((clientY - bounds.top) / bounds.height) * 100),
      );
      stage.style.setProperty("--light-x", `${x.toFixed(1)}%`);
      stage.style.setProperty("--light-y", `${y.toFixed(1)}%`);
    });
  };

  const resetLight = () => {
    surfaceStage.current?.style.setProperty("--light-x", "68%");
    surfaceStage.current?.style.setProperty("--light-y", "38%");
  };

  return (
    <>
      <section
        aria-labelledby="discover-icon-title"
        className={styles.discover}
        data-home-header-tone="dark"
        id="discover-icon"
      >
        <header className={styles.sectionChapter} data-reveal>
          <p className="eyebrow">02 / Discover ICON</p>
          <span>Morbi / India</span>
        </header>

        <div className={styles.discoverGrid}>
          <div className={styles.discoverCopy} data-home-copy>
            <p className={styles.kicker}>The house of ICON</p>
            <h2 id="discover-icon-title">{data.discover.heading}</h2>
            <p>{data.discover.intro}</p>
            <Link
              className={styles.editorialLink}
              href={data.discover.cta.href}
            >
              {data.discover.cta.label}
              <Arrow diagonal />
            </Link>
          </div>

          <figure
            className={styles.discoverMedia}
            data-image-reveal
            data-parallax
          >
            {data.discover.image.src ? (
              <Image
                alt={data.discover.image.alt}
                fill
                quality={92}
                sizes="(max-width: 760px) 100vw, 62vw"
                src={data.discover.image.src}
                style={{
                  objectFit: "cover",
                  objectPosition: data.discover.image.position,
                }}
              />
            ) : null}
            <figcaption>Material and space / ICON archive</figcaption>
          </figure>
        </div>

        <ol
          aria-label="ICON company statistics"
          className={styles.discoverFacts}
          data-stagger-reveal
        >
          {data.discover.stats.map((stat, index) => (
            <li key={stat.value}>
              <small>{number(index)}</small>
              <strong>{stat.value}</strong>
              <div>
                <span>{stat.label}</span>
                {stat.note ? <em>{stat.note}</em> : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ProductShowcaseHero collections={data.collections.slice(0, 5)} />

      <section
        aria-labelledby="surfaces-title"
        className={styles.surfaces}
        data-home-header-tone="dark"
        id="surfaces"
      >
        <header className={styles.sectionChapter} data-reveal>
          <p className="eyebrow">04 / Explore surfaces</p>
          <span>Surface atelier</span>
        </header>

        <div className={styles.surfaceIntro} data-home-copy>
          <div>
            <p className={styles.kicker}>Light reveals material</p>
            <h2 id="surfaces-title">
              The surface
              <br />
              <i>atelier.</i>
            </h2>
          </div>
          <p>
            Move light across the sample to inspect its character, then enter
            the product library with the selected surface in focus.
          </p>
        </div>

        <div className={styles.surfaceLayout}>
          <Link
            aria-label={`Explore products with the ${selectedSurface?.name ?? "selected"} surface`}
            className={styles.surfaceStage}
            data-response={surfaceResponse(selectedSurface?.name ?? "")}
            href={selectedSurface?.href ?? "/products"}
            onPointerLeave={resetLight}
            onPointerMove={moveLight}
            ref={surfaceStage}
          >
            <span className={styles.surfacePlane} data-image-reveal>
              {data.surfaces.map((surface, index) => {
                const image = surface.image ?? data.surfaceArchiveImage;
                return image.src ? (
                  <Image
                    alt={index === activeSurface ? image.alt : ""}
                    aria-hidden={index !== activeSurface}
                    className={`${styles.surfaceImage} ${index === activeSurface ? styles.surfaceImageActive : ""}`}
                    fill
                    key={`${surface.id}-${image.src}`}
                    quality={90}
                    sizes="(max-width: 760px) 100vw, 65vw"
                    src={image.src}
                    style={{
                      objectFit: "cover",
                      objectPosition: image.position,
                    }}
                  />
                ) : null;
              })}
              <span aria-hidden="true" className={styles.surfaceLight} />
              <span aria-hidden="true" className={styles.surfaceEdge} />
            </span>
            <span className={styles.surfaceStageMeta}>
              <small>{surfaceDescriptor(selectedSurface?.name ?? "")}</small>
              <strong>{selectedSurface?.name ?? "Surface"}</strong>
              <span>
                {number(activeSurface)} /{" "}
                {String(data.surfaces.length).padStart(2, "0")}
              </span>
            </span>
            <span className={styles.inspectPrompt}>
              Move to inspect <Arrow diagonal />
            </span>
          </Link>

          <nav
            aria-label="Browse products by surface"
            className={styles.surfaceIndex}
            data-stagger-reveal
          >
            {data.surfaces.map((surface, index) => (
              <Link
                aria-current={activeSurface === index ? "page" : undefined}
                href={surface.href}
                key={surface.id}
                onFocus={() => setActiveSurface(index)}
                onPointerEnter={() => setActiveSurface(index)}
              >
                <small>{number(index)}</small>
                <strong>{surface.name}</strong>
                <span aria-hidden="true" />
                <Arrow diagonal />
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </>
  );
}
