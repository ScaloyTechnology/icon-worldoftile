"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { MeetIconContent } from "@/types/meet-icon";
import type { ContactUnit } from "@/types/contact-settings";
import { globalPresenceUnits } from "./global-presence-data";

const GlobalPresenceGlobe = dynamic(() => import("./global-presence-globe"), { ssr: false });

export function GlobalPresenceSection({ content, units }: Readonly<{ content: MeetIconContent["markets"]; units: readonly ContactUnit[] }>) {
  const presenceUnits = useMemo(() => globalPresenceUnits(units), [units]);
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
  const activeUnit = presenceUnits[activeIndex] ?? presenceUnits[0]!;

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setWebglAvailable(Boolean(window.WebGLRenderingContext));
    const stage = globeStage.current;
    if (!stage) return;
    const preloader = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) { setNearViewport(true); preloader.disconnect(); }
    }, { rootMargin: "3000px 0px" });
    const visibility = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)), { threshold: .02 });
    const eagerLoad = window.setTimeout(() => setNearViewport(true), 900);
    preloader.observe(stage);
    visibility.observe(stage);
    return () => { window.clearTimeout(eagerLoad); preloader.disconnect(); visibility.disconnect(); };
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

        <div className="meet-global__visual">
          <div className={`meet-global__stage${markerHovered ? " is-marker-hovered" : ""}`} ref={globeStage}>
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
            {!modelReady && webglAvailable && nearViewport ? <span className="meet-global__loading">PREPARING GLOBAL PRESENCE <i /></span> : null}
          </div>

          <div className="meet-global__locations">
            <div className="meet-global__location-heading"><span>{originVisible || !webglAvailable ? "GUJARAT / INDIA — ICON ORIGIN" : "ICON / GLOBAL PRESENCE"}</span><span>{!webglAvailable ? "VIEW VERIFIED LOCATIONS" : markerHovered ? "SELECT LOCATION" : "DRAG TO EXPLORE"}</span></div>
            <div className="meet-global__selector" role="group" aria-label="ICON manufacturing locations">
              {presenceUnits.map((unit, index) => (
                <button key={unit.id} type="button" aria-pressed={activeIndex === index} aria-label={`Show ${unit.name} on the globe`} onClick={() => selectUnit(index)}>
                  <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 21s7-6.1 7-12A7 7 0 0 0 5 9c0 5.9 7 12 7 12Z" /><circle cx="12" cy="9" r="2.4" /></svg>
                  <strong>{unit.name.replace(" PVT. LTD.", "")}</strong>
                </button>
              ))}
            </div>
            <article className="meet-global__location-card" aria-live="polite">
              <span className="meet-global__location-index">{activeUnit.number} / MANUFACTURING UNIT</span>
              <h3>{activeUnit.name}</h3>
              <address>{activeUnit.addressLines.map((line, index) => <span key={`${index}-${line}`}>{line}</span>)}</address>
              <a href={activeUnit.mapUrl} target="_blank" rel="noreferrer">View verified map location <span aria-hidden="true">↗</span></a>
            </article>
            <a className="meet-global__credit" href="https://sketchfab.com/3d-models/earth-41fc80d85dfd480281f21b74b2de2faa" target="_blank" rel="noreferrer">Earth model: Akshat / CC BY 4.0</a>
          </div>
        </div>
      </div>
      <details className="meet-global__directory">
        <summary>Explore the {content.records.length} markets listed in ICON&apos;s company profile</summary>
        <ul>{content.records.map((record) => <li key={record.id}>{record.country}</li>)}</ul>
      </details>
    </section>
  );
}
