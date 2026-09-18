"use client";

import { useEffect } from "react";

/** Ease desktop wheel input on the real document, without a transformed page
 * wrapper. Sticky sections and ScrollTrigger continue to read native scrollY. */
export function useEasedWheelScroll(pathname: string) {
  useEffect(() => {
    const enabled = window.matchMedia("(pointer: fine) and (min-width: 761px) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let current = window.scrollY;
    let target = current;
    let written = current;
    let previousTime = 0;

    const limit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const clamp = (value: number) => Math.max(0, Math.min(limit(), value));
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      current = target = written = window.scrollY;
    };
    const locked = () => document.body.style.overflow === "hidden"
      || document.documentElement.style.overflow === "hidden"
      || Boolean(document.querySelector("dialog[open]"));

    const tick = (time: number) => {
      // Yield immediately to anchors, browser restoration or another controller.
      if (!enabled.matches || locked() || Math.abs(window.scrollY - written) > 2) {
        stop();
        return;
      }
      const elapsed = previousTime ? Math.min(64, time - previousTime) : 1000 / 60;
      previousTime = time;
      target = clamp(target);
      // Frame-rate independent damping: a soft trailing coast, not a fixed
      // duration tween that restarts abruptly at every wheel event.
      current += (target - current) * (1 - Math.exp(-elapsed / 210));
      const finished = Math.abs(target - current) < .5;
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
        || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey
        || Math.abs(event.deltaX) > Math.abs(event.deltaY) || !event.deltaY || locked()) {
        stop();
        return;
      }
      const origin = event.target instanceof Element ? event.target : null;
      if (origin?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false']), [data-native-scroll]")) {
        stop();
        return;
      }
      // Let overflow panels and horizontal galleries handle their own input.
      for (let node = origin; node && node !== document.body && node !== document.documentElement; node = node.parentElement) {
        const style = getComputedStyle(node);
        const scrollable = /(auto|scroll|overlay)/.test(style.overflowY) && node.scrollHeight > node.clientHeight + 1;
        const horizontal = /(auto|scroll|overlay)/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
        if (horizontal || (scrollable && (style.overscrollBehaviorY !== "auto"
          || (event.deltaY < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1)))) {
          stop();
          return;
        }
      }

      if (!frame) current = target = written = window.scrollY;
      const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const delta = Math.max(-window.innerHeight * .65, Math.min(window.innerHeight * .65, event.deltaY * units));
      // Reversing input should respond now, not finish the previous coast first.
      if ((target - current) * delta < 0) target = current;
      const backlog = window.innerHeight * 1.2;
      const next = clamp(Math.max(current - backlog, Math.min(current + backlog, target + delta)));
      if (Math.abs(next - current) < .5 && !frame) return;
      event.preventDefault();
      target = next;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const nativeScroll = () => {
      if (frame && Math.abs(window.scrollY - written) > 2) stop();
      else if (!frame) current = target = written = window.scrollY;
    };
    const keyDown = (event: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Tab", "Escape"].includes(event.key)) stop();
    };

    window.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("scroll", nativeScroll, { passive: true });
    window.addEventListener("keydown", keyDown);
    window.addEventListener("pointerdown", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("resize", stop);
    window.addEventListener("hashchange", stop);
    window.addEventListener("blur", stop);
    document.addEventListener("visibilitychange", stop);
    enabled.addEventListener("change", stop);
    return () => {
      stop();
      window.removeEventListener("wheel", wheel);
      window.removeEventListener("scroll", nativeScroll);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("resize", stop);
      window.removeEventListener("hashchange", stop);
      window.removeEventListener("blur", stop);
      document.removeEventListener("visibilitychange", stop);
      enabled.removeEventListener("change", stop);
    };
  }, [pathname]);
}
