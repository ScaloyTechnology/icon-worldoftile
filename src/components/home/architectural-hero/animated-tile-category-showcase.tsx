"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { HomepageHeroCategory } from "@/types/homepage-content";
import { useTileCategoryMotion } from "./use-tile-category-motion";
import { withMattReference } from "./tile-surface-assets";
import styles from "./animated-tile-category-showcase.module.css";

const TileMaterialScene = dynamic(() => import("./tile-material-scene"), { ssr: false, loading: () => null });

class MaterialSceneBoundary extends Component<{ children: ReactNode; onFallback: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function tileImageSizes(media: HomepageHeroCategory["productImage"]) {
  // Request extra source detail for the relief/normal maps and for oblique views,
  // while preserving the square sample's existing crop and CSS dimensions.
  const aspect = media.width && media.height ? media.width / media.height : 1;
  const cropScale = Math.max(1, aspect);
  return `(max-width: 760px) ${Math.ceil(110 * cropScale)}vw, (max-width: 1600px) ${Math.ceil(60 * cropScale)}vw, ${Math.ceil(1024 * cropScale)}px`;
}

export function AnimatedTileCategoryShowcase({ categories: sourceCategories }: Readonly<{
  categories: readonly HomepageHeroCategory[];
}>) {
  const categories = useMemo(() => sourceCategories.map(withMattReference), [sourceCategories]);
  const { sceneRef, modelMotion, activeIndex, select } = useTileCategoryMotion(categories.length, false);
  const [enableModel, setEnableModel] = useState(false);
  const fallback = useCallback(() => setEnableModel(false), []);
  const current = categories[activeIndex];

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    let cancelled = false;
    const frame = requestAnimationFrame(() => {
      if (cancelled) return;
      try {
        const probe = document.createElement("canvas");
        const context = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
        if (!context) return;
        context.getExtension("WEBGL_lose_context")?.loseContext();
        setEnableModel(true);
      } catch { /* The same drag pose still works on the image fallback. */ }
    });
    return () => { cancelled = true; cancelAnimationFrame(frame); };
  }, [sceneRef]);

  if (!current) return null;

  return <>
    <div
      aria-label="ICON tile materials"
      aria-describedby="tile-rotation-help"
      aria-roledescription="interactive material showcase"
      className={styles.scene}
      data-motion="pending"
      ref={sceneRef}
      role="region"
      tabIndex={0}
    >
      <div className={styles.space}>
        {enableModel && <div className={styles.models}>
          <MaterialSceneBoundary onFallback={fallback}>
            <TileMaterialScene categories={categories} sceneRef={sceneRef} motion={modelMotion} onFallback={fallback} />
          </MaterialSceneBoundary>
        </div>}
        {categories.map((category, index) => <div
          className={styles.sample}
          data-active={activeIndex === index ? "true" : "false"}
          data-sample-index={index}
          data-tile-sample
          key={category.id}
        >
          <button
            aria-label={activeIndex === index ? `Explore ${category.title}. Click and drag to rotate 360 degrees; release to return. Or hold Shift and use the arrow keys.` : `Select ${category.title}`}
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
      <span aria-hidden="true" className={styles.pointerDot} data-tile-pointer />
      <p className={styles.srOnly} id="tile-rotation-help">Hold the left mouse button and drag to rotate the active tile. Release to return to its original position. On touchscreens, drag horizontally to rotate and release to return. Hold Shift and use the arrow keys to tilt with the keyboard. Select a neighbouring tile, or use arrow keys or the mouse wheel, to change material. Reduced motion keeps the tile still.</p>
      <p aria-live="polite" aria-atomic="true" className={styles.srOnly}>{current.title}</p>
    </div>
    <noscript><style>{`.${styles.scene}[data-motion="pending"] .${styles.sample}[data-active="true"] { opacity:1; visibility:visible; }`}</style></noscript>
  </>;
}
