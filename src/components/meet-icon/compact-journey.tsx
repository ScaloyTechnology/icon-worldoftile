"use client";

import { useEffect, useMemo, useRef } from "react";
import { loadGsap } from "@/animations/load-gsap";
import type { MeetIconContent } from "@/types/meet-icon";
import styles from "./compact-journey.module.css";

// Scroll distance, not wall-clock delays. One timeline owns every visual phase.
const SCROLL_PER_STEP_VH = 150;
const SCROLL_SCRUB_SECONDS = .28;
const INTRO_SCROLL_VH = 15;
const OUTRO_SCROLL_VH = 20;
const PHASE = {
  checkpoint: .32, year: .44, company: .78, location: .92,
  panel: 1.04, readable: 1.20, close: 1.50, complete: 1.70,
} as const;
const YEAR_REVEAL_DURATION = .24;
const DIGIT_STAGGER = .025;
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

export function CompactJourney({ content }: Readonly<{ content: MeetIconContent["journey"] }>) {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLOListElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const jumpRef = useRef<(index: number) => void>(() => {});
  const items = useMemo(() => content.items
    .filter(item => item.published && item.year !== null)
    .toSorted((a, b) => Number(a.year) - Number(b.year))
    .map(item => {
      const year = item.year!;
      const location = item.title.match(/\s+(\([^()]+\))$/)?.[1];
      return {
        ...item, year, location,
        name: location ? item.title.slice(0, -location.length).trim() : item.title,
        detail: item.message?.trim() || item.description,
      };
    }), [content.items]);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    const viewport = viewportRef.current;
    const list = timelineRef.current;
    if (!root || !stage || !viewport || !list || !items.length) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void loadGsap().then(({ gsap, ScrollTrigger }) => {
      if (disposed) return;
      const entries = Array.from(list.querySelectorAll<HTMLElement>("[data-journey-item]"));
      const buttons = entries.map(entry => entry.querySelector<HTMLButtonElement>("button")!);
      const cards = entries.map(entry => entry.querySelector<HTMLElement>("[data-journey-card]")!);
      const slots = entries.map(entry => entry.querySelector<HTMLElement>("[data-popup-slot]")!);
      const labels = entries.map(entry => entry.querySelector<HTMLElement>(`.${styles.label}`)!);
      const nodes = entries.map(entry => entry.querySelector<HTMLElement>("[data-journey-node]")!);
      const setProgress = gsap.quickSetter(progressRef.current!, "scaleX");
      const mobile = window.matchMedia("(max-width: 767px)");
      const intro = INTRO_SCROLL_VH / SCROLL_PER_STEP_VH * PHASE.complete;
      const total = intro + items.length * PHASE.complete + OUTRO_SCROLL_VH / SCROLL_PER_STEP_VH * PHASE.complete;
      let header = document.querySelector<HTMLElement>(".site-header");
      let refreshTimer = 0;
      let refreshPending = false;
      let selected = -1;
      const setProperty = (element: HTMLElement, name: string, value: string) => {
        if (element.style.getPropertyValue(name) !== value) element.style.setProperty(name, value);
      };
      const setFlag = (name: string, value: boolean) => {
        const next = String(value);
        if (root.dataset[name] !== next) root.dataset[name] = next;
      };
      const measure = () => {
        const currentHeader = document.querySelector<HTMLElement>(".site-header");
        if (currentHeader !== header) {
          if (header) resize.unobserve(header);
          header = currentHeader;
          if (header) resize.observe(header);
        }
        const viewportHeight = window.innerHeight;
        const headerHeight = header?.getBoundingClientRect().height;
        setProperty(root, "--journey-viewport-height", `${viewportHeight}px`);
        if (headerHeight) setProperty(root, "--journey-header-height", `${headerHeight}px`);
        const columns = mobile.matches ? 2 : 6;
        const width = viewport.clientWidth;
        // Read all geometry before writing any popup styles. Interleaving these
        // operations forces a fresh layout for every milestone on each refresh.
        const labelHeights = labels.map(label => label.offsetHeight);
        const geometry = entries.map((entry, index) => ({
          left: entry.offsetLeft, height: entry.clientHeight,
          nodeX: entry.offsetLeft + nodes[index]!.offsetLeft + nodes[index]!.offsetWidth / 2,
          width: slots[index]!.offsetWidth,
        }));
        entries.forEach((_entry, index) => {
          const slot = slots[index]!;
          if (mobile.matches) {
            slot.style.removeProperty("--popup-left");
            slot.style.removeProperty("--tail-left");
            slot.style.removeProperty("--popup-top");
            slot.style.removeProperty("--popup-max-height");
            return;
          }
          const rowStart = Math.floor(index / columns) * columns;
          const labelHeight = Math.max(...labelHeights.slice(rowStart, rowStart + columns));
          const popupTop = labelHeight + 12;
          const bounds = geometry[index]!;
          const left = clamp(bounds.nodeX - 18, 0, Math.max(0, width - bounds.width));
          setProperty(slot, "--popup-left", `${left - bounds.left}px`);
          setProperty(slot, "--tail-left", `${bounds.nodeX - left}px`);
          setProperty(slot, "--popup-top", `${popupTop}px`);
          setProperty(slot, "--popup-max-height", `${Math.max(60, bounds.height - popupTop - 16)}px`);
        });
      };
      const flushRefresh = () => {
        clearTimeout(refreshTimer);
        refreshTimer = 0;
        if (disposed || !refreshPending || ScrollTrigger.isScrolling()) return;
        if (ScrollTrigger.isRefreshing) {
          refreshTimer = window.setTimeout(flushRefresh, 160);
          return;
        }
        refreshPending = false;
        ScrollTrigger.refresh();
      };
      const scheduleRefresh = () => {
        if (disposed) return;
        refreshPending = true;
        clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(flushRefresh, 160);
      };
      const measuredSizes = new WeakMap<Element, string>();
      const resize = new ResizeObserver(changes => {
        let changed = false;
        for (const change of changes) {
          const size = `${Math.round(change.contentRect.width)}:${Math.round(change.contentRect.height)}`;
          const previous = measuredSizes.get(change.target);
          measuredSizes.set(change.target, size);
          if (previous !== undefined && previous !== size) changed = true;
        }
        if (changed) scheduleRefresh();
      });
      if (header) resize.observe(header);
      labels.forEach(label => resize.observe(label));
      const headerChanges = new MutationObserver(scheduleRefresh);
      const publicSite = root.closest(".public-site");
      if (publicSite) headerChanges.observe(publicSite, { childList: true });
      ScrollTrigger.addEventListener("refreshInit", measure);
      ScrollTrigger.addEventListener("scrollEnd", flushRefresh);
      window.addEventListener("resize", scheduleRefresh, { passive: true });
      document.fonts.addEventListener("loadingdone", scheduleRefresh);
      // Refresh when media above this section finishes changing document flow.
      const main = root.closest("main");
      const onMediaLoad = (event: Event) => {
        if (event.target instanceof Element
          && (root.compareDocumentPosition(event.target) & Node.DOCUMENT_POSITION_PRECEDING)) scheduleRefresh();
      };
      main?.addEventListener("load", onMediaLoad, true);
      const match = gsap.matchMedia();
      cleanup = () => {
        clearTimeout(refreshTimer);
        resize.disconnect();
        headerChanges.disconnect();
        ScrollTrigger.removeEventListener("refreshInit", measure);
        ScrollTrigger.removeEventListener("scrollEnd", flushRefresh);
        window.removeEventListener("resize", scheduleRefresh);
        document.fonts.removeEventListener("loadingdone", scheduleRefresh);
        main?.removeEventListener("load", onMediaLoad, true);
        match.revert();
        root.style.removeProperty("--journey-viewport-height");
        root.style.removeProperty("--journey-header-height");
        progressRef.current?.style.removeProperty("transform");
        delete root.dataset.started;
        delete root.dataset.closing;
        delete root.dataset.caption;
      };
      delete root.dataset.fallback;
      measure();
      match.add({ reduced: "(prefers-reduced-motion: reduce)", motion: "(prefers-reduced-motion: no-preference)" }, context => {
        const reduced = Boolean(context.conditions?.reduced);
        const sequence = gsap.timeline({ paused: true, defaults: { ease: "sine.inOut" } });
        const accessibilityStates = entries.map(() => "");
        const durationMarker = { value: 0 };
        sequence.to(durationMarker, { value: 1, duration: total, ease: "none" }, 0);
        gsap.set(slots, { autoAlpha: 0, y: reduced ? 0 : 12 });
        entries.forEach((entry, index) => {
          const start = intro + index * PHASE.complete;
          const fill = entry.querySelector<HTMLElement>(`.${styles.fill}`)!;
          const node = entry.querySelector<HTMLElement>("[data-journey-node]")!;
          const digits = entry.querySelectorAll<HTMLElement>(`.${styles.digit}`);
          const name = entry.querySelector<HTMLElement>(`.${styles.name}`)!;
          const location = entry.querySelector<HTMLElement>(`.${styles.location}`);
          gsap.set(fill, { scaleX: 0 });
          gsap.set(node, { opacity: .35, scale: reduced ? 1 : .7 });
          const hiddenDigits = { autoAlpha: 0, y: 0, yPercent: reduced ? 0 : 110 };
          const hiddenText = { autoAlpha: 0, y: reduced ? 0 : 8 };
          gsap.set(digits, hiddenDigits);
          gsap.set([name, ...(location ? [location] : [])], { autoAlpha: 0, y: reduced ? 0 : 8 });
          // Explicit starts survive invalidation/refresh at any scroll position.
          // Future tweens must not write their start values during construction.
          // Give the connector and masked numerals their own longer intervals.
          // Ease both ends of each reveal without adding more input catch-up.
          sequence.fromTo(fill, { scaleX: 0 }, { scaleX: 1, duration: PHASE.checkpoint, ease: "sine.inOut", immediateRender: false }, start)
            .fromTo(node, { opacity: .35, scale: reduced ? 1 : .7 }, { opacity: 1, scale: reduced ? 1 : 1.5, duration: PHASE.year - PHASE.checkpoint, immediateRender: false }, start + PHASE.checkpoint)
            .fromTo(digits, hiddenDigits, { autoAlpha: 1, y: 0, yPercent: 0, duration: YEAR_REVEAL_DURATION, stagger: reduced ? 0 : DIGIT_STAGGER, immediateRender: false }, start + PHASE.year)
            .fromTo(name, hiddenText, { autoAlpha: 1, y: 0, duration: PHASE.location - PHASE.company, immediateRender: false }, start + PHASE.company);
          if (location) sequence.fromTo(location, hiddenText, { autoAlpha: 1, y: 0, duration: PHASE.panel - PHASE.location, immediateRender: false }, start + PHASE.location);
          sequence.fromTo(slots[index]!, { autoAlpha: 0, y: reduced ? 0 : 12 }, { autoAlpha: 1, y: 0, duration: PHASE.readable - PHASE.panel, immediateRender: false }, start + PHASE.panel)
            // No other panel can open until this exit has fully completed.
            .fromTo(slots[index]!, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: reduced ? 0 : 12, duration: PHASE.complete - PHASE.close, immediateRender: false }, start + PHASE.close)
            .fromTo(node, { scale: reduced ? 1 : 1.5 }, { scale: 1, duration: PHASE.complete - PHASE.close, immediateRender: false }, start + PHASE.close);
        });
        const sync = () => {
          const position = sequence.time() - intro;
          let current = -1;
          entries.forEach((entry, index) => {
            const local = position - index * PHASE.complete;
            const revealed = local >= PHASE.year;
            const panelOpen = local >= PHASE.panel && local < PHASE.complete;
            const state = local >= PHASE.complete ? "done" : local >= PHASE.checkpoint ? "active" : "hidden";
            const accessibilityState = `${state}:${revealed}:${panelOpen}`;
            // The playhead updates every frame; DOM/accessibility states only
            // need writes when a milestone actually crosses a phase boundary.
            if (accessibilityStates[index] !== accessibilityState) {
              accessibilityStates[index] = accessibilityState;
              entry.dataset.state = state;
              labels[index]!.setAttribute("aria-hidden", String(!revealed));
              buttons[index]!.disabled = !revealed;
              buttons[index]!.setAttribute("aria-expanded", String(panelOpen));
              cards[index]!.setAttribute("aria-hidden", String(!panelOpen));
              cards[index]!.inert = !panelOpen;
            }
            if (local >= PHASE.checkpoint) current = index;
          });
          if (selected !== current) {
            if (selected >= 0) buttons[selected]?.removeAttribute("aria-current");
            selected = current;
            if (current >= 0) buttons[current]!.setAttribute("aria-current", "step");
            const number = Math.max(1, current + 1);
            if (counterRef.current) {
              counterRef.current.firstChild!.textContent = `${String(number).padStart(2, "0")} `;
              counterRef.current.setAttribute("aria-label", `Milestone ${number} of ${items.length}`);
            }
            if (captionRef.current) captionRef.current.textContent = current >= 0 ? `${items[current]!.year} — ${items[current]!.name}` : "";
          }
          // Update only the progress bar's transform, not an inherited custom
          // property that invalidates styles throughout the pinned section.
          setProgress(sequence.progress());
          setFlag("started", position >= PHASE.checkpoint);
          setFlag("closing", position >= items.length * PHASE.complete);
          setFlag("caption", current >= 0 && position - current * PHASE.complete >= PHASE.location);
        };
        sequence.eventCallback("onUpdate", sync);
        // Pin the outer section once. GSAP alone owns its spacer, range and
        // playback: no CSS sticky track, extra height, timers or progress lerp.
        const trigger = ScrollTrigger.create({
          id: "meet-icon-journey",
          trigger: root,
          animation: sequence,
          start: "top top",
          end: () => `+=${stage.clientHeight * (INTRO_SCROLL_VH + items.length * SCROLL_PER_STEP_VH + OUTRO_SCROLL_VH) / 100}`,
          pin: root,
          pinType: "fixed",
          pinSpacing: true,
          // Smooth wheel/touch input on the same playhead that owns the
          // connector, text, panels and counter. Reduced motion stays direct.
          scrub: reduced ? true : SCROLL_SCRUB_SECONDS,
          anticipatePin: 1,
          // Animation values are fixed. Only pin geometry needs refreshing;
          // invalidating every tween reinitializes text/panel transforms.
          invalidateOnRefresh: false,
          refreshPriority: 1,
          onRefresh: () => { measure(); sync(); },
          // A large scroll jump must not leave the animation catching up after
          // its section has unpinned. Ordinary in-section scrolling stays eased.
          onLeave: self => { self.getTween()?.progress(1); sequence.progress(1); },
          onLeaveBack: self => { self.getTween()?.progress(1); sequence.progress(0); },
        });
        jumpRef.current = index => {
          const progress = (intro + index * PHASE.complete + (PHASE.readable + PHASE.close) / 2) / total;
          window.scrollTo({ top: trigger.start + progress * (trigger.end - trigger.start), behavior: reduced ? "instant" : "smooth" });
        };
        sync();
        return () => {
          jumpRef.current = () => {};
          trigger.kill(true);
          sequence.kill();
        };
      }, root);
      scheduleRefresh();
    }).catch(() => {
      // An unavailable motion chunk must not hide the company's history.
      cleanup?.();
      cleanup = undefined;
      if (!disposed) {
        root.dataset.fallback = "true";
        root.querySelectorAll<HTMLElement>(`[data-journey-card], .${styles.label}`).forEach(element => {
          element.removeAttribute("aria-hidden");
          element.inert = false;
        });
      }
    });
    return () => { disposed = true; cleanup?.(); };
  }, [items]);
  if (!items.length) return null;

  return <section className={styles.journey} ref={rootRef} aria-labelledby="meet-journey-title" data-native-scroll>
    <div className={styles.stage} ref={stageRef}>
      <div className={styles.inner}>
        <header className={styles.heading}>
          <p className={styles.eyebrow}>{content.eyebrow}</p>
          <h2 id="meet-journey-title">{content.title}</h2>
        </header>
        <div className={styles.viewport} ref={viewportRef}>
          <ol className={styles.timeline} ref={timelineRef}>
            {items.map((item, index) => <li key={item.id} className={styles.item} data-journey-item
              data-state="hidden" data-final={index === items.length - 1}>
              <span className={styles.rail} aria-hidden="true" />
              <span className={styles.fill} aria-hidden="true" />
              <div className={styles.label} aria-hidden="true">
                <button type="button" className={styles.checkpoint} disabled
                  aria-label={item.year + " — " + item.title} aria-controls={`meet-journey-card-${item.id}`}
                  aria-expanded={false}
                  onClick={() => jumpRef.current(index)}>
                  <span className={styles.node} data-journey-node aria-hidden="true" />
                  <time className={styles.year} dateTime={item.year} aria-label={item.year}>
                    {Array.from(item.year).map((digit, digitIndex) => <span className={styles.digitMask} key={digitIndex} aria-hidden="true">
                      <span className={styles.digit}>{digit}</span>
                    </span>)}
                  </time>
                </button>
                <h3 className={styles.name}>{item.name}</h3>
                {item.location && <p className={styles.location}>{item.location}</p>}
              </div>
              <div className={styles.popupSlot} data-popup-slot><span className={styles.tail} aria-hidden="true" />
                <div className={styles.card} id={`meet-journey-card-${item.id}`} data-journey-card
                  role="region" tabIndex={0} aria-label={item.year + " — " + item.name} aria-hidden="true" inert>
                  <p className={styles.cardYear}>{item.year}</p>
                  <p className={styles.cardName}>{item.name}</p>
                  {item.location && <p className={styles.cardLocation}>{item.location}</p>}
                  {item.detail && <p className={styles.message}>{item.detail}</p>}
                </div>
              </div>
            </li>)}
          </ol>
        </div>
        <div className={styles.status}>
          <div className={styles.overall} aria-hidden="true"><span ref={progressRef} /></div>
          <span className={styles.counter} ref={counterRef} aria-label={`Milestone 1 of ${items.length}`}>
            {"01 "}<span>/ {String(items.length).padStart(2, "0")}</span>
          </span>
          <p className={styles.cue}>Scroll <span aria-hidden="true">↓</span></p>
          <p className={styles.closing} ref={captionRef} />
        </div>
      </div>
    </div>
  </section>;
}

