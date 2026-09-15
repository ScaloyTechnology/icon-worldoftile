"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { ProjectGalleryItem } from "@/types/projects";
import styles from "./project-lightbox.module.css";

type ProjectLightboxProps = Readonly<{
  activeIndex: number | null;
  items: readonly ProjectGalleryItem[];
  onChange: (index: number) => void;
  onClose: () => void;
  returnFocus?: HTMLElement | null;
}>;

export function ProjectLightbox({ activeIndex, items, onChange, onClose, returnFocus }: ProjectLightboxProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const activeIndexRef = useRef(activeIndex);
  const item = activeIndex === null ? null : items[activeIndex] ?? null;
  const open = Boolean(item);
  activeIndexRef.current = activeIndex;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus());
    document.body.style.overflow = "hidden";
    const previous = () => onChange(((activeIndexRef.current ?? 0) - 1 + items.length) % items.length);
    const next = () => onChange(((activeIndexRef.current ?? 0) + 1) % items.length);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") next();
      if (event.key === "ArrowLeft") previous();
      if (event.key === "Tab") {
        const controls = Array.from(panelRef.current?.querySelectorAll<HTMLElement>("button") ?? []);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [items.length, onChange, onClose, open, returnFocus]);

  if (!item || activeIndex === null) return null;
  const previous = () => onChange((activeIndex - 1 + items.length) % items.length);
  const next = () => onChange((activeIndex + 1) % items.length);

  return <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Project gallery viewer">
    <button className={styles.backdrop} aria-label="Close gallery" onClick={onClose} type="button" />
    <div
      className={styles.panel}
      ref={panelRef}
      onTouchStart={(event) => { touchStartX.current = event.changedTouches[0]?.clientX ?? null; }}
      onTouchEnd={(event) => {
        const end = event.changedTouches[0]?.clientX;
        if (touchStartX.current === null || end === undefined) return;
        const distance = end - touchStartX.current;
        if (Math.abs(distance) > 55) distance > 0 ? previous() : next();
        touchStartX.current = null;
      }}
    >
      <div className={styles.top}><p>{item.label}</p><button ref={closeRef} onClick={onClose} type="button">Close <span className={styles.closeMark} aria-hidden="true">×</span></button></div>
      <figure className={styles.figure}><Image alt={item.media.alt} fill quality={90} sizes="94vw" src={item.media.src} style={{ objectPosition: item.media.position ?? "50% 50%" }} /></figure>
      <div className={styles.controls}>
        <button onClick={previous} type="button">Previous</button>
        <span>{String(activeIndex + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}</span>
        <button onClick={next} type="button">Next</button>
      </div>
    </div>
  </div>;
}
