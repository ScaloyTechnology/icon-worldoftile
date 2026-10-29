"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { getImageProps } from "next/image";
import styles from "./frame-hero.module.css";

// Fixed, local artwork. This hero intentionally takes no CMS or database props.
export const FRAME_SOURCE = { directory: "/frames", prefix: "A.", extension: "webp", digits: 5 };
export const TOTAL_FRAMES = 301;
export const FRAME_LERP = 0.35;
const INITIAL_FRAME_COUNT = 8;
const STATIC_FRAME = 24;
const DARK_GAPS = [[96, 111], [176, 207], [249, 260]] as const;
// Dark transitions need only 15% of the normal scroll travel. Shorten the
// section by the same amount so the room scenes retain their original pace.
const DARK_SCROLL_WEIGHT = 0.15;
const WEIGHTED_FRAME_TRAVEL = TOTAL_FRAMES - 1
  - DARK_GAPS.reduce((total, [start, end]) => total + (end - start) * (1 - DARK_SCROLL_WEIGHT), 0);
export const SCROLL_LENGTH_VH = 100 + 600 * WEIGHTED_FRAME_TRAVEL / (TOTAL_FRAMES - 1);

function frameAtScrollProgress(progress: number) {
  let remaining = Math.max(0, Math.min(1, progress)) * WEIGHTED_FRAME_TRAVEL;
  let frame = 0;
  for (const [start, end] of DARK_GAPS) {
    const sceneTravel = start - frame;
    if (remaining <= sceneTravel) return frame + remaining;
    remaining -= sceneTravel;
    const transitionTravel = (end - start) * DARK_SCROLL_WEIGHT;
    if (remaining <= transitionTravel) return start + remaining / DARK_SCROLL_WEIGHT;
    remaining -= transitionTravel;
    frame = end;
  }
  return Math.min(TOTAL_FRAMES - 1, frame + remaining);
}
export const CHAPTERS = [
  { start: 0, end: 17, label: "Surfaces of character", before: "Crafted from ", italic: "earth", after: "", body: "" },
  { start: 24, end: 60, label: "01 / Outdoor", before: "Stone that ", italic: "belongs", after: " to the garden", body: "Weathered finishes and natural tones, laid to live alongside grass, rain and sun." },
  { start: 76, end: 100, label: "02 / Threshold", before: "Steps that carry you ", italic: "inside", after: "", body: "Fine-grained stone finishes that move seamlessly from garden path to doorway." },
  { start: 140, end: 185, label: "03 / Living", before: "The warmth of ", italic: "timber", after: "", body: "Wood-look planks with the strength of tile, made for rooms that are lived in." },
  { start: 212, end: 238, label: "04 / Feature wall", before: "Texture you can ", italic: "feel", after: "", body: "Relief tiles that catch the light and turn a plain wall into the quiet centre of a room." },
  { start: 264, end: 290, label: "05 / Kitchen", before: "Every wall, an ", italic: "icon", after: "", body: "" },
] as const;

const originalFrameUrl = (index: number, extension = FRAME_SOURCE.extension) =>
  `${FRAME_SOURCE.directory}/${FRAME_SOURCE.prefix}${String(index).padStart(FRAME_SOURCE.digits, "0")}.${extension}`;
const pngFrameUrl = (index: number) => {
  const original = originalFrameUrl(index, "png");
  // Compatibility with existing deployments that have only uploaded PNGs.
  return getImageProps({ src: original, alt: "", width: 1920, height: 1080, quality: 75 }).props.src;
};
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
type Frame = ImageBitmap | HTMLImageElement;
const releaseFrame = (frame: Frame) => { if ("close" in frame) frame.close(); else frame.src = ""; };

async function decodeFrame(blob: Blob, signal: AbortSignal): Promise<Frame> {
  if (typeof createImageBitmap === "function") {
    try {
      // Preserve the supplied resolution; a downsampled frame cannot regain
      // its detail when the canvas stretches it to fill a desktop or portrait screen.
      return await createImageBitmap(blob);
    } catch {
      // Fall back to an image element when bitmap decoding is unavailable.
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

  useEffect(() => {
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
    const step = 1;
    const cacheLimit = mobile ? 12 : 20;
    const decodedByteLimit = (mobile ? 64 : 144) * 1024 * 1024;
    let decodedBytes = 0;
    const decodeRadius = mobile ? 4 : 10;
    const blobLimit = (mobile ? 24 : 48) * 1024 * 1024;
    const blobs = new Map<number, Blob>();
    let blobBytes = 0;
    let preferWebp = FRAME_SOURCE.extension === "webp";
    const indices = reduced ? [STATIC_FRAME] : Array.from({ length: Math.ceil(TOTAL_FRAMES / step) }, (_, index) => index * step);
    const opening = reduced ? indices : indices.filter(index => index < INITIAL_FRAME_COUNT);
    const openingSet = new Set(opening);
    const completedOpening = new Set<number>();
    let loadedOpening = 0;
    const cached = new Map<number, Frame>();
    const failed = new Set<number>();
    const retries = new Map<number, number>();
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
    let requested = "";
    let copyFrame = -1;
    let direction = 1;
    let resizeFrame = 0;
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
    const shouldDecode = (index: number) => {
      if (!ready) return openingSet.has(index);
      const offset = (index - current) * direction;
      // Keep a small reverse buffer and spend most memory on upcoming frames.
      return (offset >= -2 && offset <= decodeRadius)
        || index === quantize(target);
    };
    const evict = () => {
      while (cached.size > cacheLimit || decodedBytes > decodedByteLimit) {
        let victim = -1;
        let distance = -1;
        for (const index of cached.keys()) {
          if (index === drawn || index === quantize(current) || index === quantize(target)
            || (!ready && openingSet.has(index))) continue;
          const nextDistance = Math.min(Math.abs(index - current), Math.abs(index - target))
            + ((index - current) * direction < -2 ? decodeRadius : 0);
          if (nextDistance > distance) { distance = nextDistance; victim = index; }
        }
        if (victim < 0) break;
        const frame = cached.get(victim)!;
        decodedBytes -= frame.width * frame.height * 4;
        releaseFrame(frame); cached.delete(victim);
      }
    };
    const rememberBlob = (index: number, blob: Blob) => {
      blobBytes -= blobs.get(index)?.size ?? 0;
      blobs.set(index, blob);
      blobBytes += blob.size;
      while (blobBytes > blobLimit && blobs.size > 1) {
        let victim = -1;
        let distance = -1;
        for (const key of blobs.keys()) {
          if (key === index) continue;
          const nextDistance = Math.abs(key - current);
          if (nextDistance > distance) { distance = nextDistance; victim = key; }
        }
        const old = blobs.get(victim);
        if (!old) break;
        blobBytes -= old.size;
        blobs.delete(victim);
      }
    };
    const fetchFrame = async (index: number, signal: AbortSignal) => {
      if (preferWebp) {
        const response = await fetch(originalFrameUrl(index), { signal, cache: "force-cache" });
        if (response.ok) return response.blob();
        if (response.status === 404) preferWebp = false;
      }
      let response = await fetch(pngFrameUrl(index), { signal, cache: "force-cache", headers: { Accept: "image/webp" } });
      if (!response.ok) response = await fetch(originalFrameUrl(index, "png"), { signal, cache: "force-cache" });
      if (!response.ok) throw new Error(`Frame ${index}: ${response.status}`);
      return response.blob();
    };
    const pump = () => {
      if (disposed || document.hidden || (ready && !visible)) return;
      while (inFlight.size < (mobile ? 3 : 4) && queue.length) {
        const index = queue.shift()!;
        if (cached.has(index) || inFlight.has(index) || failed.has(index)) continue;
        const controller = new AbortController();
        inFlight.set(index, controller);
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        void (async () => {
          try {
            const blob = blobs.get(index) ?? await fetchFrame(index, controller.signal);
            if (disposed) return;
            rememberBlob(index, blob);
            // Buffer compressed frames ahead; decode only the nearby window.
            // Reversing scroll reuses these bytes instead of requesting again.
            if (!shouldDecode(index)) return;
            const frame = await decodeFrame(blob, controller.signal);
            if (disposed || controller.signal.aborted) {
              releaseFrame(frame);
              if (!disposed) throw new DOMException("Aborted", "AbortError");
              return;
            }
            // A fast seek may have moved past this frame while it decoded.
            if (!shouldDecode(index)) { releaseFrame(frame); return; }
            cached.set(index, frame);
            decodedBytes += frame.width * frame.height * 4;
            evict();
            if (cached.size === 1) setUnavailable(false);
            if (openingSet.has(index) && !completedOpening.has(index)) {
              completedOpening.add(index);
              loadedOpening += 1;
              root.dataset.frameLoadProgress = String(Math.round(loadedOpening / opening.length * 100));
            }
          } catch {
            if (!disposed && controller.signal.reason !== "seek") {
              const attempt = retries.get(index) ?? 0;
              if (attempt < 1) {
                retries.set(index, attempt + 1);
                // Discard corrupt bytes before a single network retry.
                blobBytes -= blobs.get(index)?.size ?? 0;
                blobs.delete(index);
                queue.unshift(index);
              } else {
                failed.add(index);
                // Report failure separately; a failed request is not a ready frame.
                if (openingSet.has(index)) completedOpening.add(index);
              }
            }
          } finally {
            clearTimeout(timeout); inFlight.delete(index);
            if (!disposed) {
              requested = "";
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
      const destination = quantize(target);
      const key = `${index}:${destination}:${direction}`;
      if (key === requested) return;
      requested = key;
      inFlight.forEach((controller, pendingIndex) => {
        if (Math.abs(pendingIndex - index) > 60 && Math.abs(pendingIndex - destination) > 40) controller.abort("seek");
      });
      const wanted: number[] = [];
      const seen = new Set<number>();
      const add = (next: number) => {
        if (next < 0 || next >= TOTAL_FRAMES || seen.has(next) || cached.has(next) || inFlight.has(next) || failed.has(next)) return;
        if (blobs.has(next) && !shouldDecode(next)) return;
        seen.add(next);
        wanted.push(next);
      };
      // The next displayed frames have priority over distant speculative work.
      add(index);
      add(destination);
      add(index + direction * step);
      add(index - direction * step);
      for (let offset = 2; offset <= decodeRadius; offset += 1) {
        add(index + direction * offset);
      }
      add(index - direction * 2);
      // Fetch across the compressed dark gaps before the next room is needed.
      for (let offset = 1; offset <= (mobile ? 32 : 48); offset += 1) {
        add(destination + direction * offset);
      }
      queue = wanted;
      pump();
    };
    const drawImage = (image: Frame) => {
      const scale = Math.max(width / image.width, height / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    };
    const paint = (index: number) => {
      const image = cached.get(index);
      if (!image) return;
      drawImage(image);
      // Each source frame is already a complete animation image. Crossfading
      // moving edges produces ghosting, so draw one sharp frame per update.
      drawn = index; dirty = false;
      if (root.dataset.painted !== "true") root.dataset.painted = "true";
      reveal();
    };
    const chapterAlpha = chapters.map(() => -1);
    const syncCopy = (frame: number) => {
      if (Math.abs(frame - copyFrame) < .005) return;
      copyFrame = frame;
      chapters.forEach((element, index) => {
        const chapter = CHAPTERS[index];
        if (!chapter) return;
        // Clip chapter windows before baked-in black frames, including fade-out.
        const gap = DARK_GAPS.find(([from, to]) => from <= chapter.end && to >= chapter.start);
        const end = gap ? Math.min(chapter.end, gap[0]) : chapter.end;
        const fade = Math.min(7, (end - chapter.start) / 3);
        const alpha = reduced ? (index === 0 ? 1 : 0) :
          smooth(index === 0 ? 1 : (frame - chapter.start) / fade) * smooth((end - frame) / fade);
        if (Math.abs(alpha - (chapterAlpha[index] ?? -1)) > .002) {
          chapterAlpha[index] = alpha;
          element.style.opacity = String(alpha);
          element.style.transform = `translate3d(0, ${(1 - alpha) * 24}px, 0)`;
          element.setAttribute("aria-hidden", String(alpha < 0.1));
        }
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
        // Do not jump backwards when an older request arrives out of order.
        next = drawn;
        let distance = Infinity;
        for (const index of cached.keys()) {
          // Never display a prefetched future frame, then snap back when the
          // requested frame arrives. Hold the last usable frame instead.
          if (drawn >= 0 && ((direction > 0 && index > desired)
            || (direction < 0 && index < desired))) continue;
          if (drawn >= 0 && ((direction > 0 && index < drawn && target >= drawn)
            || (direction < 0 && index > drawn && target <= drawn))) continue;
          if (Math.abs(index - desired) < distance) { distance = Math.abs(index - desired); next = index; }
        }
      }
      if (dirty || next !== drawn) paint(next);
      reveal();
      syncCopy(drawn < 0 ? current : drawn);
      if (!reduced && ready && Math.abs(target - current) > 0.02) schedule();
    }
    const onScroll = () => {
      const next = reduced ? STATIC_FRAME : frameAtScrollProgress((window.scrollY - start) / travel);
      if (next !== target) direction = next > target ? 1 : -1;
      target = next;
      schedule();
    };
    const measure = () => {
      const rect = stage.getBoundingClientRect();
      width = Math.max(1, rect.width); height = Math.max(1, rect.height);
      // Match the supplied 1920 x 1080 artwork, accounting for cover cropping
      // on portrait screens, without allocating an unnecessary 4K canvas.
      const coverScale = Math.max(width / 1920, height / 1080);
      const scale = Math.min(window.devicePixelRatio || 1, 2, 1 / coverScale);
      const pixelWidth = Math.max(1, Math.round(width * scale));
      const pixelHeight = Math.max(1, Math.round(height * scale));
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth; canvas.height = pixelHeight;
      }
      context.setTransform(pixelWidth / width, 0, 0, pixelHeight / height, 0, 0);
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      start = root.getBoundingClientRect().top + window.scrollY;
      travel = Math.max(1, root.offsetHeight - height);
      dirty = true; onScroll();
    };
    const onVisibility = () => {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else { lastTime = 0; schedule(); pump(); }
    };
    const onMotion = () => setMotionVersion(value => value + 1);
    const queueMeasure = () => {
      if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; measure(); });
    };
    const resize = new ResizeObserver(queueMeasure);
    resize.observe(stage); resize.observe(root);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return;
      visible = entry.isIntersecting;
      if (visible) { lastTime = 0; schedule(); pump(); }
      else if (ready) { cancelAnimationFrame(raf); raf = 0; }
    });
    observer.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", queueMeasure, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMotion);
    measure(); pump();
    return () => {
      disposed = true; cancelAnimationFrame(raf); cancelAnimationFrame(resizeFrame);
      inFlight.forEach(controller => controller.abort()); inFlight.clear();
      cached.forEach(releaseFrame); cached.clear(); queue = [];
      blobs.clear();
      observer.disconnect(); resize.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", queueMeasure);
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMotion);
    };
  }, [motionVersion]);

  return <section ref={rootRef} className={styles.hero} style={{ "--sequence-height": `${SCROLL_LENGTH_VH}svh` } as CSSProperties} data-home-hero data-frame-hero data-home-header-tone="dark" aria-label="ICON architectural surface journey">
    <div ref={stageRef} className={styles.stage}>
      <img className={styles.poster} src={originalFrameUrl(STATIC_FRAME)} alt="ICON stone surfaces in a garden" width={1920} height={1080} decoding="async" fetchPriority="low" onError={event => {
        const image = event.currentTarget;
        if (image.dataset.pngFallback) return;
        image.dataset.pngFallback = "true";
        image.src = pngFrameUrl(STATIC_FRAME);
      }} />
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
