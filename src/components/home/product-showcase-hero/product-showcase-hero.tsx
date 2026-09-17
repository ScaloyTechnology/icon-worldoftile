"use client";

import Image from "next/image";
import Link from "next/link";
import {
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { loadGsap } from "@/animations/load-gsap";
import { Arrow } from "@/components/arrow";
import type { HomeMedia } from "@/types/home";
import type { HomepageCollectionPreview } from "@/types/homepage-content";

import styles from "./product-showcase-hero.module.css";

function wrap(value: number, length: number) {
  return ((((value + length / 2) % length) + length) % length) - length / 2;
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
  {
    x: 0,
    y: 0,
    scale: 1,
    rotateY: 0,
    rotateZ: 0,
    opacity: 1,
    brightness: 1,
    zIndex: 50,
  },
  {
    x: 1,
    y: -0.72,
    scale: 0.86,
    rotateY: 10,
    rotateZ: 1.5,
    opacity: 0.78,
    brightness: 0.88,
    zIndex: 40,
  },
  {
    x: 2.05,
    y: -2.6,
    scale: 0.7,
    rotateY: 20,
    rotateZ: 3.2,
    opacity: 0.5,
    brightness: 0.7,
    zIndex: 30,
  },
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
  const edgeFade = distance > 2 ? Math.max(0.18, 1 - (distance - 2) * 1.65) : 1;

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

function CollectionImage({ media }: { media: HomeMedia }) {
  if (!media.src) return null;
  return (
    <Image
      alt={media.alt}
      fill
      quality={88}
      sizes="(max-width: 760px) 72vw, 23vw"
      src={media.src}
      style={{ objectFit: "cover", objectPosition: media.position }}
      unoptimized={media.src.startsWith("http")}
    />
  );
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function ProductShowcaseHero({
  collections,
}: {
  collections: readonly HomepageCollectionPreview[];
}) {
  const hero = useRef<HTMLElement>(null);
  const cards = useRef<Array<HTMLAnchorElement | null>>([]);
  const mobileTrack = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const moveToIndexRef = useRef<
    (index: number, onComplete?: () => void) => void
  >((index, onComplete) => {
    activeRef.current = index;
    onComplete?.();
  });
  const mobileFrame = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const total = collections.length;

  const setCurrent = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setActiveIndex(index);
  }, []);

  useLayoutEffect(() => {
    const element = hero.current;
    if (!element || collections.length < 2) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (reduced || mobile) {
      element.dataset.motion = reduced ? "reduced" : "mobile";
      moveToIndexRef.current = (index, onComplete) => {
        const target = Math.min(collections.length - 1, Math.max(0, index));
        setCurrent(target);
        cards.current[target]?.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "nearest",
          inline: "center",
        });
        onComplete?.();
      };
      return () => {
        moveToIndexRef.current = (index, onComplete) => {
          setCurrent(index);
          onComplete?.();
        };
        delete element.dataset.motion;
      };
    }

    let disposed = false;
    let cleanup: (() => void) | undefined;
    const paint = (stage: number) => {
      const lastIndex = collections.length - 1;
      const safeStage = Math.min(lastIndex, Math.max(0, stage));
      const step = Math.min(window.innerWidth * 0.215, 365);
      const arc = Math.min(window.innerHeight * 0.034, 29);
      setCurrent(Math.min(lastIndex, Math.max(0, Math.round(safeStage))));

      cards.current.forEach((card, index) => {
        if (!card) return;
        const offset = wrap(safeStage - index, collections.length);
        const position = resolveSpatialPosition(offset, step, arc);
        card.style.setProperty("--card-x", `${position.x}px`);
        card.style.setProperty("--card-y", `${position.y}px`);
        card.style.setProperty("--card-scale", position.scale.toFixed(4));
        card.style.setProperty("--card-rotate-y", `${position.rotateY}deg`);
        card.style.setProperty("--card-rotate-z", `${position.rotateZ}deg`);
        card.style.setProperty("--card-opacity", `${position.opacity}`);
        card.style.setProperty("--card-brightness", `${position.brightness}`);
        card.style.setProperty(
          "--card-glow-opacity",
          `${0.18 + position.scale * 0.55}`,
        );
        card.style.setProperty(
          "--card-shadow-opacity",
          `${0.3 + position.scale * 0.36}`,
        );
        card.style.setProperty(
          "--card-blur",
          `${Math.max(0, Math.abs(offset) - 1.1) * 0.34}px`,
        );
        card.style.zIndex = `${position.zIndex}`;
      });
    };

    paint(activeRef.current);
    void loadGsap()
      .then(({ gsap }) => {
        if (disposed) return;
        const stage = { value: activeRef.current };
        const moveToIndex = (index: number, onComplete?: () => void) => {
          const target = Math.min(collections.length - 1, Math.max(0, index));
          const travel = element.scrollHeight - window.innerHeight;
          const top = window.scrollY + element.getBoundingClientRect().top;
          window.scrollTo({
            top: top + travel * (target / Math.max(1, collections.length - 1)),
            behavior: "smooth",
          });
          onComplete?.();
        };
        moveToIndexRef.current = moveToIndex;

        const stepProgress = 1 / Math.max(1, collections.length - 1);
        const tween = gsap.to(stage, {
          value: collections.length - 1,
          ease: "none",
          onUpdate: () => paint(stage.value),
          scrollTrigger: {
            trigger: element,
            start: "top top",
            end: "bottom bottom",
            scrub: 1.85,
            snap: {
              snapTo: stepProgress,
              duration: { min: 0.55, max: 1.45 },
              delay: 0.1,
              ease: "power2.inOut",
              inertia: true,
            },
            invalidateOnRefresh: true,
          },
        });
        cleanup = () => {
          tween.scrollTrigger?.kill();
          tween.kill();
        };
        element.dataset.motion = "scroll";
      })
      .catch(() => {
        element.dataset.motion = "static";
      });

    return () => {
      disposed = true;
      cleanup?.();
      moveToIndexRef.current = (index, onComplete) => {
        setCurrent(index);
        onComplete?.();
      };
      delete element.dataset.motion;
    };
  }, [collections.length, setCurrent]);

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
        if (next < distance) {
          closest = index;
          distance = next;
        }
      });
      setCurrent(closest);
    });
  };

  const handleCarouselKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (
      !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)
    )
      return;
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const target = Math.min(
      total - 1,
      Math.max(0, activeRef.current + direction),
    );
    if (target === activeRef.current) return;
    event.preventDefault();
    moveToIndexRef.current(target, () =>
      cards.current[target]?.focus({ preventScroll: true }),
    );
  };

  return (
    <section
      aria-labelledby="collections-showcase-heading"
      className={styles.showcase}
      data-home-header-tone="dark"
      onKeyDown={handleCarouselKeyDown}
      ref={hero}
      style={
        {
          "--showcase-scroll-height": `${100 + Math.max(0, total - 1) * 72}svh`,
        } as CSSProperties
      }
    >
      <div className={styles.showcaseStage}>
        <div className={styles.headerCopy}>
          <p>03 / Collections</p>
          <h2 id="collections-showcase-heading">
            <span>Materials</span>
            <span>with character.</span>
          </h2>
        </div>

        <div
          className={styles.carousel}
          onScroll={handleMobileScroll}
          ref={mobileTrack}
        >
          <div className={styles.perspectiveField}>
            {collections.map((collection, index) => (
              <Link
                aria-label={`Explore the ${collection.name} collection in Products`}
                className={`${styles.card} ${index === activeIndex ? styles.cardActive : ""}`}
                href={collection.href}
                key={collection.id}
                ref={(node) => {
                  cards.current[index] = node;
                }}
              >
                <span className={styles.cardImage}>
                  <CollectionImage media={collection.image} />
                </span>
                <span className={styles.cardCaption}>
                  <small>{pad(index + 1)} / Collection</small>
                  <strong>{collection.name}</strong>
                  <em>Open filtered product library</em>
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className={styles.controls}>
          <button
            aria-label="Previous collection"
            disabled={activeIndex === 0}
            onClick={() => moveToIndexRef.current(activeIndex - 1)}
            type="button"
          >
            <Arrow />
          </button>
          <button
            aria-label="Next collection"
            disabled={activeIndex === total - 1}
            onClick={() => moveToIndexRef.current(activeIndex + 1)}
            type="button"
          >
            <Arrow />
          </button>
        </div>

        <div className={styles.counter} aria-live="polite">
          <span>{pad(activeIndex + 1)}</span>
          <i>/</i>
          <span>{pad(total)}</span>
        </div>
      </div>
    </section>
  );
}
