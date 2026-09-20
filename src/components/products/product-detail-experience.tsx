"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Arrow } from "@/components/arrow";
import type { ProductLightMode, ProductView } from "@/components/products/product-detail-stage";
import type { ProductDetailData } from "@/types/product-detail";
import styles from "./product-detail.module.css";

const ProductDetailStage = dynamic(() => import("./product-detail-stage"), { ssr: false, loading: () => null });

function supportsWebGL() {
  try {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (connection?.saveData || window.matchMedia("(prefers-reduced-motion: reduce)").matches || window.innerWidth < 820) return false;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    context?.getExtension("WEBGL_lose_context")?.loseContext();
    return Boolean(context);
  } catch { return false; }
}

function values(values: readonly string[]) {
  return values.length ? values.join(" / ") : null;
}

export function ProductDetailExperience({ data }: Readonly<{ data: ProductDetailData }>) {
  const mainRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const surfaceRef = useRef<HTMLButtonElement>(null);
  const lensFrame = useRef(0);
  const [canUse3D, setCanUse3D] = useState(false);
  const [heroActive, setHeroActive] = useState(true);
  const [sceneState, setSceneState] = useState<"loading" | "ready" | "fallback">("loading");
  const [activeSize, setActiveSize] = useState(data.sizes[0]?.label ?? null);
  const [activeFinish, setActiveFinish] = useState(data.product.finishes[0] ?? null);
  const [lightMode, setLightMode] = useState<ProductLightMode>("neutral");
  const [view, setView] = useState<ProductView>("angle");
  const [surfaceZoomed, setSurfaceZoomed] = useState(false);
  const selectedSize = data.sizes.find((size) => size.label === activeSize) ?? data.sizes[0] ?? null;
  const hasScene = canUse3D && sceneState !== "fallback" && Boolean(data.inspectorTextureSrc);

  const onSceneState = useCallback((state: "loading" | "ready" | "fallback") => setSceneState(state), []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setCanUse3D(supportsWebGL()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;
    const observer = new IntersectionObserver(([entry]) => setHeroActive(entry?.isIntersecting ?? false), { rootMargin: "22% 0px" });
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const root = mainRef.current;
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!root || !header) return;
    let frame = 0;
    const sync = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sampleY = Math.min(header.offsetHeight / 2, window.innerHeight / 2);
        const dark = Array.from(root.querySelectorAll<HTMLElement>("[data-header-theme='dark']")).some((section) => {
          const rect = section.getBoundingClientRect();
          return rect.top <= sampleY && rect.bottom > sampleY;
        });
        header.dataset.theme = dark ? "dark" : "light";
      });
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      delete header.dataset.theme;
    };
  }, []);

  useEffect(() => {
    const root = mainRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add(styles.motionReady!);
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add(styles.revealVisible!);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -10%", threshold: 0.08 });
    root.querySelectorAll("[data-detail-reveal]").forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  const enquiryHref = useMemo(() => {
    const query = new URLSearchParams({ product: data.product.name, slug: data.product.slug });
    if (activeSize) query.set("size", activeSize);
    if (activeFinish) query.set("finish", activeFinish);
    return `/contact?${query.toString()}`;
  }, [activeFinish, activeSize, data.product.name, data.product.slug]);

  const moveLens = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch") return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const pointerX = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
    const pointerY = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    cancelAnimationFrame(lensFrame.current);
    lensFrame.current = requestAnimationFrame(() => {
      const image = element.querySelector("img");
      const lens = element.querySelector<HTMLElement>(`.${styles.lens}`);
      if (!image || !lens || !image.naturalWidth || !image.naturalHeight) return;

      const zoom = 2;
      const coverScale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
      const renderedWidth = image.naturalWidth * coverScale;
      const renderedHeight = image.naturalHeight * coverScale;
      const cropLeft = (renderedWidth - rect.width) / 2;
      const cropTop = (renderedHeight - rect.height) / 2;
      const radius = lens.offsetWidth / 2;
      const inset = 10;
      const lensLeft = Math.max(radius + inset, Math.min(rect.width - radius - inset, pointerX));
      const lensTop = Math.max(radius + inset, Math.min(rect.height - radius - inset, pointerY));

      lens.style.left = `${lensLeft}px`;
      lens.style.top = `${lensTop}px`;
      lens.style.backgroundSize = `${renderedWidth * zoom}px ${renderedHeight * zoom}px`;
      lens.style.backgroundPosition = `${radius - (pointerX + cropLeft) * zoom}px ${radius - (pointerY + cropTop) * zoom}px`;
      element.dataset.lensActive = "true";
    });
  };

  const toggleSurfaceZoom = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === "touch" || event.pointerType === "pen") {
      setSurfaceZoomed((current) => !current);
    }
  };

  const mediaAspect = selectedSize ? selectedSize.widthMm / selectedSize.heightMm : data.imageAspect;
  const heroMetadata = [activeSize, activeFinish, values(data.product.surfaces), values(data.product.colors)].filter(Boolean);

  return <main className={styles.page} id="main" ref={mainRef}>
    <section className={styles.hero} ref={heroRef} data-header-theme="dark" aria-labelledby="product-title">
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <Link className={styles.backLink} href="/products"><Arrow /> Product library</Link>
        <p className="eyebrow">{data.collectionName ?? data.product.category}</p>
        <h1 id="product-title">{data.product.name}</h1>
        {heroMetadata.length ? <p className={styles.heroMeta}>{heroMetadata.join(" / ")}</p> : null}
        <p className={styles.heroDescription}>{data.description}</p>
        <div className={styles.heroActions}>
          <a href="#surface">Explore surface <Arrow diagonal /></a>
          <Link href={enquiryHref}>Add to enquiry <Arrow /></Link>
        </div>
      </div>

      <div className={styles.stage} data-scene-state={sceneState}>
        <div className={`${styles.staticSlab}${sceneState === "ready" && canUse3D ? ` ${styles.staticSlabHidden}` : ""}`} style={{ aspectRatio: mediaAspect }}>
          {data.product.primaryMedia.src ? <Image alt={data.product.primaryMedia.alt} fill priority quality={95} sizes="(max-width: 819px) 88vw, 58vw" src={data.product.primaryMedia.src} style={{ objectFit: "cover" }} unoptimized={!data.product.primaryMedia.src.startsWith("/")} /> : null}
          <span aria-hidden="true" />
        </div>
        {hasScene && data.inspectorTextureSrc ? <ProductDetailStage
          active={heroActive}
          alt={`${data.product.name} interactive tile sample`}
          finish={activeFinish}
          heightMm={selectedSize?.heightMm ?? null}
          imageAspect={data.imageAspect}
          lightMode={lightMode}
          onState={onSceneState}
          src={data.inspectorTextureSrc}
          thicknessMm={data.thicknessMm}
          view={view}
          widthMm={selectedSize?.widthMm ?? null}
        /> : null}
        {canUse3D && sceneState === "loading" ? <span className={styles.sceneLoader}>Preparing material</span> : null}
      </div>

      <div className={styles.inspector}>
        <fieldset><legend>Light</legend>{(["neutral", "warm", "cool"] as const).map((mode) => <button aria-pressed={lightMode === mode} key={mode} onClick={() => setLightMode(mode)} type="button">{mode}</button>)}</fieldset>
        {canUse3D ? <fieldset><legend>View</legend>{(["angle", "front", "edge"] as const).map((mode) => <button aria-pressed={view === mode} key={mode} onClick={() => setView(mode)} type="button">{mode}</button>)}</fieldset> : null}
        <p>{canUse3D ? "Drag the sample to inspect its surface and edge." : "A controlled material view is shown for this device."}</p>
      </div>
      <span className={styles.heroIndex}>01 / Product identity</span>
    </section>

    <aside className={styles.actionRail} aria-label="Product actions">
      <span>{data.product.name}</span><a href="#details">Details</a><a href="#technical">Technical</a>
      {data.documents[0] ? <a href={data.documents[0].href}>Download</a> : null}<Link href={enquiryHref}>Enquire</Link>
    </aside>

    <section className={styles.surface} id="surface" data-detail-reveal aria-labelledby="surface-title">
      <div className={styles.sectionIntro}><p className="eyebrow">02 / Surface inspection</p><h2 id="surface-title">Explore the surface.</h2><p>Move across the material study to examine its grain, veining and tonal detail. Tap the image on smaller screens to change scale.</p></div>
      <button
        ref={surfaceRef}
        type="button"
        className={`${styles.surfaceViewport}${surfaceZoomed ? ` ${styles.surfaceZoomed}` : ""}`}
        aria-label={`${surfaceZoomed ? "Reset" : "Magnify"} ${data.product.name} surface`}
        aria-pressed={surfaceZoomed}
        onClick={(event) => { if (event.detail === 0) setSurfaceZoomed((current) => !current); }}
        onPointerMove={moveLens}
        onPointerUp={toggleSurfaceZoom}
        onPointerLeave={(event) => { event.currentTarget.dataset.lensActive = "false"; }}
      >
        {data.detailMedia.src ? <Image alt={data.detailMedia.alt} fill quality={95} sizes="(max-width: 760px) 100vw, 78vw" src={data.detailMedia.src} style={{ objectFit: "cover" }} unoptimized={!data.detailMedia.src.startsWith("/")} /> : null}
        <span className={styles.lens} aria-hidden="true" style={{ backgroundImage: data.detailMedia.src ? `url(${data.detailMedia.src})` : undefined }} />
        <span className={styles.surfaceHint}>Move to inspect / Tap to zoom</span>
      </button>
    </section>

    {data.sizes.length > 1 ? <section className={styles.sizeExplorer} data-detail-reveal aria-labelledby="size-title">
      <div className={styles.sectionIntro}><p className="eyebrow">03 / Proportion</p><h2 id="size-title">Available sizes.</h2><p>Select a verified format. The material object changes proportion without reloading the scene.</p></div>
      <div className={styles.sizeLayout}>
        <div className={styles.sizeOutlines} aria-hidden="true">{data.sizes.slice(0, 3).map((size) => {
          const largest = Math.max(...data.sizes.map((item) => item.widthMm * item.heightMm));
          const width = 38 + Math.sqrt((size.widthMm * size.heightMm) / largest) * 58;
          return <span className={activeSize === size.label ? styles.activeOutline : ""} key={size.label} style={{ aspectRatio: size.widthMm / size.heightMm, width: `${width}%` }}><i>{size.label}</i></span>;
        })}</div>
        <div className={styles.sizeOptions} role="group" aria-label="Select tile size">{data.sizes.map((size, index) => <button aria-pressed={activeSize === size.label} key={size.label} onClick={() => setActiveSize(size.label)} type="button"><span>{String(index + 1).padStart(2, "0")}</span>{size.label}</button>)}</div>
      </div>
    </section> : null}

    {data.product.finishes.length > 1 ? <section className={styles.finishSelector} data-detail-reveal aria-labelledby="finish-title">
      <div><p className="eyebrow">04 / Material response</p><h2 id="finish-title">Finish and light.</h2></div>
      <div role="group" aria-label="Select finish">{data.product.finishes.map((finish) => <button aria-pressed={activeFinish === finish} key={finish} onClick={() => setActiveFinish(finish)} type="button">{finish}</button>)}</div>
    </section> : null}

    {data.details.length ? <section className={styles.details} id="details" data-detail-reveal aria-labelledby="details-title">
      <header><p className="eyebrow">05 / Product information</p><h2 id="details-title">Material identity.</h2></header>
      <dl>{data.details.map((item, index) => <div key={item.label}><span>{String(index + 1).padStart(2, "0")}</span><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl>
    </section> : null}

    {data.applicationMedia?.src ? <section className={styles.application} data-header-theme="dark" data-detail-reveal aria-labelledby="application-title">
      <div className={styles.applicationMedia}><Image alt={data.applicationMedia.alt} fill quality={95} sizes="100vw" src={data.applicationMedia.src} style={{ objectFit: "cover" }} unoptimized={!data.applicationMedia.src.startsWith("/")} /></div>
      <div className={styles.applicationShade} aria-hidden="true" />
      <div className={styles.applicationCopy}><p className="eyebrow">06 / Material in context</p><h2 id="application-title">See it in space.</h2><p>This client-supplied architectural preview shows the material as part of a complete environment.</p>{data.product.applications.length ? <span>{data.product.applications.join(" / ")}</span> : null}</div>
    </section> : null}

    {data.specifications.length ? <section className={styles.technical} id="technical" data-detail-reveal aria-labelledby="technical-title">
      <header><p className="eyebrow">07 / Verified data</p><h2 id="technical-title">Technical specifications.</h2></header>
      <ol>{data.specifications.map((item, index) => <li key={`${item.label}-${item.value}`}><span>{String(index + 1).padStart(2, "0")}</span><div><small>{item.label}</small><strong>{item.value}</strong></div></li>)}</ol>
    </section> : null}

    {data.documents.length ? <section className={styles.downloads} data-detail-reveal aria-labelledby="downloads-title"><p className="eyebrow">08 / Documents</p><h2 id="downloads-title">Product resources.</h2><div>{data.documents.map((document) => <a href={document.href} key={document.href}>{document.label}<Arrow diagonal /></a>)}</div></section> : null}

    <section className={styles.enquiry} data-header-theme="dark" data-detail-reveal aria-labelledby="enquiry-title">
      <p className="eyebrow">Material enquiry</p><h2 id="enquiry-title">Interested in this surface?</h2><p>Your selected product{activeSize ? ", size" : ""}{activeFinish ? " and finish" : ""} will be carried into the enquiry link.</p>
      <div><Link href={enquiryHref}>Add to enquiry <span><Arrow diagonal /></span></Link><Link href="/contact">Contact ICON <Arrow /></Link></div>
    </section>

    {data.relatedProducts.length ? <section className={styles.related} data-detail-reveal aria-labelledby="related-title">
      <header><p className="eyebrow">09 / Continue exploring</p><h2 className={styles.relatedTitle!} id="related-title">Related material directions.</h2></header>
      <div className={styles.relatedRail}>{data.relatedProducts.map((product, index) => <Link data-product-transition-id={product.slug} href={`/products/${product.slug}`} key={product.id}>
        <span className={styles.relatedMedia}>{product.primaryMedia.src ? <Image alt={product.primaryMedia.alt} fill quality={90} sizes="(max-width: 760px) 76vw, 32vw" src={product.primaryMedia.src} style={{ objectFit: "cover" }} unoptimized={!product.primaryMedia.src.startsWith("/")} /> : null}<i>{String(index + 1).padStart(2, "0")}</i></span>
        <span className={styles.relatedCopy}><small>{product.category}</small><strong>{product.name}</strong><Arrow diagonal /></span>
      </Link>)}</div>
    </section> : null}
  </main>;
}
