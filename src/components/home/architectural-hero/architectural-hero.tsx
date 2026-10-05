"use client";

import { useEffect, useRef } from "react";

import { Arrow } from "@/components/arrow";
import type { HomepageHeroCategory } from "@/types/homepage-content";

import styles from "./architectural-hero.module.css";
import { AnimatedTileCategoryShowcase } from "./animated-tile-category-showcase";

export function ArchitecturalHero({ categories }: Readonly<{
  categories: readonly HomepageHeroCategory[];
}>) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    let frame = 0;
    let measureFrame = 0;
    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-home-header-tone]"));
    let marker = 24;
    let regions: Array<{ section: HTMLElement; top: number; bottom: number }> = [];
    const update = () => {
      frame = 0;
      const position = window.scrollY + marker;
      const current = regions.find(({ top, bottom }) => top <= position && bottom > position)?.section;
      if (current?.dataset.homeHeaderTone === "dark") {
        if (header.dataset.theme !== "dark") header.dataset.theme = "dark";
        if (current.dataset.homeHeaderTreatment === "transparent") {
          if (header.dataset.transparent !== "true") header.dataset.transparent = "true";
        } else if (header.dataset.transparent) delete header.dataset.transparent;
      } else {
        if (header.dataset.theme) delete header.dataset.theme;
        if (header.dataset.transparent) delete header.dataset.transparent;
      }
    };
    const measure = () => {
      measureFrame = 0;
      marker = Math.max(24, header.getBoundingClientRect().height / 2);
      const scrollY = window.scrollY;
      regions = sections.map((section) => {
        const bounds = section.getBoundingClientRect();
        return { section, top: bounds.top + scrollY, bottom: bounds.bottom + scrollY };
      });
      if (frame) cancelAnimationFrame(frame);
      update();
    };
    const scheduleMeasure = () => { if (!measureFrame) measureFrame = requestAnimationFrame(measure); };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    measure();
    const resize = new ResizeObserver(scheduleMeasure);
    sections.forEach((section) => resize.observe(section));
    resize.observe(header);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", scheduleMeasure);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (measureFrame) cancelAnimationFrame(measureFrame);
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", scheduleMeasure);
      delete header.dataset.theme;
      delete header.dataset.transparent;
    };
  }, []);

  return <section
    aria-labelledby="architectural-hero-title"
    className={styles.hero}
    data-home-header-tone="light"
    ref={root}
  >
    <h1 className={styles.srOnly} id="architectural-hero-title">ICON — World of Tile</h1>

    <div className={styles.stage} data-hero-scroll-stage>
      <AnimatedTileCategoryShowcase categories={categories} />
    </div>

    <div className={styles.bottom}>
      <a
        className={styles.explore}
        href="#discover-icon"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
          const target = document.getElementById("discover-icon");
          if (!target) return;
          event.preventDefault();
          target.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
          });
        }}
      >
        Explore More <Arrow diagonal />
      </a>
    </div>
  </section>;
}
