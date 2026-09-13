"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/** One delegated, frame-coalesced pointer stream; never replaces the native cursor. */
export function PointerExperience() {
  const followerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const follower = followerRef.current;
    if (!follower) return;
    const query = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    let frame = 0;
    let magnetic: HTMLElement | null = null;
    let point = { x: 0, y: 0, target: null as Element | null };
    const resetMagnetic = () => {
      magnetic?.style.removeProperty("translate");
      magnetic = null;
    };
    const hide = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      follower.dataset.visible = "false";
      resetMagnetic();
    };
    const render = () => {
      frame = 0;
      if (!query.matches || !point.target || document.querySelector("dialog[open], [aria-modal='true']")) { hide(); return; }
      const target = point.target.closest<HTMLElement>("[data-cursor], a:has(.media-frame)");
      const label = target?.dataset.cursor ?? (target ? "View" : "");
      follower.textContent = label;
      follower.dataset.context = label ? "true" : "false";
      follower.dataset.visible = "true";
      follower.style.transform = `translate3d(${point.x + 18}px, ${point.y + 18}px, 0)`;
      const next = point.target.closest<HTMLElement>("[data-magnetic]");
      if (next !== magnetic) { resetMagnetic(); magnetic = next; }
      if (magnetic) {
        const bounds = magnetic.getBoundingClientRect();
        const x = Math.max(-5, Math.min(5, (point.x - bounds.left - bounds.width / 2) * 0.06));
        const y = Math.max(-4, Math.min(4, (point.y - bounds.top - bounds.height / 2) * 0.08));
        magnetic.style.translate = `${x}px ${y}px`;
      }
    };
    const move = (event: PointerEvent) => {
      if (!query.matches || event.pointerType !== "mouse") { hide(); return; }
      point = { x: event.clientX, y: event.clientY, target: event.target instanceof Element ? event.target : null };
      if (!frame) frame = requestAnimationFrame(render);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Tab") hide(); };
    document.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", hide);
    document.addEventListener("keydown", key);
    window.addEventListener("scroll", hide, { passive: true });
    window.addEventListener("blur", hide);
    query.addEventListener("change", hide);
    return () => {
      hide();
      document.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", hide);
      document.removeEventListener("keydown", key);
      window.removeEventListener("scroll", hide);
      window.removeEventListener("blur", hide);
      query.removeEventListener("change", hide);
    };
  }, [pathname]);

  return <div aria-hidden="true" className="pointer-follower" data-visible="false" ref={followerRef} />;
}
