"use client";

import { useEffect } from "react";

/** Keep real document scrolling for sticky elements, anchors and ScrollTrigger.
 * Precision gestures retain OS momentum; wheel notches get a short eased coast. */
export function useEasedWheelScroll(pathname: string) {
  useEffect(() => {
    const enabled = window.matchMedia("(pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let current = window.scrollY;
    let target = current;
    let written = current;
    let previousTime = 0;
    let maximum = 0;
    let viewport = window.innerHeight;
    let lastWheel = 0;
    let nativeGesture = false;
    let cachedOrigin: Element | null = null;
    let panels: Array<{ node: Element; vertical: boolean; horizontal: boolean; contained: boolean }> = [];

    const measure = () => {
      viewport = window.innerHeight;
      maximum = Math.max(0, document.documentElement.scrollHeight - viewport);
    };
    const clamp = (value: number) => Math.max(0, Math.min(maximum, value));
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      current = target = written = window.scrollY;
    };
    const interrupt = () => {
      stop();
      cachedOrigin = null;
      lastWheel = 0;
    };
    const locked = () => document.body.style.overflow === "hidden"
      || document.documentElement.style.overflow === "hidden"
      || Boolean(document.querySelector("dialog[open]"));

    const tick = (time: number) => {
      if (!enabled.matches || Math.abs(window.scrollY - written) > 2) {
        interrupt();
        return;
      }
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 1000 / 60;
      previousTime = time;
      target = clamp(target);
      current += (target - current) * (1 - Math.exp(-elapsed / 175));
      const finished = Math.abs(target - current) < .65;
      if (finished) current = target;
      window.scrollTo({ top: current, left: window.scrollX, behavior: "instant" });
      written = window.scrollY;
      if (finished) {
        frame = 0;
        previousTime = 0;
      } else frame = requestAnimationFrame(tick);
    };

    const wheel = (event: WheelEvent) => {
      if (!enabled.matches || event.defaultPrevented || !event.cancelable
        || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || locked()) {
        interrupt();
        return;
      }
      // Zero-value trailing events must not cut off an in-progress coast.
      if (!event.deltaY && !event.deltaX) return;
      const now = performance.now();
      const freshGesture = lastWheel === 0 || now - lastWheel > 180;
      lastWheel = now;
      if (freshGesture) {
        // Browsers do not identify wheel hardware. Small/fractional pixel input
        // is a conservative precision-gesture heuristic, latched for its tail.
        nativeGesture = event.deltaMode === 0 && (
          Math.abs(event.deltaY) < 40 || !Number.isInteger(event.deltaY) || event.deltaX !== 0
        );
        cachedOrigin = null;
      }
      if (nativeGesture || Math.abs(event.deltaX) > Math.abs(event.deltaY)) {
        stop();
        return;
      }
      const origin = event.target instanceof Element ? event.target : null;
      if (origin?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [data-native-scroll]")) {
        interrupt();
        return;
      }
      // Cache style reads for each target/gesture, not for every animation frame.
      if (origin !== cachedOrigin || freshGesture) {
        panels = [];
        for (let node = origin; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
          const style = getComputedStyle(node);
          const vertical = /(auto|scroll|overlay)/.test(style.overflowY);
          const horizontal = /(auto|scroll|overlay)/.test(style.overflowX);
          if (vertical || horizontal) panels.push({ node, vertical, horizontal, contained: style.overscrollBehaviorY !== "auto" });
        }
        cachedOrigin = origin;
      }
      for (const { node, vertical, horizontal, contained } of panels) {
        if ((horizontal && node.scrollWidth > node.clientWidth + 1)
          || (vertical && node.scrollHeight > node.clientHeight + 1 && (contained
            || (event.deltaY < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1)))) {
          stop();
          return;
        }
      }
      if (!frame) current = target = written = window.scrollY;
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport : 1;
      const delta = Math.max(-viewport * .65, Math.min(viewport * .65, event.deltaY * units));
      if ((target - current) * delta < 0) target = current;
      const backlog = viewport;
      const next = clamp(Math.max(current - backlog, Math.min(current + backlog, target + delta)));
      if (next === current && !frame) return;
      event.preventDefault();
      target = next;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const nativeScroll = () => {
      if (frame && Math.abs(window.scrollY - written) > 2) interrupt();
      else if (!frame) current = target = written = window.scrollY;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Tab", "Escape"].includes(event.key)) interrupt();
    };
    const resize = () => { interrupt(); measure(); };
    measure();
    const sizeObserver = new ResizeObserver(measure);
    sizeObserver.observe(document.documentElement);
    sizeObserver.observe(document.body);
    // Opening an overlay programmatically also cancels any remaining momentum.
    const lockObserver = new MutationObserver(() => { if (locked()) interrupt(); });
    lockObserver.observe(document.body, { attributes: true, attributeFilter: ["style"] });
    document.querySelectorAll("dialog").forEach((dialog) => lockObserver.observe(dialog, { attributes: true, attributeFilter: ["open"] }));

    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("scroll", nativeScroll, { passive: true });
    window.addEventListener("keydown", keyDown);
    window.addEventListener("pointerdown", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("resize", resize);
    window.addEventListener("hashchange", interrupt);
    window.addEventListener("blur", interrupt);
    document.addEventListener("visibilitychange", interrupt);
    enabled.addEventListener("change", interrupt);
    return () => {
      interrupt();
      sizeObserver.disconnect();
      lockObserver.disconnect();
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", nativeScroll);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("pointerdown", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("resize", resize);
      window.removeEventListener("hashchange", interrupt);
      window.removeEventListener("blur", interrupt);
      document.removeEventListener("visibilitychange", interrupt);
      enabled.removeEventListener("change", interrupt);
    };
  }, [pathname]);
}
