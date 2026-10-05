"use client";

import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { ProjectLightbox } from "@/components/projects/project-lightbox";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import type { ProjectGalleryItem } from "@/types/projects";
import { useTileCategoryMotion } from "./use-tile-category-motion";
import styles from "./animated-tile-category-showcase.module.css";

function tileImageSizes(media: HomepageHeroCategory["productImage"]) {
  // A wide uploaded slab is cropped by object-fit: cover. Request enough source
  // pixels for that crop, not just the visible face width, including hover scale.
  const aspect = media.width && media.height ? media.width / media.height : 1.55;
  const cropScale = Math.max(1, aspect / 1.55);
  return `(max-width: 760px) ${Math.ceil(80 * cropScale)}vw, (max-width: 1600px) ${Math.ceil(40 * cropScale)}vw, ${Math.ceil(640 * cropScale)}px`;
}

export function AnimatedTileCategoryShowcase({ categories }: Readonly<{
  categories: readonly HomepageHeroCategory[];
}>) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const { sceneRef, activeIndex, select } = useTileCategoryMotion(categories.length, lightboxIndex !== null);
  const current = categories[activeIndex];
  const gallery = useMemo<readonly ProjectGalleryItem[]>(() => categories.flatMap((category) => category.interiorImage.src ? [{
    id: category.id,
    label: `${category.title} / Interior`,
    media: {
      src: category.interiorImage.src,
      alt: category.interiorImage.alt,
      width: category.interiorImage.width ?? 1600,
      height: category.interiorImage.height ?? 1200,
      position: category.interiorImage.position,
    },
  }] : []), [categories]);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const changeLightbox = useCallback((index: number) => setLightboxIndex(index), []);

  if (!current) return null;

  return <>
    <div
      aria-label="Explore ICON tile categories. Scroll, drag horizontally, or use the arrow keys to change surface."
      aria-roledescription="interactive material showcase"
      className={styles.scene}
      data-motion="pending"
      data-native-scroll
      ref={sceneRef}
      role="region"
      tabIndex={0}
    >
      <div aria-hidden="true" className={styles.environments}>
        {categories.map((category, index) => <div
          className={styles.environment}
          data-active={activeIndex === index ? "true" : "false"}
          data-tile-environment
          key={category.id}
        >
          {category.interiorImage.src ? <Image
            alt=""
            data-initial-image={index === 0 ? "true" : undefined}
            draggable={false}
            fill
            loading={index === 0 ? undefined : Math.abs(index - activeIndex) <= 2 ? "eager" : "lazy"}
            preload={index === 0}
            quality={95}
            sizes="(max-width: 760px) 180vw, 105vw"
            src={category.interiorImage.src}
            style={{ objectFit: "cover", objectPosition: category.interiorImage.position ?? "50% 50%" }}
          /> : null}
        </div>)}
      </div>
      <div aria-hidden="true" className={styles.atmosphere} />
      <div aria-hidden="true" className={styles.axis} />

      <div className={styles.space}>
        {categories.map((category, index) => <div
          className={styles.sample}
          data-active={activeIndex === index ? "true" : "false"}
          data-sample-index={index}
          data-tile-sample
          key={category.id}
        >
          <button
            aria-label={`Select ${category.title}`}
            aria-pressed={activeIndex === index}
            className={styles.sampleButton}
            onClick={() => select(index)}
            tabIndex={activeIndex === index ? 0 : -1}
            type="button"
          >
            <span className={styles.face} data-tile-face>
              {category.productImage.src ? <Image
                alt={category.productImage.alt}
                data-initial-image={index === 0 ? "true" : undefined}
                draggable={false}
                fill
                loading={index === 0 ? undefined : Math.abs(index - activeIndex) <= 2 ? "eager" : "lazy"}
                preload={index === 0}
                quality={95}
                sizes={tileImageSizes(category.productImage)}
                src={category.productImage.src}
                style={{ objectFit: "cover", objectPosition: category.productImage.position ?? "50% 50%" }}
              /> : <span className={styles.placeholder}>{category.title}</span>}
            </span>
            <span className={styles.title}>{category.title}</span>
          </button>
        </div>)}
      </div>

      <div className={styles.toolbar} data-scene-control>
        <div className={styles.guide}>
          <span className={styles.desktopHint}>Scroll or drag to explore</span>
          <span className={styles.touchHint}>Swipe to explore</span>
          <span aria-hidden="true" className={styles.progress}><i data-tile-progress /></span>
        </div>
        <button
          aria-haspopup="dialog"
          className={styles.viewInterior}
          disabled={!current.interiorImage.src}
          onClick={(event) => {
            const index = gallery.findIndex((item) => item.id === current.id);
            if (index < 0) return;
            opener.current = event.currentTarget;
            setLightboxIndex(index);
          }}
          type="button"
        >View interior <span aria-hidden="true">↗</span></button>
      </div>

      <nav aria-label="Select a tile category" className={styles.navigation} data-scene-control>
        <button aria-label="Previous category" className={styles.arrow} disabled={activeIndex === 0} onClick={() => select(activeIndex - 1)} type="button">←</button>
        <div className={styles.markers}>
          {categories.map((category, index) => <button
            aria-label={category.title}
            aria-pressed={activeIndex === index}
            className={styles.marker}
            key={category.id}
            onClick={() => select(index)}
            title={category.title}
            type="button"
          ><span /></button>)}
        </div>
        <button aria-label="Next category" className={styles.arrow} disabled={activeIndex === categories.length - 1} onClick={() => select(activeIndex + 1)} type="button">→</button>
      </nav>
      <p aria-live="polite" aria-atomic="true" className={styles.srOnly}>{current.title}</p>
    </div>
    <noscript><style>{`.${styles.scene}[data-motion="pending"] .${styles.sample}[data-active="true"] { opacity:1; visibility:visible; } .${styles.scene} .${styles.navigation}, .${styles.scene} .${styles.toolbar} { display:none; }`}</style></noscript>
    <ProjectLightbox activeIndex={lightboxIndex} items={gallery} onChange={changeLightbox} onClose={closeLightbox} returnFocus={opener.current} />
  </>;
}
