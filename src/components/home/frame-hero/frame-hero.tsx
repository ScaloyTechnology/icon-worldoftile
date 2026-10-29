"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { getImageProps } from "next/image";
import styles from "./frame-hero.module.css";

// Fixed, local artwork. This hero intentionally takes no CMS or database props.
export const FRAME_SOURCE = { directory: "/frames", prefix: "A.", extension: "png", digits: 5 };
export const TOTAL_FRAMES = 301;
export const SCROLL_LENGTH_VH = 700;
export const FRAME_LERP = 0.12;
const INITIAL_FRAME_COUNT = 8;
const STATIC_FRAME = 24;
const DARK_GAPS = [[96, 111], [176, 207], [249, 260]] as const;
export const CHAPTERS = [
  { start: 0, end: 17, label: "Surfaces of character", before: "Crafted from ", italic: "earth", after: "", body: "" },
  { start: 24, end: 60, label: "01 / Outdoor", before: "Stone that ", italic: "belongs", after: " to the garden", body: "Weathered finishes and natural tones, laid to live alongside grass, rain and sun." },
  { start: 76, end: 100, label: "02 / Threshold", before: "Steps that carry you ", italic: "inside", after: "", body: "Fine-grained stone finishes that move seamlessly from garden path to doorway." },
  { start: 140, end: 185, label: "03 / Living", before: "The warmth of ", italic: "timber", after: "", body: "Wood-look planks with the strength of tile, made for rooms that are lived in." },
  { start: 212, end: 238, label: "04 / Feature wall", before: "Texture you can ", italic: "feel", after: "", body: "Relief tiles that catch the light and turn a plain wall into the quiet centre of a room." },
  { start: 264, end: 290, label: "05 / Kitchen", before: "Every wall, an ", italic: "icon", after: "", body: "" },
] as const;

const frameUrl = (index: number, mobile = false) => {
  const original = `${FRAME_SOURCE.directory}/${FRAME_SOURCE.prefix}${String(index).padStart(FRAME_SOURCE.digits, "0")}.${FRAME_SOURCE.extension}`;
  // Existing Next image optimization serves/cache-compresses the fixed PNGs.
  // Pre-optimized WebP assets can still be selected with FRAME_SOURCE.extension.
  if (FRAME_SOURCE.extension !== "png") return original;
  return getImageProps({ src: original, alt: "", width: mobile ? 600 : 960, height: mobile ? 338 : 540, quality: 75 }).props.src;
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
type Frame = ImageBitmap | HTMLImageElement;
const releaseFrame = (frame: Frame) => { if ("close" in frame) frame.close(); else frame.src = ""; };

async function decodeFrame(blob: Blob, mobile: boolean, signal: AbortSignal): Promise<Frame> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob, { resizeWidth: mobile ? 1200 : 1920, resizeQuality: "high" });
    } catch {
      // Older canvas implementations can reject bitmap resize options.
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    const url = URL.createObjectURL(blob);
    const clean = () => {
      image.onload = image.onerror = null;
      signal.removeEventListener("abort", abort);
      URL.revokeObjectURL(url);
    };
    const abort = () => { clean(); image.src = ""; reject(new DOMException("Aborted", "AbortError")); };
    image.onload = () => { clean(); resolve(image); };
    image.onerror = () => { clean(); reject(new Error("Could not decode sequence frame")); };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort(); else image.src = url;
  });
}

export function FrameHero() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const cueRef = useRef<HTMLSpanElement>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [motionVersion, setMotionVersion] = useState(0);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: false });
    if (!root || !stage || !canvas) return;
    if (!context) {
      root.dataset.reduced = "true";
      root.dataset.frameLoadProgress = "100";
      root.dataset.frameLoadReady = "true";
      return;
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const reduced = media.matches;
    const mobile = window.innerWidth < 768;
    const step = mobile ? 2 : 1;
    const cacheLimit = mobile ? 24 : 32;
    const indices = reduced ? [STATIC_FRAME] : Array.from({ length: Math.ceil(TOTAL_FRAMES / step) }, (_, index) => index * step);
    const opening = reduced ? indices : indices.filter(index => index < INITIAL_FRAME_COUNT);
    const openingSet = new Set(opening);
    const completedOpening = new Set<number>();
    let loadedOpening = 0;
    const cached = new Map<number, Frame>();
    const failed = new Set<number>();
    const inFlight = new Map<number, AbortController>();
    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-frame-chapter]"));
    let queue = [...opening];
    let disposed = false;
    let ready = false;
    let visible = true;
    let raf = 0;
    let lastTime = 0;
    let target = reduced ? STATIC_FRAME : 0;
    let current = target;
    let drawn = -1;
    let requested = -1;
    let width = 1;
    let height = 1;
    let start = 0;
    let travel = 1;
    let dirty = true;
    delete root.dataset.painted;
    root.dataset.reduced = String(reduced);
    root.dataset.frameLoadProgress = "0";
    root.dataset.frameLoadReady = "false";
    root.dataset.frameLoadError = "false";
    setUnavailable(false);
    const reveal = () => {
      if (ready || disposed || drawn < 0 || loadedOpening !== opening.length) return;
      ready = true;
      root.dataset.frameLoadReady = "true";
      // Request only the nearby frame window, not the entire 756 MB sequence.
    };
    const schedule = () => {
      if (!disposed && (visible || !ready) && !document.hidden && !raf) raf = requestAnimationFrame(tick);
    };
    const quantize = (frame: number) => Math.min(TOTAL_FRAMES - 1, Math.max(0, Math.round(frame / step) * step));
    const evict = () => {
      while (cached.size > cacheLimit) {
        let victim = -1;
        let distance = -1;
        for (const index of cached.keys()) {
          if (index === drawn) continue;
          const nextDistance = Math.abs(index - current);
          if (nextDistance > distance) { distance = nextDistance; victim = index; }
        }
        if (victim < 0) break;
        releaseFrame(cached.get(victim)!); cached.delete(victim);
      }
    };
    const pump = () => {
      if (disposed || document.hidden || (ready && !visible)) return;
      while (inFlight.size < 4 && queue.length) {
        const index = queue.shift()!;
        if (cached.has(index) || inFlight.has(index) || failed.has(index)) continue;
        const controller = new AbortController();
        inFlight.set(index, controller);
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        void (async () => {
          try {
            let response = await fetch(frameUrl(index, mobile), { signal: controller.signal, cache: "force-cache", headers: { Accept: "image/webp" } });
            if (!response.ok && FRAME_SOURCE.extension === "png") {
              // An optimizer error must not hide an otherwise available original.
              const original = `${FRAME_SOURCE.directory}/${FRAME_SOURCE.prefix}${String(index).padStart(FRAME_SOURCE.digits, "0")}.png`;
              response = await fetch(original, { signal: controller.signal, cache: "force-cache" });
            }
            if (!response.ok) throw new Error(`Frame ${index}: ${response.status}`);
            const blob = await response.blob();
            if (disposed) return;
            const frame = await decodeFrame(blob, mobile, controller.signal);
            if (disposed || controller.signal.aborted) { releaseFrame(frame); return; }
            cached.set(index, frame); evict();
            if (cached.size === 1) setUnavailable(false);
            if (openingSet.has(index) && !completedOpening.has(index)) {
              completedOpening.add(index);
              loadedOpening += 1;
              root.dataset.frameLoadProgress = String(Math.round(loadedOpening / opening.length * 100));
            }
          } catch {
            if (!disposed && controller.signal.reason !== "seek") {
              failed.add(index);
              // Report failure separately; a failed request is not a ready frame.
              if (openingSet.has(index)) completedOpening.add(index);
            }
          } finally {
            clearTimeout(timeout); inFlight.delete(index);
            if (!disposed) {
              if (!ready && completedOpening.size === opening.length) {
                setUnavailable(cached.size === 0);
                root.dataset.frameLoadError = String(loadedOpening !== opening.length);
              }
              schedule(); pump();
            }
          }
        })();
      }
    };
    const requestWindow = (index: number) => {
      if (index === requested) return;
      requested = index;
      inFlight.forEach((controller, pendingIndex) => {
        if (Math.abs(pendingIndex - index) > (mobile ? 40 : 48)) controller.abort("seek");
      });
      const wanted: number[] = [];
      const direction = target >= current ? 1 : -1;
      for (let offset = 0; offset <= (mobile ? 8 : 12); offset += 1) {
        for (const sign of offset ? [direction, -direction] : [1]) {
          const next = index + offset * step * sign;
          if (next < 0 || next >= TOTAL_FRAMES || cached.has(next) || inFlight.has(next) || failed.has(next)) continue;
          wanted.push(next);
        }
      }
      const wantedSet = new Set(wanted);
      queue = [...wanted, ...queue.filter(value => !wantedSet.has(value) && Math.abs(value - index) <= (mobile ? 16 : 24))];
      pump();
    };
    const paint = (index: number) => {
      const frame = cached.get(index);
      if (!frame) return;
      const scale = Math.max(width / frame.width, height / frame.height);
      const w = frame.width * scale;
      const h = frame.height * scale;
      context.drawImage(frame, (width - w) / 2, (height - h) / 2, w, h);
      drawn = index; dirty = false;
      root.dataset.painted = "true";
      reveal();
    };
    const syncCopy = (frame: number) => {
      chapters.forEach((element, index) => {
        const chapter = CHAPTERS[index];
        if (!chapter) return;
        // Clip chapter windows before baked-in black frames, including fade-out.
        const gap = DARK_GAPS.find(([from, to]) => from <= chapter.end && to >= chapter.start);
        const end = gap ? Math.min(chapter.end, gap[0]) : chapter.end;
        const fade = Math.min(7, (end - chapter.start) / 3);
        const alpha = reduced ? (index === 0 ? 1 : 0) :
          smooth(index === 0 ? 1 : (frame - chapter.start) / fade) * smooth((end - frame) / fade);
        element.style.opacity = String(alpha);
        element.style.transform = `translate3d(0, ${(1 - alpha) * 24}px, 0)`;
        element.setAttribute("aria-hidden", String(alpha < 0.1));
      });
      if (progressRef.current) progressRef.current.style.transform = `scaleX(${reduced ? 0 : clamp(frame / (TOTAL_FRAMES - 1))})`;
      if (cueRef.current) cueRef.current.style.opacity = String(reduced ? 0 : 1 - smooth(frame / 9));
    };
    function tick(time: number) {
      raf = 0;
      const dt = lastTime ? Math.min(64, time - lastTime) : 16.67;
      lastTime = time;
      if (!reduced && ready) {
        const delta = target - current;
        current = Math.abs(delta) < 0.02 ? target : current + delta * (1 - Math.pow(1 - FRAME_LERP, dt / 16.67));
      }
      const desired = quantize(current);
      if (ready && !reduced) requestWindow(desired);
      let next = desired;
      if (!cached.has(next)) {
        // Retain the closest available image on fast seeks; never flash blank.
        let distance = Infinity;
        for (const index of cached.keys()) {
          if (Math.abs(index - desired) < distance) { distance = Math.abs(index - desired); next = index; }
        }
      }
      if (dirty || next !== drawn) paint(next);
      reveal();
      syncCopy(drawn < 0 || Math.abs(drawn - current) <= step ? current : drawn);
      if (!reduced && ready && Math.abs(target - current) > 0.02) schedule();
    }
    const onScroll = () => {
      target = reduced ? STATIC_FRAME : clamp((window.scrollY - start) / travel) * (TOTAL_FRAMES - 1);
      schedule();
    };
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      start = root.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, root.offsetHeight - height);
      dirty = true; onScroll();
    };
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else { lastTime = 0; schedule(); pump(); }
    };
    const onMotion = () => setMotionVersion(value => value + 1);
    const resize = new ResizeObserver(measure);
    resize.observe(stage); resize.observe(root);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      visible = entry.isIntersecting;
      if (visible) { lastTime = 0; schedule(); pump(); }
      else if (ready) { cancelAnimationFrame(raf); raf = 0; }
    });
    observer.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMotion);
    measure(); pump();
    return () => {
      disposed = true; cancelAnimationFrame(raf);
      inFlight.forEach(controller => controller.abort()); inFlight.clear();
      cached.forEach(releaseFrame); cached.clear(); queue = [];
      observer.disconnect(); resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMotion);
    };
  }, [motionVersion]);

  return <section ref={rootRef} className={styles.hero} style={{ "--sequence-height": `${SCROLL_LENGTH_VH}svh` } as CSSProperties} data-home-hero data-frame-hero data-home-header-tone="dark" aria-label="ICON architectural surface journey">
    <div ref={stageRef} className={styles.stage}>
      <img className={styles.poster} src={frameUrl(STATIC_FRAME)} alt="ICON stone surfaces in a garden" width={1920} height={1080} fetchPriority="high" />
      <canvas ref={canvasRef} className={styles.canvas} aria-label="A sequence exploring ICON surfaces from garden to kitchen" role="img" />
      <div className={styles.shade} aria-hidden="true" />
      <div className={styles.chapters}>
        {CHAPTERS.map((chapter, index) => <div key={chapter.label} className={`${styles.chapter} ${index === 0 ? styles.intro : ""}`} data-frame-chapter aria-hidden={index !== 0}>
          <p className={styles.eyebrow}>{chapter.label}</p>
          {index === 0 ? <h1>{chapter.before}<em>{chapter.italic}</em>{chapter.after}</h1> : <h2>{chapter.before}<em>{chapter.italic}</em>{chapter.after}</h2>}
          {chapter.body && <p className={styles.description}>{chapter.body}</p>}
        </div>)}
      </div>
      <span ref={cueRef} className={styles.cue} aria-hidden="true">Scroll<span /></span>
      <div className={styles.progress} aria-hidden="true"><span ref={progressRef} /></div>
      {unavailable && <p className={styles.notice} role="status">The surface sequence is temporarily unavailable.</p>}
    </div>
    <noscript><style>{`[data-home-hero]{height:100svh!important}`}</style></noscript>
  </section>;
}
