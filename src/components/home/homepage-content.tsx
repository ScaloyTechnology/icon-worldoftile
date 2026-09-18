"use client";

import Image from "next/image";
import Link from "next/link";
import { type PointerEvent, useEffect, useRef, useState } from "react";

import { Arrow } from "@/components/arrow";
import { DiscoverIcon } from "@/components/home/discover-icon";
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
  if (response === "focused") return "Controlled reflection";
  if (response === "raking") return "Relief revealed by light";
  if (response === "uniform") return "Balanced material response";
  return "Quiet, diffused character";
}

export function HomepageContent({ data }: { data: HomepageContentData }) {
  const [activeSurface, setActiveSurface] = useState(0);
  const lightFrame = useRef(0);
  const pendingLight = useRef<{ target: HTMLAnchorElement; x: number; y: number } | null>(null);

  useEffect(() => () => {
    if (lightFrame.current) cancelAnimationFrame(lightFrame.current);
  }, []);

  const moveLight = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    pendingLight.current = { target: event.currentTarget, x: event.clientX, y: event.clientY };
    if (lightFrame.current) return;
    lightFrame.current = requestAnimationFrame(() => {
      lightFrame.current = 0;
      const pending = pendingLight.current;
      if (!pending) return;
      const bounds = pending.target.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((pending.x - bounds.left) / bounds.width) * 100));
      const y = Math.min(100, Math.max(0, ((pending.y - bounds.top) / bounds.height) * 100));
      pending.target.style.setProperty("--light-x", `${x.toFixed(1)}%`);
      pending.target.style.setProperty("--light-y", `${y.toFixed(1)}%`);
    });
  };

  return (
    <>
      <DiscoverIcon data={data} />

      <ProductShowcaseHero collections={data.collections.slice(0, 5)} />

      <section aria-labelledby="surfaces-title" className={styles.surfaces} data-home-header-tone="dark" id="surfaces">
        <header className={styles.sectionChapter} data-chapter>
          <p>04 / Explore surfaces</p><span>Surface atelier</span>
        </header>

        <div className={styles.surfaceIntro} data-editorial-copy>
          <h2 id="surfaces-title"><span>Find your</span><i>finish.</i></h2>
          <p>Explore how texture, depth and light shape each surface, then continue into the product library with that finish selected.</p>
        </div>

        <div aria-label="Browse products by surface" className={styles.surfaceGallery} data-image-reveal>
          {data.surfaces.map((surface, index) => {
            const image = surface.image ?? data.surfaceArchiveImage;
            return <Link
              aria-label={`Explore products with the ${surface.name} surface`}
              className={`${styles.surfacePanel} ${index === activeSurface ? styles.surfacePanelActive : ""}`}
              data-response={surfaceResponse(surface.name)}
              href={surface.href}
              key={surface.id}
              onFocus={() => setActiveSurface(index)}
              onPointerEnter={() => setActiveSurface(index)}
              onPointerLeave={(event) => {
                event.currentTarget.style.setProperty("--light-x", "66%");
                event.currentTarget.style.setProperty("--light-y", "32%");
              }}
              onPointerMove={moveLight}
            >
              <span className={styles.surfaceImage}>
                {image.src ? <Image
                  alt={image.alt}
                  fill
                  loading="lazy"
                  quality={100}
                  sizes="(max-width: 760px) 72vw, 22vw"
                  src={image.src}
                  style={{ objectFit: "cover", objectPosition: image.position }}
                  unoptimized
                /> : null}
                <span aria-hidden="true" className={styles.surfaceLight} />
              </span>
              <span className={styles.surfaceMeta}>
                <small>{number(index)}</small><strong>{surface.name}</strong><em>{surfaceDescriptor(surface.name)}</em><Arrow diagonal />
              </span>
            </Link>;
          })}
        </div>
      </section>

      <section aria-labelledby="home-enquiry-title" className={styles.enquiry} data-home-header-tone="dark">
        <p className={styles.enquiryChapter}>05 / Begin a conversation</p>
        <div className={styles.enquiryHeading} data-editorial-copy>
          <h2 id="home-enquiry-title"><span>Let’s shape your</span><i>next space.</i></h2>
          <p>Bring material, scale and architectural intent together with ICON.</p>
        </div>
        <Link className={styles.enquiryLink} href="/contact"><span>Get in touch</span><Arrow diagonal /></Link>
      </section>
    </>
  );
}
