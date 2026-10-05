"use client";

import { useEffect, useRef, useState } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { waitForSiteLoader } from "@/lib/animation/site-loader";

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
type Navigator = (index: number) => void;

/** DOM adaptation of /new try's diagonal positions, damping and snap timing.
 * The sample is an image plane; no disc geometry or WebGL scene is needed. */
export function useTileCategoryMotion(count: number, paused: boolean) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const navigate = useRef<Navigator>(() => undefined);
  const pausedRef = useRef(paused);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || count === 0) return;
    const samples = Array.from(scene.querySelectorAll<HTMLElement>("[data-tile-sample]"));
    const faces = samples.map((sample) => sample.querySelector<HTMLElement>("[data-tile-face]"));
    const progress = scene.querySelector<HTMLElement>("[data-tile-progress]");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = { current: 0, target: 0, velocity: 0, active: 0, mouseX: 0, mouseY: 0, easedX: 0, easedY: 0 };
    const intro = { spread: 14, scale: .7, lift: 24, opacity: 0 };
    const hover = samples.map(() => 0);
    let disposed = false;
    let visible = true;
    let started = false;
    let ready = false;
    let hovered = -1;
    let width = scene.clientWidth;
    let height = scene.clientHeight;
    let elapsed = 0;
    let suppressClickUntil = 0;
    let drag: { id: number; x: number; startX: number; startY: number; startIndex: number; moved: boolean } | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let cleanupMotion: (() => void) | undefined;
    let wake: () => void = () => undefined;
    const detachImages: Array<() => void> = [];

    const activate = (index: number) => {
      if (state.active === index) return;
      state.active = index;
      setActiveIndex(index);
    };
    const render = (dt: number) => {
      const mobile = width < 761;
      // Same distance/depth relationship as the demo, mapped from scene units to pixels.
      const unit = Math.min(width * (mobile ? .28 : .135), height * .39);
      const spacing = mobile ? 2.25 : 2.55;
      const v = clamp(state.velocity, -6, 6);
      const nearest = clamp(Math.round(state.current), 0, count - 1);
      activate(nearest);
      samples.forEach((sample, index) => {
        const d = index - state.current;
        const distance = Math.abs(d);
        hover[index] = (hover[index] ?? 0) + ((hovered === index ? 1 : 0) - (hover[index] ?? 0)) * (1 - Math.exp(-dt * 8));
        const h = reduced.matches ? 0 : hover[index] ?? 0;
        const introX = index === 0 ? -intro.spread * unit * .08 : intro.spread * unit * (1 + index * .35);
        const x = d * spacing * unit + introX;
        const y = -d * .5 * unit + (reduced.matches ? 0 : Math.sin(elapsed * .8 + index) * unit * .025) + intro.lift;
        const z = -Math.min(distance, 2.5) * unit * .9 + h * 14;
        const scale = (1.12 - .18 * Math.min(distance, 1)) * intro.scale * (1 + h * .03);
        sample.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) scale(${scale.toFixed(4)})`;
        sample.style.opacity = String(intro.opacity * clamp(1 - distance * .28, 0, 1));
        sample.style.visibility = distance > 3 ? "hidden" : "visible";
        sample.style.zIndex = String(10 - Math.round(distance * 2));
        const face = faces[index];
        if (face) {
          // Reference BASE (-.62, .42, .32 radians), with velocity and mouse influence.
          const rx = reduced.matches ? -12 : -35.5 + state.easedY * 8 - v * 1.72;
          const ry = reduced.matches ? 8 : 24 + state.easedX * 11.5 - d * 3.44;
          const rz = reduced.matches ? -4 : -18.3 + v * 3.44;
          face.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg)`;
          face.style.setProperty("--light-x", `${50 + state.easedX * 18}%`);
        }
      });
      if (progress) progress.style.transform = `scaleX(${count > 1 ? clamp(state.current / (count - 1), 0, 1) : 1})`;
    };
    const showStatic = () => {
      intro.spread = 0; intro.scale = 1; intro.lift = 0; intro.opacity = 1;
      state.current = state.target = clamp(Math.round(state.target), 0, count - 1);
      state.velocity = 0;
      scene.dataset.motion = "ready";
      ready = true;
      render(1);
    };
    const imageReady = (image: HTMLImageElement) => new Promise<void>((resolve) => {
      const finish = () => {
        image.removeEventListener("load", finish);
        image.removeEventListener("error", finish);
        if (image.complete && image.naturalWidth && image.decode) void image.decode().catch(() => undefined).then(() => resolve());
        else resolve();
      };
      if (image.complete) finish();
      else {
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
        detachImages.push(() => { image.removeEventListener("load", finish); image.removeEventListener("error", finish); resolve(); });
      }
    });
    const initialImages = Array.from(scene.querySelectorAll<HTMLImageElement>("[data-initial-image]"));
    const assetDeadline = new Promise<void>((resolve) => { deadline = setTimeout(resolve, 3500); });
    const resize = new ResizeObserver(() => { width = scene.clientWidth; height = scene.clientHeight; if (started) render(1 / 60); });
    resize.observe(scene);
    const visibility = new IntersectionObserver(([entry]) => { visible = Boolean(entry?.isIntersecting); wake(); }, { threshold: 0 });
    visibility.observe(scene);

    void Promise.all([loadGsap(), Promise.race([Promise.all(initialImages.map(imageReady)), assetDeadline]), waitForSiteLoader()]).then(([{ gsap }]) => {
      if (disposed) return;
      if (deadline) clearTimeout(deadline);
      let snapTween: ReturnType<typeof gsap.to> | undefined;
      let introTween: ReturnType<typeof gsap.to> | undefined;
      let ticking = false;
      let settling = false;
      let previousPosition = state.current;
      let lastWheelAt = -Infinity;
      let wheelDistance = 0;
      let wheelLatched = false;
      const tick = (_time: number, milliseconds: number) => {
        if (!visible || document.hidden || pausedRef.current || reduced.matches) return;
        const dt = Math.min(milliseconds / 1000, .05);
        elapsed += dt;
        // Snapping animates the shared playhead directly: no second easing layer
        // dragging behind the tween and leaving the interior between categories.
        if (!settling) state.current += (state.target - state.current) * (1 - Math.exp(-dt * 14));
        const velocity = (state.current - previousPosition) / Math.max(dt, .0001);
        previousPosition = state.current;
        state.velocity += (velocity - state.velocity) * (1 - Math.exp(-dt * 7.67));
        state.easedX += (state.mouseX - state.easedX) * (1 - Math.exp(-dt * 4));
        state.easedY += (state.mouseY - state.easedY) * (1 - Math.exp(-dt * 4));
        render(dt);
      };
      wake = () => {
        const shouldTick = visible && !document.hidden && !reduced.matches;
        if (shouldTick && !ticking) { gsap.ticker.add(tick); ticking = true; }
        else if (!shouldTick && ticking) { gsap.ticker.remove(tick); ticking = false; }
      };
      const goTo = (index: number) => {
        const to = clamp(Math.round(index), 0, count - 1);
        snapTween?.kill();
        state.target = to;
        if (reduced.matches) {
          settling = false;
          showStatic();
          previousPosition = state.current;
          return;
        }
        settling = true;
        snapTween = gsap.to(state, {
          current: to,
          duration: drag?.moved ? .48 : .72,
          ease: drag?.moved ? "power3.out" : "power2.inOut",
          onComplete: () => {
            state.current = state.target = to;
            state.velocity = 0;
            previousPosition = to;
            settling = false;
            render(1 / 60);
          },
        });
      };
      const snap = () => goTo(state.target);
      const nudge = (delta: number) => {
        if (!ready || pausedRef.current) return;
        snapTween?.kill();
        settling = false;
        // Limit the input backlog so a trackpad fling cannot skip the full collection.
        state.target = clamp(clamp(state.target + delta, state.current - 1.15, state.current + 1.15), -.35, count - 1 + .35);
      };
      navigate.current = (index) => {
        if (!ready || pausedRef.current || performance.now() < suppressClickUntil) return;
        goTo(index);
      };
      const wheel = (event: WheelEvent) => {
        if (!ready || pausedRef.current || reduced.matches || count < 2 || event.ctrlKey || event.metaKey || event.defaultPrevented || !event.cancelable) return;
        const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!raw) return;
        const now = performance.now();
        const freshGesture = now - lastWheelAt > 220;
        lastWheelAt = now;
        if (freshGesture) { wheelDistance = 0; wheelLatched = false; }
        // Consume inertia through the end of this gesture, including at the last
        // tile. A fresh gesture at either end releases normal document scrolling.
        if (settling || wheelLatched || drag?.moved) {
          event.preventDefault();
          wheelLatched = true;
          return;
        }
        const direction = Math.sign(raw);
        const from = clamp(Math.round(state.target), 0, count - 1);
        const to = clamp(from + direction, 0, count - 1);
        if (to === from) return;
        event.preventDefault();
        const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
        if (Math.sign(wheelDistance) !== direction) wheelDistance = 0;
        wheelDistance += raw * units;
        if (Math.abs(wheelDistance) < 10) return;
        wheelLatched = true;
        wheelDistance = 0;
        goTo(to);
      };
      const pointerDown = (event: PointerEvent) => {
        if (!ready || pausedRef.current || event.button !== 0 || (event.target as Element).closest("[data-scene-control]")) return;
        drag = { id: event.pointerId, x: event.clientX, startX: event.clientX, startY: event.clientY, startIndex: Math.round(state.current), moved: false };
      };
      const pointerMove = (event: PointerEvent) => {
        if (pausedRef.current) return;
        const bounds = scene.getBoundingClientRect();
        state.mouseX = clamp((event.clientX - bounds.left) / width * 2 - 1, -1, 1);
        state.mouseY = clamp((event.clientY - bounds.top) / height * 2 - 1, -1, 1);
        const hit = (event.target as Element).closest<HTMLElement>("[data-sample-index]");
        hovered = hit ? Number(hit.dataset.sampleIndex) : -1;
        if (!drag || drag.id !== event.pointerId) return;
        const travel = event.clientX - drag.startX;
        if (!drag.moved) {
          if (Math.abs(event.clientY - drag.startY) > Math.abs(travel) + 6 && event.pointerType !== "mouse") { drag = null; return; }
          if (Math.abs(travel) < 6) return;
          drag.moved = true;
          snapTween?.kill();
          settling = false;
          state.target = state.current;
          scene.setPointerCapture(event.pointerId);
          scene.dataset.dragging = "true";
        }
        const dx = event.clientX - drag.x;
        drag.x = event.clientX;
        if (!reduced.matches) nudge(-dx * (2.2 / width) * (width < 761 ? 1.6 : 1));
      };
      const pointerUp = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        if (drag.moved) {
          if (reduced.matches) {
            state.target = clamp(state.active + (event.clientX < drag.startX ? 1 : -1), 0, count - 1);
            showStatic();
          } else {
            const travel = event.clientX - drag.startX;
            const nearest = Math.round(state.target);
            const deliberateSwipe = event.type === "pointerup" && Math.abs(travel) >= Math.max(24, width * .04);
            goTo(deliberateSwipe && nearest === drag.startIndex
              ? drag.startIndex + (travel < 0 ? 1 : -1)
              : nearest);
          }
          suppressClickUntil = performance.now() + 350;
        }
        drag = null;
        delete scene.dataset.dragging;
        if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
      };
      const pointerLeave = () => { state.mouseX = 0; state.mouseY = 0; hovered = -1; };
      const keyDown = (event: KeyboardEvent) => {
        if (pausedRef.current || event.altKey || event.ctrlKey || event.metaKey) return;
        const direction = ["ArrowRight", "ArrowDown"].includes(event.key) ? 1 : ["ArrowLeft", "ArrowUp"].includes(event.key) ? -1 : 0;
        if (!direction) return;
        const to = clamp(Math.round(state.target) + direction, 0, count - 1);
        if (to === state.active) return;
        event.preventDefault();
        navigate.current(to);
      };
      const motionChange = () => {
        introTween?.kill(); snapTween?.kill();
        settling = false;
        wheelLatched = false;
        wheelDistance = 0;
        showStatic(); wake();
        previousPosition = state.current;
      };
      started = true;
      render(1 / 60);
      scene.dataset.motion = "ready";
      if (reduced.matches) showStatic();
      else {
        introTween = gsap.to(intro, {
          spread: 0, scale: 1, lift: 0, opacity: 1, duration: 2, ease: "expo.inOut",
          onComplete: () => { ready = true; },
        });
      }
      wake();
      scene.addEventListener("wheel", wheel, { passive: false });
      scene.addEventListener("pointerdown", pointerDown);
      scene.addEventListener("pointermove", pointerMove);
      scene.addEventListener("pointerup", pointerUp);
      scene.addEventListener("pointercancel", pointerUp);
      scene.addEventListener("lostpointercapture", pointerUp);
      scene.addEventListener("pointerleave", pointerLeave);
      scene.addEventListener("keydown", keyDown);
      const cancelDrag = () => {
        const pointerId = drag?.id;
        drag = null;
        delete scene.dataset.dragging;
        state.mouseX = 0; state.mouseY = 0; hovered = -1;
        if (pointerId !== undefined && scene.hasPointerCapture(pointerId)) scene.releasePointerCapture(pointerId);
        if (ready && !reduced.matches) snap();
      };
      window.addEventListener("blur", cancelDrag);
      document.addEventListener("visibilitychange", wake);
      reduced.addEventListener("change", motionChange);
      cleanupMotion = () => {
        gsap.ticker.remove(tick); introTween?.kill(); snapTween?.kill();
        scene.removeEventListener("wheel", wheel);
        scene.removeEventListener("pointerdown", pointerDown);
        scene.removeEventListener("pointermove", pointerMove);
        scene.removeEventListener("pointerup", pointerUp);
        scene.removeEventListener("pointercancel", pointerUp);
        scene.removeEventListener("lostpointercapture", pointerUp);
        scene.removeEventListener("pointerleave", pointerLeave);
        scene.removeEventListener("keydown", keyDown);
        window.removeEventListener("blur", cancelDrag);
        document.removeEventListener("visibilitychange", wake);
        reduced.removeEventListener("change", motionChange);
      };
    }).catch(() => {
      if (disposed) return;
      scene.dataset.motion = "fallback";
      navigate.current = (index) => { activate(clamp(index, 0, count - 1)); };
    });

    return () => {
      disposed = true;
      navigate.current = () => undefined;
      if (deadline) clearTimeout(deadline);
      detachImages.forEach((detach) => detach());
      resize.disconnect(); visibility.disconnect(); cleanupMotion?.();
    };
  }, [count]);

  return { sceneRef, activeIndex, select: (index: number) => navigate.current(index) };
}
