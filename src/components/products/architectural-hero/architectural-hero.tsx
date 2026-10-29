"use client";

import type { HomepageHeroCategory } from "@/types/homepage-content";

import styles from "./architectural-hero.module.css";
import { AnimatedTileCategoryShowcase } from "./animated-tile-category-showcase";

export function ArchitecturalHero({ categories }: Readonly<{
  categories: readonly HomepageHeroCategory[];
}>) {
  return <section
    aria-labelledby="architectural-hero-title"
    className={styles.hero}
    data-home-hero
    data-home-header-tone="dark"
  >
    <h1 className={styles.srOnly} id="architectural-hero-title">ICON — World of Tile</h1>

    <div className={styles.stage} data-hero-scroll-stage>
      <AnimatedTileCategoryShowcase categories={categories} />
    </div>

  </section>;
}
