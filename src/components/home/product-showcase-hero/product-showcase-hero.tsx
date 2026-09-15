"use client";

import Image from "next/image";
import Link from "next/link";
import { type KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { loadGsap } from "@/animations/load-gsap";
import type { ProductShowcaseItem, ProductShowcaseMedia } from "@/types/home-product-showcase";

import styles from "./product-showcase-hero.module.css";

function wrap(value: number, length: number) {
  return ((value + length / 2) % length + length) % length - length / 2;
}

type SpatialPosition = Readonly<{
  x: number;
  y: number;
  scale: number;
  rotateY: number;
  rotateZ: number;
  opacity: number;
  brightness: number;
  zIndex: number;
}>;

const spatialPositions: readonly SpatialPosition[] = [
  { x: 0, y: 0, scale: 1, rotateY: 0, rotateZ: 0, opacity: 1, brightness: 1, zIndex: 50 },
  { x: 1, y: -.72, scale: .86, rotateY: 10, rotateZ: 1.5, opacity: .78, brightness: .88, zIndex: 40 },
  { x: 2.05, y: -2.6, scale: .7, rotateY: 20, rotateZ: 3.2, opacity: .5, brightness: .7, zIndex: 30 },
] as const;

function mix(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function resolveSpatialPosition(offset: number, step: number, arc: number) {
  const direction = offset < 0 ? -1 : 1;
  const distance = Math.abs(offset);
  const bounded = Math.min(distance, spatialPositions.length - 1);
  const lower = Math.floor(bounded);
  const upper = Math.min(spatialPositions.length - 1, Math.ceil(bounded));
  const progress = bounded - lower;
  const from = spatialPositions[lower]!;
  const to = spatialPositions[upper]!;
  const edgeFade = distance > 2 ? Math.max(.18, 1 - (distance - 2) * 1.65) : 1;

  return {
    x: mix(from.x, to.x, progress) * step * direction,
    y: mix(from.y, to.y, progress) * arc,
    scale: mix(from.scale, to.scale, progress),
    rotateY: mix(from.rotateY, to.rotateY, progress) * -direction,
    rotateZ: mix(from.rotateZ, to.rotateZ, progress) * direction,
    opacity: mix(from.opacity, to.opacity, progress) * edgeFade,
    brightness: mix(from.brightness, to.brightness, progress),
    zIndex: Math.round(mix(from.zIndex, to.zIndex, progress)),
  };
}

function ProductImage({ media, preload = false }: { media: ProductShowcaseMedia; preload?: boolean }) {
  return <Image
    alt={media.alt}
    fill
    preload={preload}
    quality={88}
    sizes="(max-width: 760px) 72vw, 23vw"
    src={media.src}
    style={{ objectFit: "cover" }}
    unoptimized={media.src.startsWith("http")}
  />;
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function ProductShowcaseHero({ products }: { products: readonly ProductShowcaseItem[] }) {
  const hero = useRef<HTMLElement>(null);
  const cards = useRef<Array<HTMLAnchorElement | null>>([]);
  const mobileTrack = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const moveToIndexRef = useRef<(index: number, onComplete?: () => void) => void>((index, onComplete) => {
    activeRef.current = index;
    onComplete?.();
  });
  const mobileFrame = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const total = products.length;

  const setCurrent = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setActiveIndex(index);
  }, []);

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = Math.max(24, header.getBoundingClientRect().height / 2);
      const current = [...document.querySelectorAll<HTMLElement>("[data-home-header-tone]")].find((section) => {
        const bounds = section.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom > marker;
      });
      if (current?.dataset.homeHeaderTone === "dark") header.dataset.theme = "dark";
      else delete header.dataset.theme;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete header.dataset.theme;
    };
  }, []);

  useLayoutEffect(() => {
    const element = hero.current;
    if (!element || products.length < 2) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (reduced || mobile) {
      element.dataset.motion = reduced ? "reduced" : "mobile";
      moveToIndexRef.current = (index, onComplete) => {
        const target = Math.min(products.length - 1, Math.max(0, index));
        setCurrent(target);
        cards.current[target]?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest", inline: "center" });
        onComplete?.();
      };
      return () => {
        moveToIndexRef.current = (index, onComplete) => { setCurrent(index); onComplete?.(); };
        delete element.dataset.motion;
      };
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    const paint = (stage: number) => {
      const lastIndex = products.length - 1;
      const safeStage = Math.min(lastIndex, Math.max(0, stage));
      const step = Math.min(window.innerWidth * .215, 365);
      const arc = Math.min(window.innerHeight * .034, 29);
      setCurrent(Math.min(lastIndex, Math.max(0, Math.round(safeStage))));

      cards.current.forEach((card, index) => {
        if (!card) return;
        const offset = wrap(safeStage - index, products.length);
        const position = resolveSpatialPosition(offset, step, arc);
        card.style.setProperty("--card-x", `${position.x}px`);
        card.style.setProperty("--card-y", `${position.y}px`);
        card.style.setProperty("--card-scale", position.scale.toFixed(4));
        card.style.setProperty("--card-rotate-y", `${position.rotateY}deg`);
        card.style.setProperty("--card-rotate-z", `${position.rotateZ}deg`);
        card.style.setProperty("--card-opacity", `${position.opacity}`);
        card.style.setProperty("--card-brightness", `${position.brightness}`);
        card.style.setProperty("--card-glow-opacity", `${.18 + position.scale * .55}`);
        card.style.setProperty("--card-shadow-opacity", `${.3 + position.scale * .36}`);
        card.style.setProperty("--card-blur", `${Math.max(0, Math.abs(offset) - 1.1) * .34}px`);
        card.style.zIndex = `${position.zIndex}`;
      });
    };

    paint(activeRef.current);
    void loadGsap().then(({ gsap }) => {
      if (disposed) return;
      const stage = { value: activeRef.current };
      let tween: ReturnType<typeof gsap.to> | null = null;
      let transitioning = false;
      let motionComplete = true;
      let gestureLocked = false;
      let wheelAccumulator = 0;
      let lastWheelAt = 0;
      let unlockTimer = 0;

      const scheduleUnlock = () => {
        window.clearTimeout(unlockTimer);
        unlockTimer = window.setTimeout(() => {
          if (motionComplete && performance.now() - lastWheelAt >= 170) {
            transitioning = false;
            gestureLocked = false;
            wheelAccumulator = 0;
          } else scheduleUnlock();
        }, 180);
      };

      const moveToIndex = (index: number, onComplete?: () => void) => {
        const target = Math.min(products.length - 1, Math.max(0, index));
        if (Math.abs(target - stage.value) < .001) {
          paint(target);
          setCurrent(target);
          onComplete?.();
          return;
        }
        tween?.kill();
        transitioning = true;
        gestureLocked = true;
        motionComplete = false;
        wheelAccumulator = 0;
        tween = gsap.to(stage, {
          value: target,
          duration: .86,
          ease: "power4.inOut",
          overwrite: true,
          onUpdate: () => paint(stage.value),
          onComplete: () => {
            stage.value = target;
            paint(target);
            setCurrent(target);
            motionComplete = true;
            scheduleUnlock();
            onComplete?.();
          },
        });
      };
      moveToIndexRef.current = moveToIndex;

      const handleWheel = (event: WheelEvent) => {
        if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
        const bounds = element.getBoundingClientRect();
        if (window.scrollY > 2 || bounds.bottom < window.innerHeight * .82) return;

        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? window.innerHeight : 1;
        const delta = event.deltaY * unit;
        if (Math.abs(delta) < .5) return;
        lastWheelAt = performance.now();

        if (transitioning || gestureLocked) {
          event.preventDefault();
          scheduleUnlock();
          return;
        }

        const direction = delta > 0 ? 1 : -1;
        const current = activeRef.current;
        if ((direction < 0 && current === 0) || (direction > 0 && current === products.length - 1)) {
          wheelAccumulator = 0;
          return;
        }

        event.preventDefault();
        wheelAccumulator += delta;
        if (Math.abs(wheelAccumulator) < 42) return;
        moveToIndex(current + (wheelAccumulator > 0 ? 1 : -1));
      };

      const handleResize = () => paint(stage.value);
      window.addEventListener("wheel", handleWheel, { passive: false });
      window.addEventListener("resize", handleResize);
      cleanup = () => {
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("resize", handleResize);
        window.clearTimeout(unlockTimer);
        tween?.kill();
      };
      element.dataset.motion = "enhanced";
    }).catch(() => {
      element.dataset.motion = "static";
    });

    return () => {
      disposed = true;
      cleanup?.();
      moveToIndexRef.current = (index, onComplete) => { setCurrent(index); onComplete?.(); };
      delete element.dataset.motion;
    };
  }, [products.length, setCurrent]);

  const handleMobileScroll = () => {
    if (mobileFrame.current) return;
    mobileFrame.current = requestAnimationFrame(() => {
      mobileFrame.current = 0;
      const track = mobileTrack.current;
      if (!track) return;
      const center = track.getBoundingClientRect().left + track.clientWidth / 2;
      let closest = 0;
      let distance = Number.POSITIVE_INFINITY;
      cards.current.forEach((card, index) => {
        if (!card) return;
        const bounds = card.getBoundingClientRect();
        const next = Math.abs(bounds.left + bounds.width / 2 - center);
        if (next < distance) { closest = index; distance = next; }
      });
      setCurrent(closest);
    });
  };

  const handleCarouselKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const target = Math.min(total - 1, Math.max(0, activeRef.current + direction));
    if (target === activeRef.current) return;
    event.preventDefault();
    moveToIndexRef.current(target, () => cards.current[target]?.focus({ preventScroll: true }));
  };

  return <section
    aria-labelledby="product-showcase-heading"
    className={styles.showcase}
    data-home-header-tone="dark"
    onKeyDown={handleCarouselKeyDown}
    ref={hero}
  >
    <div className={styles.headerCopy}>
      <p>ICON / Selected surfaces</p>
      <h1 id="product-showcase-heading"><span>Materials</span><span>with character.</span></h1>
    </div>

    <div className={styles.carousel} onScroll={handleMobileScroll} ref={mobileTrack}>
      <div className={styles.perspectiveField}>
        {products.map((product, index) => <Link
          aria-label={`View ${product.name} product details`}
          className={`${styles.card} ${index === activeIndex ? styles.cardActive : ""}`}
          href={`/products/${product.slug}`}
          key={product.id}
          ref={(node) => { cards.current[index] = node; }}
        >
          <span className={styles.cardImage}><ProductImage media={product.texture} preload={index === 0} /></span>
          <span className={styles.cardCaption}>
            <small>{pad(index + 1)} / Surface</small>
            <strong>{product.name}</strong>
            {product.collection && <em>{product.collection}</em>}
          </span>
        </Link>)}
      </div>
    </div>

    <div className={styles.counter} aria-live="polite">
      <span>{pad(activeIndex + 1)}</span><i>/</i><span>{pad(total)}</span>
    </div>
  </section>;
}
