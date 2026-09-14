"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { Component, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Arrow } from "@/components/arrow";
import type { HomepageExperienceData } from "@/lib/products/homepage-types";
import type { HeroStage } from "@/lib/animation/homepage-hero-timeline";
import { wallSlots } from "@/lib/animation/material-choreography";
import { getTileProportions } from "@/lib/products/material-settings";

const HeroTileStage = dynamic(() => import("@/components/three/hero-tile-stage"), { ssr: false, loading: () => null });

class WebGLErrorBoundary extends Component<{ children: React.ReactNode; onFallback: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFallback(); }
  render() { return this.state.failed ? null : this.props.children; }
}

function canUseWebGL() {
  try {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    if (connection?.saveData || (memory && memory <= 4) || navigator.hardwareConcurrency <= 4 || window.innerWidth < 900) return false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch { return false; }
}

function JourneyImage({ src, alt, priority = false, sizes = "100vw" }: { src: string; alt: string; priority?: boolean; sizes?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} preload={priority} unoptimized={src.startsWith("https://")} style={{ objectFit: "cover" }} />;
}

export function HeroScrollExperience({ data }: { data: HomepageExperienceData }) {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const controller = useRef<{ kill: () => void; refresh: () => void } | null>(null);
  const [webglAllowed, setWebglAllowed] = useState(false);
  const [sceneActive, setSceneActive] = useState(false);
  const [sceneState, setSceneState] = useState<"disabled" | "loading" | "ready" | "fallback">("disabled");
  const [debug, setDebug] = useState(false);
  const [debugData, setDebugData] = useState({ progress: 0, stage: "intro" as HeroStage });

  const updateSceneState = useCallback((state: "loading" | "ready" | "fallback") => {
    setSceneState(state);
    if (root.current) root.current.dataset.webgl = state;
    if (state === "ready") requestAnimationFrame(() => controller.current?.refresh());
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const allowed = data.config.enable3DHero && !reduced && canUseWebGL();
      setWebglAllowed(allowed);
      setSceneState(allowed ? "loading" : "disabled");
      if (process.env.NODE_ENV === "development") setDebug(new URLSearchParams(window.location.search).get("heroDebug") === "1");
    });
    return () => cancelAnimationFrame(frame);
  }, [data.config.enable3DHero]);

  useEffect(() => {
    if (!webglAllowed || !root.current) return;
    const observer = new IntersectionObserver(entries => setSceneActive(entries[0]?.isIntersecting ?? false), { rootMargin: "35% 0px" });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [webglAllowed]);

  useLayoutEffect(() => {
    const element = root.current;
    if (!element || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (element) element.dataset.motion = "reduced";
      return;
    }
    let disposed = false;
    let context: { revert: () => void } | undefined;
    Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("@/lib/animation/homepage-hero-timeline")]).then(([{ gsap }, { ScrollTrigger }, { buildHomepageHeroTimeline }]) => {
      if (disposed) return;
      element.classList.add("is-hero-enhanced");
      gsap.registerPlugin(ScrollTrigger);
      context = gsap.context(() => {
        controller.current = buildHomepageHeroTimeline({ gsap, root: element, mobile: window.innerWidth < 768, onProgress: (value, stage) => {
          progress.current = value;
          if (process.env.NODE_ENV === "development" && element.dataset.debug === "true") setDebugData({ progress: value, stage });
        } });
      }, element);
    }).catch(() => { element.classList.remove("is-hero-enhanced"); element.dataset.motion = "fallback"; });
    return () => { disposed = true; controller.current?.kill(); controller.current = null; context?.revert(); element.classList.remove("is-hero-enhanced"); };
  }, []);

  useEffect(() => { if (root.current) root.current.dataset.debug = debug ? "true" : "false"; }, [debug]);

  const shape = getTileProportions(data.hero.widthMm, data.hero.heightMm, data.hero.thicknessMm, (data.hero.texture.width ?? 2) / (data.hero.texture.height ?? 1));
  return <div ref={root} className="hero-journey" data-tile-aspect={shape.width / shape.height} data-stage="intro" data-webgl={sceneState} data-collections-active="false">
    <div className="hero-journey-viewport" data-journey-viewport>
      <section className="hero journey-hero" aria-labelledby="hero-heading" data-hero-room>
        <div className="hero-visual journey-room-image" data-hero-room-image><JourneyImage src={data.hero.room.url} alt={data.hero.room.alt} priority /></div>
        <div className="hero-shade" data-hero-shade />
        <div className="hero-copy" data-hero-copy><p className="eyebrow">{data.config.eyebrow}</p><h1 id="hero-heading">{data.config.heading.map(line => <span className="line-mask" key={line}><span data-hero-line>{line}</span></span>)}</h1><a href="#discover" className="text-link light">{data.config.cta}<span className="circle"><Arrow diagonal /></span></a></div>
        <div className="hero-bottom" data-hero-bottom><span>01 / MATERIAL & SPACE</span><a href="#discover">Scroll to discover <span>↓</span></a><span>ICON — WORLD OF TILE</span></div>
      </section>

      <section id="discover" className="journey-discover" aria-labelledby="discover-heading" data-journey-discover>
        <p className="eyebrow">01 — Discover ICON</p><h2 id="discover-heading">Every space begins<br />with a surface.</h2><p>Architecture becomes material. Material becomes a system of possibilities.</p><Link href="/meet-icon" className="text-link light">Meet ICON <Arrow diagonal /></Link>
      </section>

      <div className="tile-isolate" data-tile-isolate aria-hidden="true" style={{ aspectRatio: shape.width / shape.height }}>
        <div className="tile-study-cluster" data-tile-proxy>
          {[data.wallTiles[0]?.texture.url, data.hero.texture.url, data.wallTiles[1]?.texture.url].filter((url): url is string => Boolean(url)).map((url, index) => (
            <div className={`tile-proxy tile-proxy--${index + 1}`} key={`${url}-${index}`} style={{ backgroundImage: `url(${url})` }}>
              <span className="tile-edge tile-edge-right" /><span className="tile-edge tile-edge-bottom" />
            </div>
          ))}
        </div>
        <span className="tile-study-label">{data.hero.collection?.name ?? "Material study"}</span>
      </div>
      <div className="hero-webgl-stage" data-webgl-stage aria-hidden="true">
        {webglAllowed && sceneActive && sceneState !== "fallback" && <WebGLErrorBoundary onFallback={() => updateSceneState("fallback")}><HeroTileStage progress={progress} hero={data.hero} wallTiles={data.wallTiles} active={sceneActive} onState={updateSceneState} /></WebGLErrorBoundary>}
      </div>
      <div className="tile-wall" data-tile-wall aria-hidden="true">{data.wallTiles.slice(0, 6).map((item, index) => { const slot = wallSlots[index]; if (!slot) return null; return <span key={item.id} data-tile-piece data-side={slot.side} data-texture={item.texture.url} style={{ gridColumn: `${slot.x + 1} / span ${slot.w}`, gridRow: `${slot.y + 1} / span ${slot.h}` }}><span className={slot.h > slot.w ? "wall-face portrait" : "wall-face"} style={{ backgroundImage: `url(${item.texture.url})` }} /></span>; })}</div>

      <section id="collections" className="section collections journey-collections" aria-labelledby="collections-heading" data-journey-collections>
        <div className="section-heading" data-collections-heading><div><p className="eyebrow">02 — Featured collections</p><h2 id="collections-heading">A material point of view.</h2></div><Link href="/products" className="text-link">Explore collections<Arrow diagonal /></Link></div>
        {data.collections.length > 0 ? <div className="collection-track">{data.collections.map((item, index) => <article className="collection" key={item.id} data-collection-card><Link href={`/products?collection=${encodeURIComponent(item.slug)}`} className="image-link" aria-label={`Explore ${item.name}`}><div className="editorial-image"><JourneyImage src={item.image.url} alt={item.image.alt} sizes="(max-width: 760px) 86vw, 48vw" /></div></Link><div className="collection-caption"><div><p className="eyebrow">{String(index + 1).padStart(2, "0")} / COLLECTION</p><h3>{item.name}</h3>{item.description && <p>{item.description}</p>}</div></div></article>)}</div> : <div className="collections-empty"><p>New material stories are being prepared.</p><Link href="/products" className="text-link">Explore all products <Arrow /></Link></div>}
      </section>
    </div>
    {debug && <output className="hero-debug" aria-live="off"><span>{debugData.stage}</span><span>{Math.round(debugData.progress * 100)}%</span><span>{data.hero.label}</span><span>{sceneState}</span></output>}
  </div>;
}
