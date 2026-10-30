"use client";

import { useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import styles from "./frame-hero.module.css";

// Fixed, local artwork. This hero intentionally takes no CMS or database props.
export const FRAME_SOURCE = { directory: "/frames", prefix: "A.", extension: "webp", digits: 5 };
export const TOTAL_FRAMES = 301;
export const FRAME_LERP = 0.22;
const STATIC_FRAME = 24;
// Play the complete supplied animation, including shadows and the closing fade.
// Timing controls the dark passages; no source frames are trimmed from playback.
const LAST_PLAYBACK_FRAME = TOTAL_FRAMES - 1;
// Scroll distance per source frame. Keep the opening unchanged, spend more
// time in the illuminated rooms, and pass through shadowed transitions quickly.
// Smoothly varying weights avoid a sudden speed change at chapter boundaries.
const SCROLL_PACE = [
  [0, 1], [70, 1],
  // Threshold: ease into the close-up and linger before its shadow transition.
  [82, 1.65], [100, 1.8], [106, .9], [111, .4], [125, .4],
  // Living: slow through the reveal, the fully lit floor and its departure.
  [134, 1.5], [144, 1.9], [174, 1.9], [184, 1.7],
  [192, .65], [200, .45], [209, .45],
  // Feature wall: retain reading time as the lamp and relief come into view.
  [218, 1.9], [238, 1.9], [244, 1.2], [250, .35], [260, .35],
  // Keep the kitchen's pace and include its complete, brief fade to black.
  [267, 1.85], [284, 1.85], [294, 1.35], [LAST_PLAYBACK_FRAME, .45],
] as const;
const FRAME_TRAVEL = [0];
for (let frame = 1; frame <= LAST_PLAYBACK_FRAME; frame += 1) {
  const sample = frame - .5;
  for (let segment = 1; segment < SCROLL_PACE.length; segment += 1) {
    const [from, fromWeight] = SCROLL_PACE[segment - 1]!;
    const [to, toWeight] = SCROLL_PACE[segment]!;
    if (sample > to) continue;
    const t = (sample - from) / (to - from);
    // Zero slope and curvature at each pace anchor: acceleration eases in and
    // out of shadows instead of feeling like a cut to the following room.
    const eased = t * t * t * (t * (t * 6 - 15) + 10);
    FRAME_TRAVEL.push(FRAME_TRAVEL[frame - 1]! + fromWeight + (toWeight - fromWeight) * eased);
    break;
  }
}
const WEIGHTED_FRAME_TRAVEL = FRAME_TRAVEL[LAST_PLAYBACK_FRAME]!;
export const SCROLL_LENGTH_VH = 100 + 600 * WEIGHTED_FRAME_TRAVEL / (TOTAL_FRAMES - 1);

function frameAtScrollProgress(progress: number) {
  const travel = Math.max(0, Math.min(1, progress)) * WEIGHTED_FRAME_TRAVEL;
  let low = 0;
  let high = LAST_PLAYBACK_FRAME;
  while (high - low > 1) {
    const middle = (low + high) >>> 1;
    if (FRAME_TRAVEL[middle]! <= travel) low = middle;
    else high = middle;
  }
  return low + (travel - FRAME_TRAVEL[low]!) / (FRAME_TRAVEL[high]! - FRAME_TRAVEL[low]!);
}
export const CHAPTERS = [
  { start: 0, fadeInEnd: 0, fadeOutStart: 17 - 17 / 3, end: 17, label: "Surfaces of character", before: "Crafted from ", italic: "earth", after: "", body: "" },
  { start: 24, fadeInEnd: 31, fadeOutStart: 53, end: 60, label: "Outdoor", before: "Stone that ", italic: "belongs", after: " to the garden", body: "Weathered finishes and natural tones, laid to live alongside grass, rain and sun." },
  { start: 76, fadeInEnd: 82, fadeOutStart: 103, end: 110, label: "Threshold", before: "Steps that carry you ", italic: "inside", after: "", body: "Fine-grained stone finishes that move seamlessly from garden path to doorway." },
  { start: 132, fadeInEnd: 142, fadeOutStart: 190, end: 200, label: "Living", before: "The warmth of ", italic: "timber", after: "", body: "Wood-look planks with the strength of tile, made for rooms that are lived in." },
  { start: 210, fadeInEnd: 218, fadeOutStart: 242, end: 250, label: "Feature wall", before: "Texture you can ", italic: "feel", after: "", body: "Relief tiles that catch the light and turn a plain wall into the quiet centre of a room." },
  // Hold the kitchen caption through the lit scene, then leave with its fade.
  { start: 261, fadeInEnd: 268, fadeOutStart: 294, end: LAST_PLAYBACK_FRAME, label: "Kitchen", before: "Every wall, an ", italic: "icon", after: "", body: "" },
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

// Keep natural word wrapping and the original copy; only the word's inner
// layer moves, so revealing a heading never shifts the surrounding layout.
function headlineWords(text: string) {
  return text.split(/(\s+)/).map((word, index) => /^\s+$/.test(word) ? word :
    word ? <span className={styles.wordMask} key={index}><span className={styles.word} data-copy-word>{word}</span></span> : null);
}

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
    // Keep timing-derived styles out of the hydrated HTML. Fast Refresh or
    // cached server markup can otherwise compare different sequence versions.
    // Apply the current height before measuring scroll travel or loader readiness.
    root.style.setProperty("--sequence-height", `${SCROLL_LENGTH_VH.toFixed(2)}svh`);
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
    const decodeRadius = mobile ? 2 : 6;
    // Keep every compressed frame for this visit. Only decoded pixel buffers
    // are evicted: scrolling must not start another frame download.
    const blobs = new Map<number, Blob>();
    let preferWebp = FRAME_SOURCE.extension === "webp";
    const indices = reduced ? [STATIC_FRAME] : Array.from({ length: LAST_PLAYBACK_FRAME + 1 }, (_, index) => index);
    const validated = new Set<number>();
    const cached = new Map<number, Frame>();
    const failed = new Set<number>();
    const retries = new Map<number, number>();
    const inFlight = new Map<number, AbortController>();
    const chapters = Array.from(root.querySelectorAll<HTMLElement>("[data-frame-chapter]"));
    const chapterWords = chapters.map(element => Array.from(element.querySelectorAll<HTMLElement>("[data-copy-word]")));
    let queue = [...indices];
    let disposed = false;
    let ready = false;
    let visible = true;
    let raf = 0;
    let lastTime = 0;
    let target = reduced ? STATIC_FRAME : 0;
    let current = target;
    let targetProgress = 0;
    let currentProgress = 0;
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
      if (ready || disposed || validated.size !== indices.length || drawn !== quantize(target)) return;
      ready = true;
      root.dataset.frameLoadReady = "true";
    };
    const schedule = () => {
      if (!disposed && (visible || !ready) && !document.hidden && !raf) raf = requestAnimationFrame(tick);
    };
    const quantize = (frame: number) => Math.min(LAST_PLAYBACK_FRAME, Math.max(0, Math.round(frame / step) * step));
    const shouldDecode = (index: number) => {
      const center = quantize(current);
      const ahead = (index - center) * direction;
      // Keep both sides decoded so reversing input does not empty the window.
      return Math.abs(index - center) <= decodeRadius
        || (ahead > 0 && ahead <= decodeRadius + 1)
        || index === quantize(target);
    };
    const evict = () => {
      while (cached.size > cacheLimit || decodedBytes > decodedByteLimit) {
        let victim = -1;
        let distance = -1;
        for (const index of cached.keys()) {
          if (index === drawn || index === quantize(current) || index === quantize(target)) continue;
          const nextDistance = Math.abs(index - current);
          if (nextDistance > distance) { distance = nextDistance; victim = index; }
        }
        if (victim < 0) break;
        const frame = cached.get(victim)!;
        decodedBytes -= frame.width * frame.height * 4;
        releaseFrame(frame); cached.delete(victim);
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
            blobs.set(index, blob);
            // Decode every frame once before reveal, so a successful HTTP
            // response containing a broken image cannot pass the loader.
            if (validated.has(index) && !shouldDecode(index)) return;
            const frame = await decodeFrame(blob, controller.signal);
            if (disposed || controller.signal.aborted) {
              releaseFrame(frame);
              if (!disposed) throw new DOMException("Aborted", "AbortError");
              return;
            }
            if (!validated.has(index)) {
              validated.add(index);
              root.dataset.frameLoadProgress = String(Math.floor(validated.size / indices.length * 100));
            }
            // Keep only the playback window as decoded pixels. All compressed
            // frames remain available locally, including on reverse scrolling.
            if (!shouldDecode(index)) { releaseFrame(frame); return; }
            cached.set(index, frame);
            decodedBytes += frame.width * frame.height * 4;
            evict();
            if (cached.size === 1) setUnavailable(false);
          } catch {
            if (!disposed && controller.signal.reason !== "seek") {
              const attempt = retries.get(index) ?? 0;
              if (attempt < 1) {
                retries.set(index, attempt + 1);
                // Discard corrupt bytes before a single network retry.
                blobs.delete(index);
                validated.delete(index);
                queue.unshift(index);
              } else {
                failed.add(index);
                root.dataset.frameLoadError = "true";
                setUnavailable(true);
              }
            }
          } finally {
            clearTimeout(timeout); inFlight.delete(index);
            if (!disposed) {
              requested = "";
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
        if (ready && Math.abs(pendingIndex - index) > decodeRadius + 3
          && Math.abs(pendingIndex - destination) > 2) controller.abort("seek");
      });
      const wanted: number[] = [];
      const seen = new Set<number>();
      const add = (next: number) => {
        if (reduced && next !== STATIC_FRAME) return;
        if (next < 0 || next > LAST_PLAYBACK_FRAME || seen.has(next) || cached.has(next) || inFlight.has(next) || failed.has(next)) return;
        if (validated.has(next) && !shouldDecode(next)) return;
        seen.add(next);
        wanted.push(next);
      };
      // The next displayed frames have priority over distant speculative work.
      add(index);
      add(index + direction * step);
      add(index - direction * step);
      for (let offset = 2; offset <= decodeRadius; offset += 1) {
        add(index + direction * offset);
        add(index - direction * offset);
      }
      add(index + direction * (decodeRadius + 1));
      add(destination);
      // While the loader is visible, fill the complete sequence after the
      // current playback window. Playback then uses only retained local blobs.
      if (!ready) indices.forEach(next => { if (!validated.has(next)) add(next); });
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
      // Preserve the opening's treatment; lift only the additional CSS shading
      // over the middle/end. The original tile colours remain untouched.
      stage.style.setProperty("--sequence-shade", String(1 - .68 * smooth((index - 96) / 12)));
      if (root.dataset.painted !== "true") root.dataset.painted = "true";
      reveal();
    };
    const chapterAlpha = chapters.map(() => -1);
    const chapterEntrance = chapters.map(() => -1);
    const syncCopy = (frame: number) => {
      if (Math.abs(frame - copyFrame) < .005) return;
      copyFrame = frame;
      chapters.forEach((element, index) => {
        const chapter = CHAPTERS[index];
        if (!chapter) return;
        // Explicit scene windows keep incoming captions out of the preceding
        // dark gap's clipping logic. Heading, tag and body share one envelope,
        // driven by the displayed scene in either scroll direction.
        const entryProgress = reduced || chapter.fadeInEnd === chapter.start ? 1
          : clamp((frame - chapter.start) / (chapter.fadeInEnd - chapter.start));
        const entrance = smooth(entryProgress);
        const exit = 1 - smooth((frame - chapter.fadeOutStart) / (chapter.end - chapter.fadeOutStart));
        const alpha = reduced ? (index === 0 ? 1 : 0) : entrance * exit;
        if (Math.abs(alpha - (chapterAlpha[index] ?? -1)) > .002) {
          chapterAlpha[index] = alpha;
          element.style.opacity = String(alpha);
          element.style.transform = reduced ? "none" : `translate3d(0, ${-(1 - exit) * 12}px, 0)`;
          element.setAttribute("aria-hidden", String(alpha < 0.1));
        }
        if (Math.abs(entryProgress - (chapterEntrance[index] ?? -1)) > .001) {
          chapterEntrance[index] = entryProgress;
          element.style.setProperty("--copy-label", String(entrance));
          element.style.setProperty("--copy-body", String(smooth((entryProgress - .18) / .82)));
          const words = chapterWords[index]!;
          words.forEach((word, wordIndex) => {
            // Finish every word inside the existing entrance window. No timer
            // can leave text hidden after its corresponding scene has arrived.
            const delay = .28 * wordIndex / Math.max(1, words.length - 1);
            const reveal = reduced ? 1 : smooth((entryProgress - delay) / (1 - delay));
            word.style.transform = `translate3d(0, ${(1 - reveal) * 105}%, 0)`;
            word.style.opacity = String(reveal);
          });
        }
      });
      if (progressRef.current) {
        const index = Math.min(LAST_PLAYBACK_FRAME, Math.max(0, Math.floor(frame)));
        const next = Math.min(LAST_PLAYBACK_FRAME, index + 1);
        const travel = FRAME_TRAVEL[index]! + (FRAME_TRAVEL[next]! - FRAME_TRAVEL[index]!) * (frame - index);
        progressRef.current.style.transform = `scaleX(${reduced ? 0 : clamp(travel / WEIGHTED_FRAME_TRAVEL)})`;
      }
      if (cueRef.current) cueRef.current.style.opacity = String(reduced ? 0 : 1 - smooth(frame / 9));
    };
    function tick(time: number) {
      raf = 0;
      const dt = lastTime ? Math.min(64, time - lastTime) : 16.67;
      lastTime = time;
      const distance = targetProgress - currentProgress;
      // Retain the opening response. Later scenes settle more softly, with
      // continuous catch-up for fast scrolling instead of an abrupt seek cutoff.
      const response = current <= 70 ? FRAME_LERP : .16 + .12 * smooth(Math.abs(distance) / .2);
      if (!ready || reduced) currentProgress = targetProgress;
      else currentProgress = Math.abs(distance) < .00002 ? targetProgress
        : currentProgress + distance * (1 - Math.pow(1 - response, dt / 16.67));
      // Ease scroll progress once, before mapping the compressed transitions.
      current = reduced ? STATIC_FRAME : frameAtScrollProgress(currentProgress);
      if (target !== current) direction = target > current ? 1 : -1;
      const desired = quantize(current);
      requestWindow(desired);
      let next = desired;
      if (!cached.has(next)) {
        // Select only between the displayed frame and the new destination.
        // This works identically forwards and backwards, regardless of the
        // direction of the last wheel event or the order decodes finish in.
        next = drawn;
        let distance = Infinity;
        for (const index of cached.keys()) {
          if (drawn >= 0 && (index < Math.min(drawn, desired) || index > Math.max(drawn, desired))) continue;
          if (Math.abs(index - desired) < distance) { distance = Math.abs(index - desired); next = index; }
        }
      }
      if (dirty || next !== drawn) paint(next);
      reveal();
      syncCopy(drawn < 0 || Math.abs(drawn - current) <= 1 ? current : drawn);
      if (!reduced && ready && currentProgress !== targetProgress) schedule();
      else lastTime = 0;
    }
    const onScroll = () => {
      targetProgress = clamp((window.scrollY - start) / travel);
      const next = reduced ? STATIC_FRAME : frameAtScrollProgress(targetProgress);
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

  return <section ref={rootRef} className={styles.hero} data-home-hero data-frame-hero data-home-header-tone="dark" aria-label="ICON architectural surface journey">
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
          {index === 0
            ? <h1 aria-label={`${chapter.before}${chapter.italic}${chapter.after}`}><span aria-hidden="true">{headlineWords(chapter.before)}<em>{headlineWords(chapter.italic)}</em>{headlineWords(chapter.after)}</span></h1>
            : <h2 aria-label={`${chapter.before}${chapter.italic}${chapter.after}`}><span aria-hidden="true">{headlineWords(chapter.before)}<em>{headlineWords(chapter.italic)}</em>{headlineWords(chapter.after)}</span></h2>}
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
