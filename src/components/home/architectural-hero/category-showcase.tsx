"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { loadGsap } from "@/animations/load-gsap";
import { ProjectLightbox } from "@/components/projects/project-lightbox";
import { waitForSiteLoader } from "@/lib/animation/site-loader";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import type { ProjectGalleryItem } from "@/types/projects";

import styles from "./category-showcase.module.css";

type CategoryShowcaseProps = Readonly<{
  categories: readonly HomepageHeroCategory[];
}>;

type CategoryGroupProps = Readonly<{
  category: HomepageHeroCategory;
  index: number;
  side: "left" | "right";
  onOpen: (categoryId: string, opener: HTMLButtonElement) => void;
}>;

function CategoryGroup({ category, index, side, onOpen }: CategoryGroupProps) {
  return <article className={`${styles.group} ${side === "right" ? styles.groupRight : styles.groupLeft}`}>
    <header className={styles.categoryTitle} data-showcase-piece data-side={side}>
      <h2>{category.title}</h2>
    </header>

    <figure className={styles.product} data-showcase-piece data-side={side}>
      {category.productImage.src ? <Image
        alt={category.productImage.alt}
        fill
        quality={86}
        sizes="(max-width: 760px) 42vw, (max-width: 1100px) 24vw, 12vw"
        src={category.productImage.src}
        style={{ objectFit: "cover", objectPosition: category.productImage.position ?? "50% 50%" }}
      /> : null}
    </figure>

    <button
      aria-haspopup="dialog"
      aria-label={`Open the ${category.title} interior image`}
      className={styles.interior}
      data-kind="interior"
      data-showcase-piece
      data-side={side}
      onClick={(event) => onOpen(category.id, event.currentTarget)}
      type="button"
    >
      {category.interiorImage.src ? <Image
        alt={category.interiorImage.alt}
        fill
        preload={index < 2}
        quality={88}
        sizes="(max-width: 760px) 92vw, (max-width: 1100px) 48vw, 22vw"
        src={category.interiorImage.src}
        style={{ objectFit: "cover", objectPosition: category.interiorImage.position ?? "50% 50%" }}
      /> : null}
      <span className={styles.interiorShade} />
      <span className={styles.interiorAction}><b>View interior</b><i aria-hidden="true">↗</i></span>
    </button>
  </article>;
}

export function CategoryShowcase({ categories }: CategoryShowcaseProps) {
  const root = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const visibleCategories = useMemo(() => categories.slice(0, 8), [categories]);
  const rows = Array.from({ length: Math.ceil(visibleCategories.length / 2) }, (_, index) => visibleCategories.slice(index * 2, index * 2 + 2));
  const lightboxItems = useMemo<readonly ProjectGalleryItem[]>(() => visibleCategories.flatMap((category) => category.interiorImage.src ? [{
    id: category.id,
    label: `${category.title} / Interior study`,
    media: {
      src: category.interiorImage.src,
      alt: category.interiorImage.alt,
      width: category.interiorImage.width ?? 1600,
      height: category.interiorImage.height ?? 1200,
      position: category.interiorImage.position,
    },
  }] : []), [visibleCategories]);

  const closeLightbox = useCallback(() => setActiveIndex(null), []);
  const changeLightbox = useCallback((index: number) => setActiveIndex(index), []);
  const openLightbox = useCallback((categoryId: string, button: HTMLButtonElement) => {
    const index = lightboxItems.findIndex((item) => item.id === categoryId);
    if (index < 0) return;
    opener.current = button;
    setActiveIndex(index);
  }, [lightboxItems]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const images = Array.from(element.querySelectorAll("img"));
    const imagesReady = Promise.all(images.map((image) => image.complete
      ? image.decode ? image.decode().catch(() => undefined) : Promise.resolve()
      : new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      })));

    const imageDeadline = new Promise<void>((resolve) => { deadline = setTimeout(resolve, 4000); });

    void Promise.all([loadGsap(), Promise.race([imagesReady, imageDeadline]), waitForSiteLoader()]).then(([{ gsap }]) => {
      if (disposed) return;
      if (deadline) clearTimeout(deadline);
      const context = gsap.context(() => {
        const pieces = Array.from(element.querySelectorAll<HTMLElement>("[data-showcase-piece]"));
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          element.dataset.ready = "true";
          gsap.set(pieces, { opacity: 1, clearProps: "transform" });
          return;
        }
        const timeline = gsap.timeline({
          defaults: { ease: "power3.out" },
          onComplete: () => {
            element.dataset.ready = "true";
            gsap.set(pieces, { clearProps: "transform,opacity" });
          },
        });
        pieces.forEach((piece, index) => {
          const side = piece.dataset.side === "right" ? 1 : -1;
          const isInterior = piece.dataset.kind === "interior";
          timeline.fromTo(piece, {
            x: side * (isInterior ? 78 : 118),
            opacity: 0,
            scale: isInterior ? .97 : 1,
          }, {
            x: 0,
            opacity: 1,
            scale: 1,
            duration: isInterior ? 1.2 : 1.05,
          }, Math.floor(index / 6) * .16 + (index % 6) * .045);
        });
        cleanup = () => timeline.kill();
      }, element);
      cleanup = () => context.revert();
    }).catch(() => {
      element.dataset.static = "true";
    });

    return () => {
      disposed = true;
      if (deadline) clearTimeout(deadline);
      cleanup?.();
    };
  }, []);

  return <>
    <div className={styles.showcase} data-ready="false" ref={root}>
      {rows.map((row, rowIndex) => <div className={styles.row} key={`row-${rowIndex + 1}`}>
        {row.map((category, categoryIndex) => <CategoryGroup
          category={category}
          index={rowIndex * 2 + categoryIndex}
          key={category.id}
          onOpen={openLightbox}
          side={categoryIndex === 0 ? "left" : "right"}
        />)}
      </div>)}
    </div>
    <noscript><style>{`.${styles.showcase}[data-ready="false"] [data-showcase-piece] { opacity: 1 !important; }`}</style></noscript>
    <ProjectLightbox
      activeIndex={activeIndex}
      items={lightboxItems}
      onChange={changeLightbox}
      onClose={closeLightbox}
      returnFocus={opener.current}
    />
  </>;
}
