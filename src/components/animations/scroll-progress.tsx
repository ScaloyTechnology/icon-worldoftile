"use client";

import { type KeyboardEvent, type PointerEvent, useCallback, useEffect, useRef, useState } from "react";

import styles from "./scroll-progress.module.css";

function pageMaximum() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
}

export function ScrollProgress() {
  const trackRef = useRef<HTMLButtonElement>(null);
  const frameRef = useRef(0);
  const draggingRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [available, setAvailable] = useState(false);

  const sync = useCallback(() => {
    frameRef.current = 0;
    const maximum = pageMaximum();
    setAvailable(maximum > 8);
    setProgress(maximum ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0);
  }, []);

  useEffect(() => {
    const schedule = () => {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(document.documentElement);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [sync]);

  const moveFromPointer = (clientY: number) => {
    const track = trackRef.current;
    if (!track) return;
    const bounds = track.getBoundingClientRect();
    const next = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height));
    window.scrollTo({ top: pageMaximum() * next, behavior: draggingRef.current ? "auto" : "smooth" });
  };

  const pointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveFromPointer(event.clientY);
  };

  const pointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (draggingRef.current) moveFromPointer(event.clientY);
  };

  const pointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    draggingRef.current = false;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const keyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const maximum = pageMaximum();
    const steps: Record<string, number> = {
      ArrowUp: -80,
      ArrowDown: 80,
      PageUp: -window.innerHeight * .82,
      PageDown: window.innerHeight * .82,
      Home: -maximum,
      End: maximum,
    };
    const amount = steps[event.key];
    if (amount === undefined) return;
    event.preventDefault();
    window.scrollTo({ top: Math.min(maximum, Math.max(0, window.scrollY + amount)), behavior: "smooth" });
  };

  return <aside aria-hidden={!available} className={styles.progress} data-visible={available}>
    <span className={styles.label}>Page index</span>
    <button
      aria-label="Page scroll position"
      aria-controls="main"
      aria-orientation="vertical"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(progress * 100)}
      aria-valuetext={`${Math.round(progress * 100)} percent through the page`}
      className={styles.track}
      onKeyDown={keyDown}
      onPointerCancel={pointerUp}
      onPointerDown={pointerDown}
      onPointerMove={pointerMove}
      onPointerUp={pointerUp}
      ref={trackRef}
      role="scrollbar"
      tabIndex={available ? 0 : -1}
      type="button"
    >
      <span aria-hidden="true" className={styles.fill} style={{ transform: `scaleY(${progress})` }} />
      <span aria-hidden="true" className={styles.marker} style={{ top: `${progress * 100}%` }} />
    </button>
    <output aria-live="off" className={styles.value}>{String(Math.round(progress * 100)).padStart(2, "0")}</output>
  </aside>;
}
