"use client";

import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { AdminIcon } from "./admin-icons";
import styles from "./admin-ui.module.css";

type Position = Readonly<{ left: number; top: number }>;

export function AdminActionMenu({ children, label = "Open actions" }: Readonly<{ children: ReactNode; label?: string }>) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 8, top: 8 });

  const place = () => {
    const button = buttonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const width = 176;
    setPosition({ left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)), top: rect.bottom + 6 });
  };

  const toggle = () => {
    if (!open) place();
    setOpen((current) => !current);
  };

  useLayoutEffect(() => {
    if (!open || !panelRef.current || window.innerWidth <= 640) return;
    const panel = panelRef.current.getBoundingClientRect();
    const button = buttonRef.current?.getBoundingClientRect();
    if (button && panel.bottom > window.innerHeight - 8) setPosition((current) => ({ ...current, top: Math.max(8, button.top - panel.height - 6) }));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!buttonRef.current?.contains(target) && !panelRef.current?.contains(target)) setOpen(false);
    };
    const closeOnKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); buttonRef.current?.focus(); } };
    const closeOnMove = () => setOpen(false);
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", closeOnKey);
    window.addEventListener("resize", closeOnMove);
    window.addEventListener("scroll", closeOnMove, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", closeOnKey);
      window.removeEventListener("resize", closeOnMove);
      window.removeEventListener("scroll", closeOnMove, true);
    };
  }, [open]);

  return <>
    <button aria-expanded={open} aria-haspopup="menu" aria-label={label} className={styles.actionTrigger} onClick={toggle} ref={buttonRef} type="button"><AdminIcon name="more" /></button>
    {open ? createPortal(<div className={styles.actionPopover} onClick={() => setOpen(false)} ref={panelRef} role="menu" style={{ left: position.left, top: position.top }}>{children}</div>, document.body) : null}
  </>;
}
