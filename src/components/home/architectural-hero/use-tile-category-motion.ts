"use client";

import { useEffect, useRef, useState } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { waitForSiteLoader } from "@/lib/animation/site-loader";

const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));
type Navigator = (index: number) => void;
// Reference image: a fuller tile face with a gentle tilt and diagonal edges.
export const TILE_REST_POSE = { rx: -27, ry: -15, rz: -26 } as const;

export type TilePose = {
  x: number; y: number; z: number; width: number; scale: number;
  rx: number; ry: number; rz: number; visible: boolean;
};
export type TileSceneMotion = { poses: TilePose[]; activeIndex?: number; position?: number; invalidate?: () => void };

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
      const v = clamp(state.velocity, -3, 3);
      const nearest = clamp(Math.round(state.current), 0, count - 1);
      activate(nearest);
      modelMotion.current.activeIndex = nearest;
      modelMotion.current.position = state.current;
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
        const rz = TILE_REST_POSE.rz + (reduced.matches ? 0 : v * 1.5);
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
      const returnTweens = new Map<number, ReturnType<typeof gsap.to>>();
      const rotationKeys = new Set<string>();
      let keyboardIndex: number | null = null;
      let ticking = false;
      let settling = false;
      let previousPosition = state.current;
      let lastWheelAt = -Infinity;
      let wheelDistance = 0;
      let wheelLatched = false;
      let wheelDirection = 0;
      let queuedIndex: number | null = null;
      const tick = (_time: number, milliseconds: number) => {
        if (!visible || document.hidden || pausedRef.current || reduced.matches) return;
        // Once settled, leave the demand-driven canvas idle. Scrolling the page
        // should not also repaint every tile and its shadow map on every frame.
        if (ready && !settling && !drag && returnTweens.size === 0
          && Math.abs(state.target - state.current) < .0001 && Math.abs(state.velocity) < .001) return;
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
      const stopReturn = (index: number) => {
        returnTweens.get(index)?.kill();
        returnTweens.delete(index);
      };
      const returnToRest = (index: number) => {
        stopReturn(index);
        const turn = rotation[index];
        if (!turn || disposed) return;
        // These are interaction offsets, not absolute rotations. Zero restores
        // TILE_REST_POSE while keeping the category's position, depth and scale.
        // Equivalent angles avoid unwinding several complete revolutions.
        turn.x = ((turn.x + 180) % 360 + 360) % 360 - 180;
        turn.y = ((turn.y + 180) % 360 + 360) % 360 - 180;
        if (reduced.matches || (Math.abs(turn.x) < .001 && Math.abs(turn.y) < .001)) {
          turn.x = turn.y = 0;
          render();
          return;
        }
        returnTweens.set(index, gsap.to(turn, {
          x: 0, y: 0, duration: .85, ease: "power3.out", overwrite: true,
          onUpdate: render,
          onComplete: () => { returnTweens.delete(index); },
        }));
      };
      const finishKeyboard = () => {
        const index = keyboardIndex;
        keyboardIndex = null;
        rotationKeys.clear();
        if (index !== null) returnToRest(index);
      };
      const finishDrag = () => {
        const interaction = drag;
        if (!interaction) return;
        // Clear first: releasing capture can dispatch lostpointercapture again.
        drag = null;
        delete scene.dataset.dragging;
        if (interaction.moved) suppressClickUntil = performance.now() + 350;
        if (scene.hasPointerCapture(interaction.id)) scene.releasePointerCapture(interaction.id);
        returnToRest(interaction.startIndex);
      };
      const cancelInteraction = () => { finishDrag(); finishKeyboard(); };
      const goTo = (index: number): void => {
        finishKeyboard();
        const to = clamp(Math.round(index), 0, count - 1);
        queuedIndex = null;
        if (to === state.target && (settling || Math.abs(state.current - to) < .0001)) return;
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
          duration: .56,
          ease: "power2.inOut",
          onComplete: () => {
            state.current = state.target = to;
            previousPosition = to;
            settling = false;
            // Let residual tilt decay rather than snapping it to zero at the
            // category boundary. Keep one deliberate follow-up gesture queued.
            const next = queuedIndex;
            queuedIndex = null;
            if (next !== null && next !== to) goTo(next);
            render();
          },
        });
      };
      navigate.current = (index) => {
        if (!ready || pausedRef.current || drag || performance.now() < suppressClickUntil) return;
        goTo(index);
      };
      const wheel = (event: WheelEvent) => {
        if (!ready || pausedRef.current || reduced.matches || count < 2 || event.ctrlKey || event.metaKey || event.defaultPrevented || !event.cancelable) return;
        if (drag) { event.preventDefault(); return; }
        const raw = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        if (!raw) return;
        const now = performance.now();
        const direction = Math.sign(raw);
        const freshGesture = now - lastWheelAt > 160 || direction !== wheelDirection;
        lastWheelAt = now;
        wheelDirection = direction;
        if (freshGesture) { wheelDistance = 0; wheelLatched = false; }
        // Consume inertia through the end of this gesture, including at the last
        // tile. A fresh gesture at either end releases normal document scrolling.
        if (wheelLatched) {
          event.preventDefault();
          wheelLatched = true;
          return;
        }
        const from = clamp(Math.round(state.target), 0, count - 1);
        const to = clamp(from + direction, 0, count - 1);
        if (to === from) {
          if (settling) event.preventDefault();
          return;
        }
        event.preventDefault();
        const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1;
        if (Math.sign(wheelDistance) !== direction) wheelDistance = 0;
        wheelDistance += raw * units;
        if (Math.abs(wheelDistance) < 14) return;
        wheelLatched = true;
        wheelDistance = 0;
        if (settling) queuedIndex = to;
        else goTo(to);
      };
      const pointerDown = (event: PointerEvent) => {
        if (!ready || pausedRef.current || settling || event.button !== 0 || !event.isPrimary || drag) return;
        finishKeyboard();
        const startIndex = state.active;
        const turn = rotation[startIndex];
        if (!turn) return;
        // A new drag picks up the current eased pose without competing tweens.
        stopReturn(startIndex);
        drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, startIndex, rx: turn.x, ry: turn.y, moved: false };
      };
      const pointerMove = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        if (pausedRef.current || (event.pointerType === "mouse" && (event.buttons & 1) === 0)) {
          finishDrag();
          return;
        }
        // Pointer capture suppresses pointerleave while dragging, so also check
        // the actual interaction bounds to avoid a stuck off-screen rotation.
        const bounds = scene.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) {
          finishDrag();
          return;
        }
        const travel = event.clientX - drag.startX;
        const vertical = event.clientY - drag.startY;
        if (!drag.moved) {
          if (Math.abs(vertical) > Math.abs(travel) + 6 && event.pointerType !== "mouse") { finishDrag(); return; }
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
        // Accumulate freely on both axes throughout the drag, including full turns.
        turn.x = drag.rx - vertical * sensitivity;
        turn.y = drag.ry + travel * sensitivity;
        render();
      };
      const pointerUp = (event: PointerEvent) => {
        if (!drag || drag.id !== event.pointerId) return;
        finishDrag();
      };
      const pointerLeave = () => {
        finishDrag();
      };
      const mouseUp = (event: MouseEvent) => {
        if (event.button === 0) finishDrag();
      };
      const keyDown = (event: KeyboardEvent) => {
        if (!ready || pausedRef.current || drag || event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key.toLowerCase() === "r") {
          finishKeyboard();
          returnToRest(state.active);
          return;
        }
        if (event.shiftKey && event.key.startsWith("Arrow")) {
          event.preventDefault();
          const turn = rotation[state.active];
          if (!turn) return;
          keyboardIndex = state.active;
          rotationKeys.add(event.key);
          stopReturn(state.active);
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
      const keyUp = (event: KeyboardEvent) => {
        if (event.key === "Shift") { finishKeyboard(); return; }
        if (!rotationKeys.delete(event.key)) return;
        if (rotationKeys.size === 0) finishKeyboard();
      };
      const focusOut = (event: FocusEvent) => {
        if (!(event.relatedTarget instanceof Node) || !scene.contains(event.relatedTarget)) finishKeyboard();
      };
      const visibilityChange = () => {
        if (document.hidden) cancelInteraction();
        wake();
      };
      const motionChange = () => {
        cancelInteraction();
        rotation.forEach((_turn, index) => returnToRest(index));
        introTween?.kill(); snapTween?.kill();
        settling = false;
        wheelLatched = false;
        wheelDistance = 0;
        wheelDirection = 0;
        queuedIndex = null;
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
          onComplete: () => { ready = true; render(); },
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
      scene.addEventListener("focusout", focusOut);
      window.addEventListener("keyup", keyUp);
      window.addEventListener("pointerup", pointerUp);
      window.addEventListener("pointercancel", pointerUp);
      window.addEventListener("mouseup", mouseUp);
      window.addEventListener("blur", cancelInteraction);
      document.addEventListener("visibilitychange", visibilityChange);
      reduced.addEventListener("change", motionChange);
      cleanupMotion = () => {
        cancelInteraction();
        returnTweens.forEach(tween => tween.kill());
        returnTweens.clear();
        gsap.ticker.remove(tick); introTween?.kill(); snapTween?.kill();
        scene.removeEventListener("wheel", wheel);
        scene.removeEventListener("pointerdown", pointerDown);
        scene.removeEventListener("pointermove", pointerMove);
        scene.removeEventListener("pointerup", pointerUp);
        scene.removeEventListener("pointercancel", pointerUp);
        scene.removeEventListener("lostpointercapture", pointerUp);
        scene.removeEventListener("pointerleave", pointerLeave);
        scene.removeEventListener("keydown", keyDown);
        scene.removeEventListener("focusout", focusOut);
        window.removeEventListener("keyup", keyUp);
        window.removeEventListener("pointerup", pointerUp);
        window.removeEventListener("pointercancel", pointerUp);
        window.removeEventListener("mouseup", mouseUp);
        window.removeEventListener("blur", cancelInteraction);
        document.removeEventListener("visibilitychange", visibilityChange);
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
