"use client";

import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import type { NavigationItem } from "@/types/navigation";
import type { SiteLogo } from "@/types/contact-settings";
import { Arrow } from "./arrow";

// Use the serialized server snapshot on the first client render too. Keeping
// a separate client import can mix old HTML with a new menu during refreshes.
export function SiteHeader({ logo, navigation }: Readonly<{ logo: SiteLogo; navigation: readonly NavigationItem[] }>) {
  // Applications is reached through Products, never through the header.
  // Apply this at render time too, including older serialized layout menus.
  const headerNavigation = navigation.filter(item =>
    item.label.trim().toLowerCase() !== "applications"
    && !/^\/applications(?:[/?#]|$)/.test(item.href),
  );
  const header = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const [sequenceVisibility, setSequenceVisibility] = useState({ pathname, complete: false });
  // Hidden in the server HTML too, so navigation cannot flash over the intro.
  const sequenceHidden = pathname === "/"
    && (sequenceVisibility.pathname !== pathname || !sequenceVisibility.complete);
  const isCurrent = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  useEffect(() => { dialog.current?.close(); }, [pathname]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const value = window.scrollY > 24 ? "true" : "false";
      const currentHeader = header.current;
      if (!currentHeader) return;
      const sequence = pathname === "/" ? document.querySelector<HTMLElement>("[data-frame-hero]") : null;
      const stage = sequence?.firstElementChild;
      // The sticky stage finishes when the section's bottom reaches its height.
      // Wait until content below it starts entering the viewport before revealing.
      const complete = pathname !== "/" || Boolean(sequence
        && sequence.getBoundingClientRect().bottom < Math.min(window.innerHeight, stage?.clientHeight || window.innerHeight));
      setSequenceVisibility(previous => previous.pathname === pathname && previous.complete === complete
        ? previous : { pathname, complete });
      if (!complete && dialog.current?.open) dialog.current.close();
      if (currentHeader.dataset.scrolled !== value) currentHeader.dataset.scrolled = value;

      const footer = document.querySelector<HTMLElement>(".site-footer");
      const footerBounds = footer?.getBoundingClientRect();
      const overlapsFooter = Boolean(
        footerBounds
        && footerBounds.top <= currentHeader.getBoundingClientRect().height
        && footerBounds.bottom > 0,
      );
      const footerTheme = overlapsFooter ? "dark" : "light";
      if (currentHeader.dataset.footerTheme !== footerTheme) currentHeader.dataset.footerTheme = footerTheme;
      const hero = document.querySelector<HTMLElement>("[data-home-hero]");
      const heroBounds = hero?.getBoundingClientRect();
      const heroTheme = heroBounds && heroBounds.top <= currentHeader.offsetHeight && heroBounds.bottom > currentHeader.offsetHeight / 2
        ? "dark" : "light";
      if (currentHeader.dataset.heroTheme !== heroTheme) currentHeader.dataset.heroTheme = heroTheme;
      // One tone controller for the fixed frame hero and the moved product hero.
      if (pathname === "/" || pathname === "/products") {
        const sampleY = Math.max(24, currentHeader.offsetHeight / 2);
        const section = Array.from(document.querySelectorAll<HTMLElement>("[data-home-header-tone], [data-header-theme]"))
          .find(element => {
            const bounds = element.getBoundingClientRect();
            return bounds.top <= sampleY && bounds.bottom > sampleY;
          });
        currentHeader.dataset.theme = section?.dataset.homeHeaderTone ?? section?.dataset.headerTheme ?? "light";
        if (section?.dataset.homeHeaderTreatment === "transparent") currentHeader.dataset.transparent = "true";
        else delete currentHeader.dataset.transparent;
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resize.disconnect();
      if (header.current) delete header.current.dataset.footerTheme;
      if (header.current) delete header.current.dataset.heroTheme;
      if (header.current && (pathname === "/" || pathname === "/products")) {
        delete header.current.dataset.theme;
        delete header.current.dataset.transparent;
      }
    };
  }, [pathname]);

  useEffect(() => () => {
    if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current;
  }, []);

  function close() {
    dialog.current?.close();
    trigger.current?.focus();
  }

  return <header className="site-header" data-sequence-hidden={sequenceHidden ? "true" : undefined} aria-hidden={sequenceHidden || undefined} inert={sequenceHidden} data-hero-theme={pathname === "/" || pathname === "/products" ? "dark" : undefined} ref={header}>
    <Link className="wordmark" href="/" aria-label="ICON — World of Tile home">
      <Image src={logo.src} alt={logo.alt} width={logo.width} height={logo.height} priority unoptimized={!logo.src.startsWith("/")} />
    </Link>
    <nav className="desktop-nav" aria-label="Main navigation">
      {headerNavigation.map(item => <Link key={item.href} href={item.href} aria-current={isCurrent(item.href) ? "page" : undefined}>{item.label}</Link>)}
    </nav>
    <Link href="/contact#contact-enquiry" className="header-contact">Get in touch <span className="header-contact-icon"><Arrow diagonal /></span></Link>
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
        {[{ label: "Home", href: "/" }, ...headerNavigation, { label: "Contact", href: "/contact" }].map((item, index) =>
          <Link href={item.href} key={item.href} aria-current={isCurrent(item.href) ? "page" : undefined} onClick={close}>
            <span className="menu-index">{String(index + 1).padStart(2, "0")}</span>{item.label}<Arrow diagonal />
          </Link>
        )}
      </nav>
      <p className="eyebrow">ICON — WORLD OF TILE</p>
    </dialog>
  </header>;
}
