"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandMark } from "@/components/layout/brand-mark";
import { Container } from "@/components/ui/container";
import { primaryNavigation } from "@/constants/site";

function isActiveRoute(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateHeader = () => setIsScrolled(window.scrollY > 28);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    return () => window.removeEventListener("scroll", updateHeader);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const menu = menuRef.current;
    const menuButton = menuButtonRef.current;
    const links = menu
      ? Array.from(menu.querySelectorAll<HTMLElement>("a[href]"))
      : [];
    const focusableElements = menuButton ? [menuButton, ...links] : links;
    const animationFrame = window.requestAnimationFrame(() =>
      links[0]?.focus(),
    );

    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
        menuButton?.focus();
        return;
      }

      if (event.key !== "Tab" || focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    const closeOnDesktop = () => {
      if (window.innerWidth >= 1280) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", closeOnDesktop);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [isMenuOpen]);

  const usesDarkHero =
    pathname === "/" || pathname === "/meet-icon" || pathname === "/products";
  const isTransparent = usesDarkHero && !isScrolled && !isMenuOpen;
  const usesDarkText = !isTransparent && !isMenuOpen;

  return (
    <>
      <header
        className={`sticky top-0 z-[70] h-[var(--header-height)] border-b transition-[background-color,color,border-color] duration-500 ${
          usesDarkText
            ? "border-border bg-background/95 text-foreground backdrop-blur-md"
            : "border-transparent bg-transparent text-on-dark"
        }`}
      >
        <Container className="flex h-full items-center" size="wide">
          <BrandMark onClick={() => setIsMenuOpen(false)} />

          <nav
            aria-label="Primary navigation"
            className="ml-auto hidden xl:block"
          >
            <ul className="flex items-center gap-6 2xl:gap-8">
              {primaryNavigation.map((item) => {
                const isActive = isActiveRoute(pathname, item.href);

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`nav-link type-nav transition-opacity hover:opacity-65 ${
                        isActive ? "opacity-100" : "opacity-78"
                      }`}
                      href={item.href}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <button
            aria-controls="mobile-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Close navigation" : "Open navigation"}
            className="type-nav ml-auto inline-flex min-h-11 min-w-11 items-center justify-end gap-3 xl:hidden"
            onClick={() => setIsMenuOpen((open) => !open)}
            ref={menuButtonRef}
            type="button"
          >
            <span>{isMenuOpen ? "Close" : "Menu"}</span>
            <span aria-hidden="true" className="grid w-4 gap-1">
              <span
                className={`block h-px w-full bg-current transition-transform ${
                  isMenuOpen ? "translate-y-[2.5px] rotate-45" : ""
                }`}
              />
              <span
                className={`block h-px w-full bg-current transition-transform ${
                  isMenuOpen ? "-translate-y-[2.5px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </Container>
      </header>

      {isMenuOpen ? (
        <div
          className="mobile-menu-enter fixed inset-0 z-[60] overflow-y-auto bg-surface-dark pt-[var(--header-height)] text-on-dark xl:hidden"
          id="mobile-navigation"
          ref={menuRef}
        >
          <Container className="flex min-h-full flex-col py-8" size="wide">
            <p className="type-label text-on-dark-muted" id="mobile-menu-title">
              Navigation
            </p>
            <nav aria-label="Mobile navigation" className="my-auto py-7">
              <ul className="divide-y divide-on-dark/15 border-y border-on-dark/15">
                {primaryNavigation.map((item, index) => {
                  const isActive = isActiveRoute(pathname, item.href);

                  return (
                    <li
                      className="mobile-menu-link-enter"
                      key={item.href}
                      style={{ "--menu-index": index } as CSSProperties}
                    >
                      <Link
                        aria-current={isActive ? "page" : undefined}
                        className="flex min-h-15 items-center justify-between gap-8 py-2 text-[clamp(1.35rem,5vw,2rem)] leading-none"
                        href={item.href}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="font-display">{item.label}</span>
                        <span
                          aria-hidden="true"
                          className="type-caption text-on-dark-muted"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <p className="type-caption text-on-dark-muted">
              Architectural surfaces for contemporary spaces
            </p>
          </Container>
        </div>
      ) : null}
    </>
  );
}
