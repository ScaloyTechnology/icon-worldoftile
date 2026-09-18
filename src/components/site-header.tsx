"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { navigation } from "@/content/site";
import { Arrow } from "./arrow";

export function SiteHeader() {
  const header = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  useEffect(() => { dialog.current?.close(); }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      if (header.current) header.current.dataset.scrolled = window.scrollY > 24 ? "true" : "false";
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, []);

  useEffect(() => () => {
    if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
  }, []);

  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }

  return <header className="site-header" ref={header}>
    <Link className="wordmark" href="/" aria-label="ICON — World of Tile home">
      <Image src="/brand/icon-logo-horizontal.png" alt="ICON — World of Tile" width={2060} height={894} priority />
    </Link>
    <nav className="desktop-nav" aria-label="Main navigation">
      {navigation.map(item => <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>{item.label}</Link>)}
    </nav>
    <Link href="/contact" className="header-contact">Get in touch <span className="header-contact-icon"><Arrow diagonal /></span></Link>
    <button
      ref={trigger}
      type="button"
      className="menu-trigger"
      aria-label="Open navigation"
      aria-haspopup="dialog"
      aria-controls="site-navigation-dialog"
      aria-expanded={menuOpen}
      onClick={() => {
        if (!dialog.current || dialog.current.open) return;
        previousOverflow.current = document.body.style.overflow;
        dialog.current.showModal();
        document.body.style.overflow = "hidden";
        setMenuOpen(true);
      }}
    ><span /><span /></button>
    <dialog
      id="site-navigation-dialog"
      ref={dialog}
      className="mobile-menu"
      aria-labelledby="menu-title"
      onClose={() => {
        setMenuOpen(false);
        if (previousOverflow.current !== null) {
          document.body.style.overflow = previousOverflow.current;
          previousOverflow.current = null;
        }
      }}
      onClick={event => { if (event.target === event.currentTarget) close(); }}
    >
      <div className="menu-top">
        <span id="menu-title" className="eyebrow">Explore ICON</span>
        <button type="button" onClick={close} aria-label="Close navigation" className="menu-close">Close <span aria-hidden="true">×</span></button>
      </div>
      <nav aria-label="Mobile navigation">
        {[{ label: "Home", href: "/" }, ...navigation, { label: "Technical specs", href: "/technical-specs" }, { label: "Contact", href: "/contact" }].map((item, index) =>
          <Link href={item.href} key={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={close}>
            <span className="menu-index">{String(index + 1).padStart(2, "0")}</span>{item.label}<Arrow diagonal />
          </Link>
        )}
      </nav>
      <p className="eyebrow">ICON — WORLD OF TILE</p>
    </dialog>
  </header>;
}
