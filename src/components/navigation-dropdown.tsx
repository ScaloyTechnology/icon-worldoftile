"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import styles from "./meet-icon-navigation.module.css";

export function NavigationDropdown({ label, href, items, upcoming = [], overviewLabel, mobile = false, index, onNavigate }: Readonly<{
  label: string;
  href: string;
  items: readonly { label: string; href: string }[];
  upcoming?: readonly string[];
  overviewLabel?: string;
  mobile?: boolean;
  index?: number;
  onNavigate?: () => void;
}>) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const panelId = `${href.replaceAll("/", "-")}-${mobile ? "mobile" : "desktop"}-links`;
  const current = pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);

  const navigate = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    setOpen(false);
    onNavigate?.();
    if (pathname === href.split("#")[0] && href.includes("#")) {
      event.preventDefault();
      // Re-selecting the same anchor must work as well as changing the hash.
      window.history.pushState(null, "", href);
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    }
  };

  const chevron = <svg className={styles.chevron} aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4" /></svg>;

  return <div ref={root} className={mobile ? styles.mobile : styles.desktop} data-open={open}
    onPointerEnter={event => {
      if (!mobile && event.pointerType === "mouse") setOpen(true);
    }}
    onPointerLeave={event => {
      if (!mobile && event.pointerType === "mouse" && !root.current?.contains(document.activeElement)) setOpen(false);
    }}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}
    onKeyDown={event => {
      if (event.key === "Escape" && open) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
    <div className={styles.triggerRow}>
      {mobile ? <button ref={toggle} type="button" className={styles.mobileTrigger}
        aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(value => !value)}>
        <span className="menu-index">{String((index ?? 0) + 1).padStart(2, "0")}</span>
        <span>{label}</span>{chevron}
      </button> : <>
        <Link href={href} aria-current={current ? "page" : undefined} onClick={event => navigate(event, href)}>{label}</Link>
        <button ref={toggle} type="button" className={styles.desktopToggle}
          aria-label={`${label} sections`} aria-expanded={open} aria-controls={panelId}
          onClick={() => setOpen(value => !value)}>{chevron}</button>
      </>}
    </div>
    <ul className={styles.panel} id={panelId} hidden={!open}>
      {mobile && overviewLabel && <li><Link href={href} onClick={event => navigate(event, href)}>{overviewLabel}</Link></li>}
      {items.map(item => <li key={item.href}><Link href={item.href} aria-current={pathname === item.href ? "page" : undefined} onClick={event => navigate(event, item.href)}>{item.label}</Link></li>)}
      {upcoming.map(item => <li key={item}><span className={styles.upcoming} aria-disabled="true">
        <span>{item}</span><small>Coming soon</small>
      </span></li>)}
    </ul>
  </div>;
}
