"use client";

import { useEffect, useRef, useState } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { waitForSiteLoader } from "@/lib/animation/site-loader";

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
type Navigator = (index: number) => void;
// Reference image: a diagonal, foreshortened slab with an upright label below it.
export const TILE_REST_POSE = { rx: -46, ry: 0, rz: -26 } as const;

export type TilePose = {
  x: number; y: number; z: number; width: number; scale: number;
  rx: number; ry: number; rz: number; visible: boolean;
};
export type TileSceneMotion = { poses: TilePose[]; activeIndex?: number; invalidate?: () => void };

/** One pose drives both the accessible image fallback and the WebGL slabs. */
export function useTileCategoryMotion(count: number, paused: boolean) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const modelMotion = useRef<TileSceneMotion>({ poses: [] });
  const navigate = useRef<Navigator>(() => undefined);
  const pausedRef = useRef(paused);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || count === 0) return;
    const samples = Array.from(scene.querySelectorAll<HTMLElement>("[data-tile-sample]"));
    const faces = samples.map((sample) => sample.querySelector<HTMLElement>("[data-tile-face]"));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const state = { current: 0, target: 0, velocity: 0, active: 0 };
    const intro = { spread: 14, scale: .7, lift: 24, opacity: 0 };
    const rotation = samples.map(() => ({ x: 0, y: 0 }));
    let measurements = samples.map(sample => ({ width: sample.clientWidth, labelHeight: sample.clientHeight - sample.clientWidth }));
    let disposed = false;
    let visible = true;
    let started = false;
    let ready = false;
    let width = scene.clientWidth;
    let height = scene.clientHeight;
    let suppressClickUntil = 0;
    let drag: { id: number; startX: number; startY: number; startIndex: number; rx: number; ry: number; moved: boolean } | null = null;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    let cleanupMotion: (() => void) | undefined;
    let wake: () => void = () => undefined;
    const detachImages: Array<() => void> = [];

    const activate = (index: number) => {
      if (state.active === index) return;
      state.active = index;
      setActiveIndex(index);
    };
    const render = () => {
      const mobile = width < 761;
      scene.style.setProperty("--tile-model-opacity", String(intro.opacity));
      // Same distance/depth relationship as the demo, mapped from scene units to pixels.
      const unit = Math.min(width * (mobile ? .28 : .135), height * .39);
      const spacing = mobile ? 2.25 : 2.55;
      const v = clamp(state.velocity, -6, 6);
      const nearest = clamp(Math.round(state.current), 0, count - 1);
      activate(nearest);
      modelMotion.current.activeIndex = nearest;
      samples.forEach((sample, index) => {
        const d = index - state.current;
        const distance = Math.abs(d);
        const introX = index === 0 ? -intro.spread * unit * .08 : intro.spread * unit * (1 + index * .35);
        const x = d * spacing * unit + introX;
        const y = -d * .5 * unit + intro.lift;
        const z = -Math.min(distance, 2.5) * unit * .9;
        const scale = (1.12 - .18 * Math.min(distance, 1)) * intro.scale;
        sample.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) scale(${scale.toFixed(4)})`;
        sample.style.opacity = String(intro.opacity * clamp(1 - distance * .28, 0, 1));
        sample.style.visibility = distance > 3 ? "hidden" : "visible";
        sample.style.zIndex = String(10 - Math.round(distance * 2));
        const face = faces[index];
        const turn = rotation[index];
        const measurement = measurements[index];
        if (!turn || !measurement) return;
        const rx = TILE_REST_POSE.rx + turn.x;
        const ry = TILE_REST_POSE.ry - d * 3.44 + turn.y;
        const rz = TILE_REST_POSE.rz + (reduced.matches ? 0 : v * 3.44);
        if (face) {
          face.style.transform = `rotateZ(${rz.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg)`;
          face.style.setProperty("--light-x", `${50 + turn.y * .25}%`);
        }
        modelMotion.current.poses[index] = {
          x, y: y + height * ((mobile ? .43 : .4475) - .45) + measurement.labelHeight * (1 - scale) / 2,
          z, width: measurement.width, scale, rx, ry, rz,
          visible: distance <= 3 && intro.opacity > .05,
        };
      });
      modelMotion.current.invalidate?.();
    };
    const showStatic = () => {
      intro.spread = 0; intro.scale = 1; intro.lift = 0; intro.opacity = 1;
      state.current = state.target = clamp(Math.round(state.target), 0, count - 1);
      state.velocity = 0;
      scene.dataset.motion = "ready";
      ready = true;
      render();
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
    const resize = new ResizeObserver(() => {
      width = scene.clientWidth; height = scene.clientHeight;
      measurements = samples.map(sample => ({ width: sample.clientWidth, labelHeight: sample.clientHeight - sample.clientWidth }));
      if (started) render();
    });
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
        // Snapping animates the shared playhead directly: no second easing layer
        // dragging behind the tween and leaving the interior between categories.
        if (!settling) state.current += (state.target - state.current) * (1 - Math.exp(-dt * 14));
        const velocity = (state.current - previousPosition) / Math.max(dt, .0001);
        previousPosition = state.current;
        state.velocity += (velocity - state.velocity) * (1 - Math.exp(-dt * 7.67));
        render();
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
            render();
          },
        });
      };
      navigate.current = (index) => {
        if (!ready || pausedRef.current || performance.now() < suppressClickUntil) return;
        goTo(index);
      };
      const wheel = (event: WheelEvent) => {
        if (!ready || pausedRef.current || reduced.matches || count < 2 || event.ctrlKey || event.metaKey || event.defaultPrevented || !event.cancelable) return;
        if (drag) { event.preventDefault(); return; }
        const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!raw) return;
        const now = performance.now();
        const freshGesture = now - lastWheelAt > 220;
        lastWheelAt = now;
        if (freshGesture) { wheelDistance = 0; wheelLatched = false; }
        // Consume inertia through the end of this gesture, including at the last
        // tile. A fresh gesture at either end releases normal document scrolling.
        if (settling || wheelLatched) {
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
        if (!ready || pausedRef.current || event.button !== 0 || !event.isPrimary || drag) return;
        const startIndex = state.active;
        const turn = rotation[startIndex];
        if (!turn) return;
        drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, startIndex, rx: turn.x, ry: turn.y, moved: false };
      };
      const pointerMove = (event: PointerEvent) => {
        if (pausedRef.current) return;
        if (!drag || drag.id !== event.pointerId) return;
        if (event.pointerType === "mouse" && (event.buttons & 1) === 0) {
          drag = null;
          delete scene.dataset.dragging;
          if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
          return;
        }
        const travel = event.clientX - drag.startX;
        const vertical = event.clientY - drag.startY;
        if (!drag.moved) {
          if (Math.abs(vertical) > Math.abs(travel) + 6 && event.pointerType !== "mouse") { drag = null; return; }
          if (Math.hypot(travel, vertical) < 4) return;
          drag.moved = true;
          snapTween?.kill();
          settling = false;
          state.current = state.target = drag.startIndex;
          previousPosition = state.current;
          state.velocity = 0;
          scene.setPointerCapture(event.pointerId);
          scene.dataset.dragging = "true";
          scene.focus({ preventScroll: true });
        }
        const turn = rotation[drag.startIndex];
        const measurement = measurements[drag.startIndex];
        if (!turn || !measurement) return;
        const sensitivity = 360 / Math.max(400, measurement.width * 1.4);
        // Accumulate freely on both axes: repeated drags can complete any number
        // of turns without stopping at the side or snapping back to the front.
        turn.x = drag.rx - vertical * sensitivity;
        turn.y = drag.ry + travel * sensitivity;
        render();
      };
      const pointerUp = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        if (drag.moved) {
          suppressClickUntil = performance.now() + 350;
          const turn = rotation[drag.startIndex];
          if (turn) { turn.x %= 360; turn.y %= 360; }
        }
        drag = null;
        delete scene.dataset.dragging;
        if (scene.hasPointerCapture(event.pointerId)) scene.releasePointerCapture(event.pointerId);
      };
      const pointerLeave = () => {
        if (drag && !drag.moved) drag = null;
      };
      const keyDown = (event: KeyboardEvent) => {
        if (!ready || pausedRef.current || drag || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key.toLowerCase() === "r") {
          rotation[state.active] = { x: 0, y: 0 };
          render();
          return;
        }
        if (event.shiftKey && event.key.startsWith("Arrow")) {
          event.preventDefault();
          const turn = rotation[state.active];
          if (!turn) return;
          turn.x = (turn.x + (event.key === "ArrowUp" ? 8 : event.key === "ArrowDown" ? -8 : 0)) % 360;
          turn.y = (turn.y + (event.key === "ArrowRight" ? 8 : event.key === "ArrowLeft" ? -8 : 0)) % 360;
          render();
          return;
        }
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
      render();
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
        if (pointerId !== undefined && scene.hasPointerCapture(pointerId)) scene.releasePointerCapture(pointerId);
      };
      window.addEventListener("blur", cancelDrag);
      document.addEventListener("visibilitychange", wake);
      reduced.addEventListener("change", motionChange);
      cleanupMotion = () => {
        cancelDrag();
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
      modelMotion.current.poses = [];
    };
  }, [count]);

  return { sceneRef, modelMotion, activeIndex, select: (index: number) => navigate.current(index) };
}
