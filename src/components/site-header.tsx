"use client";
import Link from "next/link";
import Image from "next/image";
import { useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@/content/site";
import { Arrow } from "./arrow";

export function SiteHeader() {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  useEffect(() => { dialog.current?.close(); }, [pathname]);
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  useEffect(() => {
    const el = dialog.current;
    const unlock = () => { document.body.style.overflow = ""; };
    el?.addEventListener("close", unlock);
    return () => { el?.removeEventListener("close", unlock); unlock(); };
  }, []);
  return <header className="site-header">
    <Link className="wordmark" href="/" aria-label="ICON — World of Tile home"><Image src="/brand/icon-logo-horizontal.png" alt="ICON — World of Tile" width={2060} height={894} priority /></Link>
    <nav className="desktop-nav" aria-label="Main navigation">{navigation.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>{item.label}</Link>)}</nav>
    <Link href="/contact" className="header-contact">Get in touch <Arrow diagonal /></Link>
    <button ref={trigger} type="button" className="menu-trigger" aria-label="Open navigation" aria-haspopup="dialog" onClick={() => { dialog.current?.showModal(); document.body.style.overflow = "hidden"; }}><span /><span /></button>
    <dialog ref={dialog} className="mobile-menu" aria-labelledby="menu-title" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="menu-top"><span id="menu-title" className="eyebrow">Explore ICON</span><button type="button" onClick={close} aria-label="Close navigation" className="menu-close">Close ×</button></div>
      <nav aria-label="Mobile navigation">{[{ label: "Home", href: "/" }, ...navigation, { label: "Technical specs", href: "/technical-specs" }, { label: "Contact", href: "/contact" }].map((item, i) => <Link href={item.href} key={item.href} onClick={close}><span className="menu-index">0{i + 1}</span>{item.label}<Arrow diagonal /></Link>)}</nav>
      <p className="eyebrow">ICON — WORLD OF TILE</p>
    </dialog>
  </header>;
}
