"use client";

import Image from "next/image";
import Link from "next/link";
import { type CSSProperties, type KeyboardEvent, type MouseEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { Arrow } from "@/components/arrow";
import type { HomepageCollectionPreview } from "@/types/homepage-content";
import styles from "./product-showcase-hero.module.css";

const pad = (value: number) => String(value).padStart(2, "0");

export function ProductShowcaseHero({ collections }: { collections: readonly HomepageCollectionPreview[] }) {
  const root = useRef<HTMLElement>(null);
  const desk = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLAnchorElement | null>>([]);
  const activeRef = useRef(0);
  const drag = useRef<{ x: number; y: number; pointerId: number; position: number; lastX: number; time: number; velocity: number } | null>(null);
  const position = useRef(0);
  const targetPosition = useRef(0);
  const animateTo = useRef<(target: number) => void>(() => {});
  const frame = useRef(0);
  const scrollFrame = useRef(0);
  const cursor = useRef<HTMLSpanElement>(null);
  const cursorFrame = useRef(0);
  const pointer = useRef({ x: 0, y: 0 });
  const clickBlocked = useRef(false);
  const [active, setActive] = useState(0);
  const total = collections.length;
  const selected = collections[active] ?? collections[0];

  useEffect(() => {
    const lastIndex = Math.max(0, total - 1);
    cards.current.length = total;
    if (activeRef.current > lastIndex) {
      activeRef.current = lastIndex;
      targetPosition.current = lastIndex;
      position.current = lastIndex;
      setActive(lastIndex);
    }
  }, [total]);

  const select = useCallback((index: number) => {
    const target = Math.max(0, Math.min(total - 1, index));
    activeRef.current = target;
    setActive(target);
    animateTo.current(target);
    if (window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)").matches) {
      const track = desk.current;
      const card = cards.current[target];
      if (track && card) track.scrollTo({
        left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2,
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      });
    }
  }, [total]);

  useEffect(() => {
    const nativeLayout = window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)");
    let previousTime = 0;
    const paint = () => {
      cards.current.forEach((card, index) => {
        if (!card) return;
        const offset = index - position.current;
        const distance = Math.abs(offset);
        card.style.setProperty("--offset", String(offset));
        card.style.setProperty("--scale", String(Math.max(.72, 1 - distance * .08)));
        card.style.setProperty("--rotation", `${-offset * 4}deg`);
        card.style.setProperty("--brightness", String(Math.max(.38, 1 - distance * .22)));
        card.style.setProperty("--visibility", String(Math.max(0, Math.min(1, 3 - distance))));
        card.style.zIndex = String(Math.round(100 - distance * 10));
        card.style.pointerEvents = distance >= 3 ? "none" : "";
      });
    };
    const tick = (time: number) => {
      const elapsed = previousTime ? Math.min(40, time - previousTime) : 16;
      previousTime = time;
      const delta = targetPosition.current - position.current;
      position.current += delta * (1 - Math.exp(-elapsed / (drag.current ? 55 : 115)));
      if (Math.abs(delta) < .001) position.current = targetPosition.current;
      paint();
      frame.current = Math.abs(delta) < .001 ? 0 : requestAnimationFrame(tick);
    };
    animateTo.current = (target) => {
      targetPosition.current = target;
      if (nativeLayout.matches) return;
      if (!frame.current) { previousTime = 0; frame.current = requestAnimationFrame(tick); }
    };
    const reset = () => {
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      position.current = activeRef.current;
      targetPosition.current = activeRef.current;
      paint();
    };
    reset();
    nativeLayout.addEventListener("change", reset);
    return () => {
      nativeLayout.removeEventListener("change", reset);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
      animateTo.current = () => {};
    };
  }, [total]);

  useEffect(() => {
    const nativeLayout = window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)");
    const align = () => {
      const track = desk.current;
      const card = cards.current[activeRef.current];
      if (nativeLayout.matches && track && card) {
        track.scrollTo({ left: card.offsetLeft - (track.clientWidth - card.offsetWidth) / 2, behavior: "instant" });
      }
    };
    nativeLayout.addEventListener("change", align);
    return () => nativeLayout.removeEventListener("change", align);
  }, []);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadGsap().then(({ gsap }) => {
      if (disposed || !root.current) return;
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(prefers-reduced-motion: no-preference)", () => {
          // Composited curtain transitions keep the shift into the dark gallery
          // soft without animating clipping masks or changing section heights.
          gsap.fromTo("[data-desk-entry]", { scaleY: 0, transformOrigin: "center bottom" }, {
            scaleY: 1, ease: "none",
            scrollTrigger: { trigger: "[data-desk-entry]", start: "top 82%", end: "bottom 58%", scrub: 1.65 },
          });
          gsap.from("[data-desk-intro] > *", {
            opacity: 0, y: 24, duration: 1.25, stagger: .14,
            ease: "power3.out", clearProps: "opacity,transform",
            scrollTrigger: { trigger: "[data-desk-intro]", start: "top 72%", once: true },
          });
          gsap.fromTo("[data-desk-exit]", { scaleY: 1, transformOrigin: "center top" }, {
            scaleY: 0, ease: "none",
            scrollTrigger: { trigger: "[data-desk-exit]", start: "top 82%", end: "bottom 55%", scrub: 1.65 },
          });
          gsap.to("[data-desk-samples]", {
            y: 18, scale: .985, ease: "none",
            scrollTrigger: { trigger: "[data-desk-exit]", start: "top bottom", end: "bottom 65%", scrub: 1.4 },
          });
        });
      }, root);
      cleanup = () => { match.revert(); context.revert(); };
    }).catch(() => { /* Native navigation remains available without motion. */ });
    return () => { disposed = true; cleanup?.(); };
  }, []);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
    if (scrollFrame.current) cancelAnimationFrame(scrollFrame.current);
    if (cursorFrame.current) cancelAnimationFrame(cursorFrame.current);
  }, []);

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    clickBlocked.current = false;
    if (event.button !== 0 || !window.matchMedia("(min-width: 761px) and (pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    drag.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId, position: position.current, lastX: event.clientX, time: performance.now(), velocity: 0 };
  };
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      pointer.current = { x: event.clientX, y: event.clientY };
      if (!cursorFrame.current) cursorFrame.current = requestAnimationFrame(() => {
        cursorFrame.current = 0;
        const track = desk.current;
        if (!track || !cursor.current) return;
        const { x, y } = pointer.current;
        const bounds = track.getBoundingClientRect();
        const hit = document.elementFromPoint(x, y)?.closest("[data-collection-card]");
        // Finish geometry/hit-test reads before changing composited styles.
        cursor.current.style.transform = `translate3d(${x - bounds.left - 47}px,${y - bounds.top - 47}px,0)`;
        track.toggleAttribute("data-card-hover", Boolean(hit && track.contains(hit)));
      });
    }
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const delta = event.clientX - start.x;
    if (Math.abs(delta) < 8 && !clickBlocked.current) return;
    clickBlocked.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    root.current?.setAttribute("data-dragging", "true");
    const now = performance.now();
    start.velocity = (event.clientX - start.lastX) / Math.max(1, now - start.time);
    start.lastX = event.clientX;
    start.time = now;
    const step = Math.min(event.currentTarget.clientWidth * .18, 240);
    const desired = start.position - delta / step;
    const resisted = desired < 0 ? desired * .18 : desired > total - 1 ? total - 1 + (desired - total + 1) * .18 : desired;
    animateTo.current(resisted);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>, cancelled = false) => {
    const start = drag.current;
    drag.current = null;
    root.current?.removeAttribute("data-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    if (!start || start.pointerId !== event.pointerId) return;
    if (cancelled) { animateTo.current(activeRef.current); return; }
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) > 12 && Math.abs(x) > Math.abs(y)) {
      const step = Math.min(event.currentTarget.clientWidth * .18, 240);
      const velocity = performance.now() - start.time < 100 ? start.velocity : 0;
      select(Math.round(start.position - x / step - velocity * 100 / step));
    } else animateTo.current(activeRef.current);
  };
  const clickCard = (event: MouseEvent<HTMLAnchorElement>, index: number) => {
    if (clickBlocked.current && event.detail !== 0) { event.preventDefault(); clickBlocked.current = false; return; }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (index !== activeRef.current) { event.preventDefault(); select(index); }
  };
  const scrollDesk = () => {
    if (scrollFrame.current || !window.matchMedia("(max-width: 760px), (prefers-reduced-motion: reduce)").matches) return;
    scrollFrame.current = requestAnimationFrame(() => {
      scrollFrame.current = 0;
      const track = desk.current;
      if (!track) return;
      const center = track.scrollLeft + track.clientWidth / 2;
      let nearest = 0;
      let distance = Infinity;
      cards.current.forEach((card, index) => {
        if (!card) return;
        const delta = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center);
        if (delta < distance) { nearest = index; distance = delta; }
      });
      if (nearest !== activeRef.current) { activeRef.current = nearest; setActive(nearest); }
    });
  };
  const keyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    select(event.key === "Home" ? 0 : event.key === "End" ? total - 1 : activeRef.current + (event.key === "ArrowRight" ? 1 : -1));
  };

  if (!selected) return null;
  return <section aria-labelledby="collections-showcase-heading" className={styles.showcase} data-home-header-tone="dark" id="collections" onKeyDown={keyDown} ref={root}>
    <div aria-hidden="true" className={styles.entry}><div data-desk-entry /></div>
    <div className={styles.stage}>
      <header className={styles.intro} data-desk-intro>
        <div><p className={styles.chapter}>Collections</p><h2 id="collections-showcase-heading">Materials <i>with<br />character.</i></h2></div>
        <div className={styles.guidance}><p>{total === 1 ? "Explore this material collection and open the product library filtered to it." : `Explore ${total} material collections. Choose one to open the product library filtered to that collection.`}</p><Link href="/products">View all products <Arrow /></Link></div>
      </header>
      <div data-desk-samples>
        <div aria-label="Collection sample desk. Drag, swipe, or use left and right arrow keys." aria-roledescription="carousel" className={styles.desk} onDragStart={(event) => event.preventDefault()} onPointerCancel={(event) => endDrag(event, true)} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerLeave={(event) => { event.currentTarget.removeAttribute("data-card-hover"); if (cursorFrame.current) cancelAnimationFrame(cursorFrame.current); cursorFrame.current = 0; }} onPointerUp={(event) => endDrag(event)} onScroll={scrollDesk} ref={desk} tabIndex={0}>
          <span aria-hidden="true" className={styles.dragCursor} ref={cursor}>Drag</span>
          <div className={styles.samples}>
            {collections.map((collection, index) => {
              // Initial SSR pose only; the animation loop owns these variables thereafter.
              const offset = index;
              const distance = Math.abs(offset);
              return <Link data-collection-card aria-label={index === active ? `Explore ${collection.name}` : `Select ${collection.name}`} aria-current={index === active ? "true" : undefined} className={`${styles.card} ${index === active ? styles.active : ""}`} href={collection.href} key={collection.id} onClick={(event) => clickCard(event, index)} onFocus={(event) => { if (!drag.current && event.currentTarget.matches(":focus-visible")) select(index); }} ref={(node) => { cards.current[index] = node; }} style={{ "--offset": offset, "--scale": Math.max(.72, 1 - distance * .08), "--rotation": `${-offset * 4}deg`, "--brightness": Math.max(.38, 1 - distance * .22), "--visibility": Math.max(0, Math.min(1, 3 - distance)), zIndex: 100 - distance * 10 } as CSSProperties}>
                <span className={styles.image}>{collection.image.src ? <Image alt={collection.image.alt} fill loading="lazy" quality={90} sizes="(max-width: 760px) 72vw, (max-width: 1200px) 34vw, 28vw" src={collection.image.src} style={{ objectFit: "cover", objectPosition: collection.image.position }} unoptimized={!collection.image.src.startsWith("/")} /> : null}</span>
                <span className={styles.caption}><strong>{collection.name}</strong></span>
              </Link>;
            })}
          </div>
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.identity} aria-live="polite"><small>{pad(active + 1)} / {pad(total)}</small><strong>{selected.name}</strong><p>{selected.description || selected.image.alt}</p></div>
        <Link className={styles.explore} href={selected.href} aria-label={`Explore material: ${selected.name}`}>Explore material<Arrow diagonal /></Link>
        <div className={styles.controls}><button aria-label="Previous collection" disabled={active === 0} onClick={() => select(active - 1)} type="button"><Arrow /></button><button aria-label="Next collection" disabled={active === total - 1} onClick={() => select(active + 1)} type="button"><Arrow /></button></div>
      </footer>
    </div>
    <div aria-hidden="true" className={styles.exit}><div data-desk-exit /></div>
  </section>;
}
