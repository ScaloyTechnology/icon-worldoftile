"use client";

import Image from "next/image";
import { type PointerEvent as ReactPointerEvent, useEffect, useRef } from "react";

import { Arrow } from "@/components/arrow";
import { loadGsap } from "@/animations/load-gsap";
import type { HomepageHeroScene } from "@/types/homepage-content";

import styles from "./architectural-hero.module.css";

// Optimized copies of the client's individual tile faces in photos/200X1200*/JPG.
// Keep the supplied material names, rather than using architectural scene crops.
const textures = [
  ["fenix-haya", "Fenix Haya"],
  ["fenix-cherry", "Fenix Cherry"],
  ["antique-oak", "Antique Oak"],
  ["aspen-choco", "Aspen Choco"],
  ["aspen-honey", "Aspen Honey"],
  ["classic-black", "Classic Black"],
  ["12004", "12004"],
  ["oak-wood-nero", "Oak Wood Nero"],
  ["nordic-brown", "Nordic Brown"],
  ["6602", "6602"],
  ["classic-miele", "Classic Miele"],
  ["nordic-maple", "Nordic Maple"],
] as const;

export function ArchitecturalHero({ scenes }: { scenes: readonly HomepageHeroScene[] }) {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const pointerFrame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const story = scenes[0];

  useEffect(() => {
    const element = root.current;
    const wall = grid.current;
    if (!element || !wall) return;

    let disposed = false;
    let cleanupAnimation: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const detach: Array<() => void> = [];
    const tiles = Array.from(wall.querySelectorAll<HTMLElement>("[data-floating-tile]"));

    // Decode before revealing. A slow/failed request cannot hold the hero hostage;
    // late images still fade in through their own loaded-state opacity.
    const imageReady = (image: HTMLImageElement) => new Promise<void>((resolve) => {
      let complete = false;
      const finish = () => {
        if (complete) return;
        complete = true;
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        const decoded = image.naturalWidth && image.decode
          ? image.decode().catch(() => undefined)
          : Promise.resolve();
        void decoded.then(() => {
          if (!disposed && image.naturalWidth) image.parentElement?.setAttribute("data-loaded", "true");
          resolve();
        });
      };
      if (image.complete) finish();
      else {
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        detach.push(() => {
          image.removeEventListener("load", finish);
          image.removeEventListener("error", finish);
          resolve();
        });
      }
    });

    const imagesReady = Promise.all(Array.from(wall.querySelectorAll("img")).map(imageReady));
    const deadline = new Promise<void>((resolve) => { timeout = setTimeout(resolve, 4000); });

    void Promise.all([loadGsap(), Promise.race([imagesReady, deadline])]).then(([{ gsap }]) => {
      if (disposed) return;
      if (timeout) clearTimeout(timeout);
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add({
          reduced: "(prefers-reduced-motion: reduce)",
          mobile: "(max-width: 760px)",
          desktop: "(min-width: 761px)",
        }, (media) => {
          const reduced = Boolean(media.conditions?.reduced);
          const mobile = Boolean(media.conditions?.mobile);
          element.dataset.phase = "assembling";
          wall.style.setProperty("--wall-x", "0px");
          wall.style.setProperty("--wall-y", "0px");
          const width = wall.clientWidth;
          const height = wall.clientHeight;
          const visible = tiles.filter((tile) => tile.offsetWidth > 0);
          const poses = visible.map((tile, index) => {
            const x = tile.offsetLeft + tile.offsetWidth / 2 - width / 2;
            const row = Math.floor(index / (mobile ? 2 : 3));
            // Left/right columns enter from their respective side; centre tiles
            // alternate sides by row. No orbit or rotation around the wall.
            const side = Math.abs(x) < 2 ? (row % 2 ? 1 : -1) : Math.sign(x);
            return { tile, side, row };
          });

          const settle = () => {
            tiles.forEach((tile) => {
              tile.style.transform = "none";
              tile.style.opacity = "1";
              tile.style.willChange = "auto";
            });
            element.dataset.phase = "settled";
          };
          const timeline = gsap.timeline({ onComplete: settle });

          if (reduced) {
            gsap.set(visible, { opacity: 0, clearProps: "transform" });
            timeline.to(visible, { opacity: 1, duration: .5, ease: "sine.out" });
          } else {
            poses.forEach(({ tile, side, row }, order) => {
              const travel = Math.min(width, 1100) * (mobile ? .4 : .6) + (order % 3) * 18;
              const lift = (row % 2 ? -1 : 1) * (mobile ? 10 : 20);
              const progress = { value: 0 };
              const paint = () => {
                const remaining = 1 - progress.value;
                const dx = side * travel * remaining;
                const dy = lift * remaining - Math.sin(progress.value * Math.PI) * (mobile ? 5 : 12);
                tile.style.transform = `translate3d(${dx.toFixed(3)}px,${dy.toFixed(3)}px,0) scale(${1 - .035 * remaining})`;
              };
              tile.style.willChange = "transform, opacity";
              gsap.set(tile, { opacity: 0 });
              paint();
              const start = row * .14 + (order % (mobile ? 2 : 3)) * .085;
              timeline.to(progress, {
                value: 1,
                duration: (mobile ? 2.8 : 3.8) + (order % 3) * .12,
                // A long deceleration tail lets tiles drift into place without
                // the pronounced midpoint acceleration of the old spiral.
                ease: "power3.out",
                onUpdate: paint,
              }, start);
              timeline.to(tile, {
                opacity: 1, duration: mobile ? 1.8 : 2.4, ease: "sine.out",
              }, start);
            });
          }

          // Orientation/viewport changes invalidate measured destinations.
          // Settle into the responsive CSS grid instead of replaying stale offsets.
          const resize = new ResizeObserver(() => {
            if (Math.abs(wall.clientWidth - width) > 1 || Math.abs(wall.clientHeight - height) > 1) {
              timeline.kill();
              settle();
            }
          });
          resize.observe(wall);
          return () => {
            resize.disconnect();
            timeline.kill();
          };
        });
      }, element);
      cleanupAnimation = () => { match.revert(); context.revert(); };
    }).catch(() => {
      if (!disposed) {
        element.dataset.phase = "settled";
        element.dataset.static = "true";
      }
    });

    return () => {
      disposed = true;
      if (timeout) clearTimeout(timeout);
      detach.forEach((remove) => remove());
      cleanupAnimation?.();
      if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
      pointerFrame.current = 0;
    };
  }, []);

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
    // Geometry only changes on layout/size changes, not on each scroll frame.
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
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
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

  const moveDepth = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || root.current?.dataset.phase !== "settled"
      || window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 760px)").matches) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    if (pointerFrame.current) return;
    pointerFrame.current = requestAnimationFrame(() => {
      pointerFrame.current = 0;
      const element = root.current;
      if (!element || !grid.current) return;
      const bounds = element.getBoundingClientRect();
      const x = (pointer.current.x - bounds.left) / bounds.width - .5;
      const y = (pointer.current.y - bounds.top) / bounds.height - .5;
      grid.current.style.setProperty("--wall-x", `${(x * 8).toFixed(2)}px`);
      grid.current.style.setProperty("--wall-y", `${(y * 5).toFixed(2)}px`);
    });
  };

  return (
    <section
      aria-labelledby="architectural-hero-title"
      className={styles.hero}
      data-home-header-tone="dark"
      data-home-header-treatment="transparent"
      onPointerLeave={() => {
        if (pointerFrame.current) cancelAnimationFrame(pointerFrame.current);
        pointerFrame.current = 0;
        grid.current?.style.setProperty("--wall-x", "0px");
        grid.current?.style.setProperty("--wall-y", "0px");
      }}
      onPointerMove={moveDepth}
      ref={root}
    >
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{story?.eyebrow ?? "ICON / Material in motion"}</p>
        <h1 id="architectural-hero-title">
          <span>{story?.title ?? "Crafting concepts"}</span>
          <i>{story?.emphasis ?? "shaped by nature."}</i>
        </h1>
        <p className={styles.supporting}>{story?.supportingText ?? "Where imagination begins. Refined by design."}</p>
      </div>

      <div className={styles.stage} data-hero-scroll-stage>
        <div
          aria-label="An aligned wall of natural wood-grain ceramic tile textures"
          className={styles.grid}
          ref={grid}
          role="img"
        >
          {textures.map(([slug, name], index) => (
            <div aria-hidden="true" className={styles.tile} data-floating-tile key={slug}>
              <Image
                alt=""
                fill
                loading={index < 3 ? undefined : "eager"}
                onLoad={(event) => { event.currentTarget.parentElement?.setAttribute("data-loaded", "true"); }}
                preload={index < 3}
                sizes="(max-width: 760px) 46vw, 28vw"
                src={`/assets/home/spiral-tiles/${slug}.webp`}
                title={name}
                unoptimized
              />
            </div>
          ))}
        </div>
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
      <noscript><style>{`.${styles.tile}, .${styles.tile} img { opacity: 1 !important; transform: none !important; }`}</style></noscript>
    </section>
  );
}
