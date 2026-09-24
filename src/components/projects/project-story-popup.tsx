"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { Arrow } from "@/components/arrow";
import type { ProjectMedia, ProjectSummary } from "@/types/projects";
import styles from "./project-story-popup.module.css";

function uniqueMedia(project: ProjectSummary): readonly ProjectMedia[] {
  const candidates = project.galleryMedia?.length
    ? project.galleryMedia
    : [project.heroMedia, project.secondaryMedia].filter((media): media is ProjectMedia => Boolean(media));
  return candidates.filter((media, index) => candidates.findIndex((candidate) => candidate.src === media.src) === index);
}

export function ProjectStoryPopup({
  project,
  onClose,
  returnFocus,
}: Readonly<{
  project: ProjectSummary;
  onClose: () => void;
  returnFocus: HTMLButtonElement | null;
}>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const closeRef = useRef<HTMLButtonElement>(null);
  const images = useMemo(() => uniqueMedia(project), [project]);
  const active = images[activeIndex] ?? project.heroMedia;

  useEffect(() => {
    setActiveIndex(0);
  }, [project.id]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight" && images.length > 1) setActiveIndex((current) => (current + 1) % images.length);
      if (event.key === "ArrowLeft" && images.length > 1) setActiveIndex((current) => (current - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      returnFocus?.focus();
    };
  }, [images.length, onClose, returnFocus]);

  const move = (direction: -1 | 1) => setActiveIndex((current) => (current + direction + images.length) % images.length);

  return <div aria-labelledby="project-story-popup-title" aria-modal="true" className={styles.popup} role="dialog">
    <button aria-label="Close project story" className={styles.backdrop} onClick={onClose} type="button" />
    <div className={styles.panel}>
      <header className={styles.topbar}>
        <span>ICON / Project story</span>
        <span>{project.index} / {String(images.length).padStart(2, "0")} frames</span>
        <button onClick={onClose} ref={closeRef} type="button">Close <i aria-hidden="true" /></button>
      </header>

      <div className={styles.layout}>
        <aside className={styles.story}>
          <p>{project.category}{project.location ? ` / ${project.location}` : " / Location pending"}</p>
          <h2 id="project-story-popup-title">{project.title}</h2>
          <div className={styles.rule} aria-hidden="true"><span>{project.index}</span><i /></div>
          <p className={styles.description}>{project.shortDescription}</p>
          <small>Use the image index or arrow keys to explore the complete story.</small>
        </aside>

        <section className={styles.viewer} aria-label={`${project.title} image gallery`}>
          <figure className={styles.stage} key={active.src}>
            <Image alt={active.alt} fill priority quality={92} sizes="(max-width: 840px) 100vw, 68vw" src={active.src} style={{ objectFit: "contain", objectPosition: active.position ?? "50% 50%" }} />
            <figcaption><span>{active.alt}</span><small>{String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</small></figcaption>
          </figure>

          <div className={styles.controls}>
            <div className={styles.thumbnails} aria-label="Project gallery images">
              {images.map((image, index) => <button
                aria-label={`Show image ${index + 1}: ${image.alt}`}
                aria-pressed={activeIndex === index}
                className={activeIndex === index ? styles.active : undefined}
                key={image.src}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <Image alt="" fill sizes="88px" src={image.src} style={{ objectFit: "cover", objectPosition: image.position ?? "50% 50%" }} />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </button>)}
            </div>
            {images.length > 1 ? <nav aria-label="Project gallery controls">
              <button aria-label="Previous image" onClick={() => move(-1)} type="button"><Arrow /></button>
              <button aria-label="Next image" onClick={() => move(1)} type="button"><Arrow /></button>
            </nav> : null}
          </div>
        </section>
      </div>
    </div>
  </div>;
}
