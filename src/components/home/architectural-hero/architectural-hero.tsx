"use client";

import Image from "next/image";
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { loadGsap } from "@/animations/load-gsap";
import { Arrow } from "@/components/arrow";
import type { HomepageHeroScene } from "@/types/homepage-content";

import styles from "./architectural-hero.module.css";

type SceneState = Readonly<{
  active: number;
  previous: number | null;
  direction: 1 | -1;
}>;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function ArchitecturalHero({
  scenes,
}: {
  scenes: readonly HomepageHeroScene[];
}) {
  const root = useRef<HTMLElement>(null);
  const scenesRef = useRef<Array<HTMLElement | null>>([]);
  const sceneRef = useRef(0);
  const pointerFrame = useRef(0);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [scene, setScene] = useState<SceneState>({
    active: 0,
    previous: null,
    direction: 1,
  });
  const total = scenes.length;

  const commitScene = useCallback(
    (next: number) => {
      const target = Math.min(total - 1, Math.max(0, next));
      if (target === sceneRef.current) return;
      const previous = sceneRef.current;
      const direction = target > previous ? 1 : -1;
      sceneRef.current = target;
      setScene({ active: target, previous, direction });
    },
    [total],
  );

  const selectScene = useCallback(
    (next: number) => {
      const target = Math.min(total - 1, Math.max(0, next));
      const element = root.current;
      if (element?.dataset.motion === "scroll" && total > 1) {
        const travel = element.scrollHeight - window.innerHeight;
        const top = window.scrollY + element.getBoundingClientRect().top;
        window.scrollTo({
          top: top + travel * (target / (total - 1)),
          behavior: "smooth",
        });
        return;
      }
      commitScene(target);
    },
    [commitScene, total],
  );

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || total < 2) return;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    if (reduced || mobile) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadGsap()
      .then(({ gsap, ScrollTrigger }) => {
        if (disposed) return;
        const progress = { value: 0 };
        const last = total - 1;
        const paint = () => {
          const stage = progress.value;
          const nextActive = Math.min(last, Math.max(0, Math.round(stage)));
          commitScene(nextActive);
          scenesRef.current.forEach((item, index) => {
            if (!item) return;
            const distance = Math.abs(stage - index);
            const opacity = Math.max(0, Math.min(1, 1 - distance));
            const travel = Math.max(-1, Math.min(1, index - stage));
            gsap.set(item, {
              autoAlpha: opacity > 0.002 ? opacity : 0,
              scale: 1.018 + Math.min(distance, 1) * 0.018,
              xPercent: travel * 1.4,
              zIndex: Math.round(20 - distance),
            });
          });
        };
        paint();
        const tween = gsap.to(progress, {
          value: last,
          ease: "none",
          onUpdate: paint,
          scrollTrigger: {
            trigger: element,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.65,
            invalidateOnRefresh: true,
          },
        });
        element.dataset.motion = "scroll";
        cleanup = () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          scenesRef.current.forEach((item) => {
            if (item) gsap.set(item, { clearProps: "all" });
          });
          delete element.dataset.motion;
        };
        ScrollTrigger.refresh();
      })
      .catch(() => {
        element.dataset.motion = "static";
      });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [commitScene, total]);

  useEffect(
    () => () => {
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
    },
    [],
  );

  useEffect(() => {
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!header) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = Math.max(24, header.getBoundingClientRect().height / 2);
      const current = [
        ...document.querySelectorAll<HTMLElement>("[data-home-header-tone]"),
      ].find((section) => {
        const bounds = section.getBoundingClientRect();
        return bounds.top <= marker && bounds.bottom > marker;
      });
      if (current?.dataset.homeHeaderTone === "dark") {
        header.dataset.theme = "dark";
        if (current.dataset.homeHeaderTreatment === "transparent")
          header.dataset.transparent = "true";
        else delete header.dataset.transparent;
      } else {
        delete header.dataset.theme;
        delete header.dataset.transparent;
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete header.dataset.theme;
      delete header.dataset.transparent;
    };
  }, []);

  const moveDepth = (event: PointerEvent<HTMLElement>) => {
    if (
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const element = root.current;
    if (!element || pointerFrame.current) return;
    const { clientX, clientY } = event;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      const bounds = element.firstElementChild?.getBoundingClientRect() ?? element.getBoundingClientRect();
      const x = ((clientX - bounds.left) / bounds.width - 0.5) * 8;
      const y = ((clientY - bounds.top) / bounds.height - 0.5) * 6;
      element.style.setProperty("--hero-depth-x", `${x.toFixed(2)}px`);
      element.style.setProperty("--hero-depth-y", `${y.toFixed(2)}px`);
    });
  };

  const resetDepth = () => {
    root.current?.style.setProperty("--hero-depth-x", "0px");
    root.current?.style.setProperty("--hero-depth-y", "0px");
  };

  const pointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === "touch")
      touchStart.current = { x: event.clientX, y: event.clientY };
  };

  const pointerUp = (event: PointerEvent<HTMLElement>) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || event.pointerType !== "touch") return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) > 48 && Math.abs(x) > Math.abs(y))
      selectScene(sceneRef.current + (x < 0 ? 1 : -1));
  };

  if (!total) return null;
  const activeScene = scenes[scene.active]!;
  const nextIndex = (scene.active + 1) % total;
  const nextScene = scenes[nextIndex]!;

  return (
    <section
      aria-labelledby="architectural-hero-title"
      className={styles.hero}
      data-direction={scene.direction > 0 ? "next" : "previous"}
      data-home-header-tone="dark"
      data-home-header-treatment="transparent"
      onPointerDown={pointerDown}
      onPointerLeave={resetDepth}
      onPointerMove={moveDepth}
      onPointerUp={pointerUp}
      ref={root}
      style={
        {
          "--hero-scroll-height": `${100 + Math.max(0, total - 1) * 72}svh`,
        } as CSSProperties
      }
    >
      <div className={styles.stage}>
        <div aria-live="polite" className={styles.sceneStack}>
          {scenes.map((item, index) => (
            <figure
              aria-hidden={index !== scene.active}
              className={`${styles.scene} ${index === scene.active ? styles.sceneActive : ""} ${index === scene.previous ? styles.scenePrevious : ""}`}
              key={item.id}
              ref={(node) => {
                scenesRef.current[index] = node;
              }}
            >
              {item.image.src ? (
                <Image
                  alt={item.image.alt}
                  fill
                  loading={index === 0 ? undefined : "eager"}
                  preload={index === 0}
                  quality={90}
                  sizes="100vw"
                  src={item.image.src}
                  style={{
                    objectFit: "cover",
                    objectPosition: item.image.position,
                  }}
                />
              ) : null}
            </figure>
          ))}
        </div>
        <div aria-hidden="true" className={styles.scrim} />

        <div className={styles.copy} key={activeScene.id}>
          <p className={styles.eyebrow}>{activeScene.eyebrow}</p>
          <h1 id="architectural-hero-title">
            <span>{activeScene.title}</span>
            <i>{activeScene.emphasis}</i>
          </h1>
          <p className={styles.supporting}>{activeScene.supportingText}</p>
          <a className={styles.explore} href="#discover-icon">
            Explore More <Arrow diagonal />
          </a>
        </div>

        <div className={styles.sceneControls}>
          <div className={styles.arrows}>
            <button
              aria-label="Previous material scene"
              disabled={scene.active === 0}
              onClick={() => selectScene(scene.active - 1)}
              type="button"
            >
              <Arrow />
            </button>
            <button
              aria-label="Next material scene"
              disabled={scene.active === total - 1}
              onClick={() => selectScene(scene.active + 1)}
              type="button"
            >
              <Arrow />
            </button>
          </div>
          <div
            aria-label="Select a material scene"
            className={styles.index}
            role="group"
          >
            {scenes.map((item, index) => (
              <button
                aria-label={`Show scene ${index + 1}: ${item.title} ${item.emphasis}`}
                aria-pressed={index === scene.active}
                key={item.id}
                onClick={() => selectScene(index)}
                type="button"
              >
                <span>{pad(index + 1)}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          className={styles.nextPreview}
          onClick={() => selectScene(nextIndex)}
          type="button"
        >
          <span className={styles.previewImage}>
            {nextScene.image.src ? (
              <Image
                alt=""
                fill
                sizes="11rem"
                src={nextScene.image.src}
                style={{
                  objectFit: "cover",
                  objectPosition: nextScene.image.position,
                }}
              />
            ) : null}
          </span>
          <span>
            <small>Next material study</small>
            <strong>{nextScene.emphasis}</strong>
          </span>
          <Arrow diagonal />
        </button>

        <div className={styles.heroFoot}>
          <span>
            {pad(scene.active + 1)} / {pad(total)}
          </span>
          <span>Tile / Surface / Space / Architecture</span>
        </div>
      </div>
    </section>
  );
}
