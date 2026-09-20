"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

import type { MeetIconContent } from "@/types/meet-icon";
import { globalPresenceUnits } from "./global-presence-data";

const GlobalPresenceGlobe = dynamic(() => import("./global-presence-globe"), { ssr: false });

export function GlobalPresenceSection({ content }: Readonly<{ content: MeetIconContent["markets"] }>) {
  const globeStage = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [webglAvailable, setWebglAvailable] = useState(true);
  const [modelReady, setModelReady] = useState(false);
  const [markerHovered, setMarkerHovered] = useState(false);
  const [originVisible, setOriginVisible] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [focusRequest, setFocusRequest] = useState(0);
  const activeUnit = globalPresenceUnits[activeIndex] ?? globalPresenceUnits[0]!;

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setWebglAvailable(Boolean(window.WebGLRenderingContext));
    const stage = globeStage.current;
    if (!stage) return;
    const preloader = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setNearViewport(true); preloader.disconnect(); }
    }, { rootMargin: "350px 0px" });
    const visibility = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: .02 });
    preloader.observe(stage);
    visibility.observe(stage);
    return () => { preloader.disconnect(); visibility.disconnect(); };
  }, []);

  const selectUnit = useCallback((index: number) => {
    setActiveIndex(index);
    setFocusRequest((request) => request + 1);
  }, []);
  const selectMarker = useCallback(() => selectUnit(0), [selectUnit]);
  const setHovered = useCallback((hovered: boolean) => setMarkerHovered(hovered), []);
  const setOriginVisibility = useCallback((isVisible: boolean) => setOriginVisible(isVisible), []);
  const markReady = useCallback(() => setModelReady(true), []);
  const markFailed = useCallback(() => { setWebglAvailable(false); setModelReady(false); setMarkerHovered(false); }, []);

  return (
    <section className="meet-global" aria-labelledby="meet-markets-title">
      <div className="meet-global__layout">
        <header className="meet-global__intro">
          <p className="eyebrow meet-global__chapter">10 / OUR PRESENCE</p>
          <h2 id="meet-markets-title">One origin.<br /><em>More than 60 countries.</em></h2>
          <p>{content.description}</p>
          <div className="meet-global__stat" aria-label="Global presence across more than 60 countries">
            <strong>60<span>+</span></strong><span>Countries in ICON&apos;s<br />global network</span>
          </div>
        </header>

        <div className={`meet-global__stage${markerHovered ? " is-marker-hovered" : ""}`} ref={globeStage}>
          <div className={`meet-global__fallback${modelReady ? " is-behind" : ""}`} aria-hidden="true">
            <Image src="/assets/world-map-equal-earth.svg" alt="" fill sizes="(max-width: 900px) 100vw, 55vw" unoptimized />
          </div>
          {nearViewport && webglAvailable ? (
            <GlobalPresenceGlobe
              activeUnit={activeUnit}
              focusRequest={focusRequest}
              visible={visible}
              reducedMotion={reducedMotion}
              onMarkerSelect={selectMarker}
              onMarkerHover={setHovered}
              onOriginVisibilityChange={setOriginVisibility}
              onReady={markReady}
              onFailure={markFailed}
            />
          ) : null}
          <div className="meet-global__stage-caption"><span>{originVisible || !webglAvailable ? "GUJARAT / INDIA — ICON ORIGIN" : "ICON / GLOBAL PRESENCE"}</span><span>{!webglAvailable ? "VIEW VERIFIED LOCATIONS" : markerHovered ? "SELECT LOCATION" : "DRAG TO EXPLORE"}</span></div>
          {!modelReady && webglAvailable && nearViewport ? <span className="meet-global__loading">PREPARING GLOBAL PRESENCE <i /></span> : null}
          <a className="meet-global__credit" href="https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa" target="_blank" rel="noreferrer">Earth model: Akshat / CC BY 4.0</a>
        </div>

        <div className="meet-global__locations">
          <p className="eyebrow">THREE VERIFIED UNITS / GUJARAT</p>
          <div className="meet-global__selector" role="group" aria-label="ICON manufacturing locations">
            {globalPresenceUnits.map((unit, index) => (
              <button key={unit.id} type="button" aria-pressed={activeIndex === index} aria-label={`Show ${unit.name} on the globe`} onClick={() => selectUnit(index)}>
                <span>{unit.number}</span><strong>{unit.name.replace(" PVT. LTD.", "")}</strong>
              </button>
            ))}
          </div>
          <article className="meet-global__location-card" aria-live="polite">
            <span className="meet-global__location-index">{activeUnit.number} / MANUFACTURING UNIT</span>
            <h3>{activeUnit.name}</h3>
            <address>{activeUnit.addressLines.map((line) => <span key={line}>{line}</span>)}</address>
            <a href={activeUnit.mapUrl} target="_blank" rel="noreferrer">View verified map location <span aria-hidden="true">↗</span></a>
          </article>
        </div>
      </div>
      <details className="meet-global__directory">
        <summary>Explore the {content.records.length} markets listed in ICON&apos;s company profile</summary>
        <ul>{content.records.map((record) => <li key={record.id}>{record.country}</li>)}</ul>
      </details>
    </section>
  );
}
