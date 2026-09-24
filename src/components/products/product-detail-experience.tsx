"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Arrow } from "@/components/arrow";
import type { ProductDetailData } from "@/types/product-detail";
import styles from "./product-detail.module.css";

function values(values: readonly string[]) {
  return values.length ? values.join(" / ") : null;
}

export function ProductDetailExperience({ data }: Readonly<{ data: ProductDetailData }>) {
  const mainRef = useRef<HTMLElement>(null);
  const imageDialogRef = useRef<HTMLDialogElement>(null);
  const lensFrame = useRef(0);
  const [activeSize, setActiveSize] = useState(data.sizes[0]?.label ?? null);
  const [activeFinish, setActiveFinish] = useState(data.product.finishes[0] ?? null);
  const [imageZoom, setImageZoom] = useState(1);
  const [openPanel, setOpenPanel] = useState<"details" | "enquire" | null>("details");
  const heroImages = useMemo(() => {
    const images = [data.product.primaryMedia, ...data.product.gallery];
    const availableImages = images.filter(
      (image): image is typeof image & { src: string } => typeof image.src === "string" && image.src.length > 0,
    );
    return availableImages.filter(
      (image, index) => availableImages.findIndex((candidate) => candidate.src === image.src) === index,
    );
  }, [data.product.gallery, data.product.primaryMedia]);
  const [activeHeroImageSrc, setActiveHeroImageSrc] = useState(data.product.primaryMedia.src);
  const activeHeroImage = heroImages.find((image) => image.src === activeHeroImageSrc) ?? heroImages[0] ?? data.product.primaryMedia;

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
    }, { rootMargin: "0px 0px -26%", threshold: 0.12 });
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

  const openImageViewer = () => {
    setImageZoom(1);
    if (!imageDialogRef.current?.open) imageDialogRef.current?.showModal();
  };

  const closeImageViewer = () => imageDialogRef.current?.close();

  const heroMetadata = [activeSize, activeFinish, values(data.product.surfaces), values(data.product.colors)].filter(Boolean);

  return <main className={styles.page} id="main" ref={mainRef}>
    <section className={styles.hero} data-header-theme="dark" aria-labelledby="product-title">
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <Link className={styles.backLink} href="/products"><Arrow /> Product library</Link>
        <p className="eyebrow">{data.collectionName ?? data.product.category}</p>
        <h1 id="product-title">{data.product.name}</h1>
        {heroMetadata.length ? <p className={styles.heroMeta}>{heroMetadata.join(" / ")}</p> : null}
        <p className={styles.heroDescription}>{data.description}</p>
        <div className={styles.heroActions}>
          <a href="#product-media">Inspect surface <Arrow diagonal /></a>
          <Link href={enquiryHref}>Add to enquiry <Arrow /></Link>
        </div>
      </div>

      <div className={styles.heroVisual}>
        <button
          id="product-media"
          type="button"
          className={styles.heroMedia}
          aria-haspopup="dialog"
          aria-label={`Open ${activeHeroImage.alt || data.product.name} in the image viewer`}
          onClick={openImageViewer}
          onPointerMove={moveLens}
          onPointerLeave={(event) => { event.currentTarget.dataset.lensActive = "false"; }}
        >
          {activeHeroImage.src ? <Image alt={activeHeroImage.alt} fill key={activeHeroImage.src} priority={activeHeroImage.src === data.product.primaryMedia.src} quality={95} sizes="(max-width: 819px) 92vw, 58vw" src={activeHeroImage.src} unoptimized={!activeHeroImage.src.startsWith("/")} /> : null}
          <span className={styles.lens} aria-hidden="true" style={{ backgroundImage: activeHeroImage.src ? `url(${activeHeroImage.src})` : undefined }} />
          <span className={styles.heroLensHint}>Move to magnify / Tap to open</span>
          <span aria-hidden="true" />
        </button>
        {heroImages.length > 1 ? <div className={styles.heroThumbnails} role="group" aria-label={`${data.product.name} image gallery`}>
          {heroImages.map((image, index) => <button aria-label={`Show ${data.product.name} image ${index + 1}`} aria-pressed={activeHeroImage.src === image.src} key={image.src} onClick={() => setActiveHeroImageSrc(image.src)} type="button">
            <Image alt="" fill quality={80} sizes="96px" src={image.src} unoptimized={!image.src.startsWith("/")} />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>)}
        </div> : null}
      </div>
      <span className={styles.heroIndex}>01 / Product identity</span>
    </section>

    <dialog
      aria-labelledby="product-image-viewer-title"
      className={styles.imageLightbox}
      onCancel={(event) => { event.preventDefault(); closeImageViewer(); }}
      ref={imageDialogRef}
    >
      <header className={styles.lightboxHeader}>
        <div><span>Image viewer</span><strong id="product-image-viewer-title">{data.product.name}</strong></div>
        <button aria-label="Close image viewer" onClick={closeImageViewer} type="button">Close <span aria-hidden="true">×</span></button>
      </header>
      <button
        aria-label={imageZoom > 1 ? "Reset image zoom" : "Zoom into product image"}
        className={styles.lightboxStage}
        onClick={() => setImageZoom((current) => current > 1 ? 1 : 2.4)}
        onPointerMove={(event) => {
          if (imageZoom <= 1) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const image = event.currentTarget.querySelector("img");
          if (image) image.style.transformOrigin = `${((event.clientX - rect.left) / rect.width) * 100}% ${((event.clientY - rect.top) / rect.height) * 100}%`;
        }}
        type="button"
      >
        {activeHeroImage.src ? <Image
          alt={activeHeroImage.alt || data.product.name}
          fill
          quality={100}
          sizes="100vw"
          src={activeHeroImage.src}
          style={{ objectFit: "contain", transform: `scale(${imageZoom})`, transformOrigin: "50% 50%" }}
          unoptimized
        /> : null}
        <span>{imageZoom > 1 ? "Move across the image to inspect details" : "Tap or click the image to zoom"}</span>
      </button>
      <div className={styles.lightboxControls}>
        <button aria-label="Zoom out" disabled={imageZoom <= 1} onClick={() => setImageZoom((current) => Math.max(1, current - .5))} type="button">−</button>
        <output aria-label="Current zoom">{Math.round(imageZoom * 100)}%</output>
        <button aria-label="Zoom in" disabled={imageZoom >= 3} onClick={() => setImageZoom((current) => Math.min(3, current + .5))} type="button">+</button>
        <button onClick={() => setImageZoom(1)} type="button">Reset</button>
      </div>
    </dialog>

    <nav className={styles.actionRail} aria-label="Product information">
      {(["details", "enquire"] as const).map((panel) => <button aria-controls="product-information-dropdown" aria-expanded={openPanel === panel} key={panel} onClick={() => setOpenPanel((current) => current === panel ? null : panel)} type="button">{panel}<span aria-hidden="true">{openPanel === panel ? "-" : "+"}</span></button>)}
    </nav>

    {openPanel ? <section className={styles.actionDropdown} id="product-information-dropdown" aria-live="polite">
      <div className={styles.dropdownHeader}><p className="eyebrow">{openPanel === "details" ? "Product details" : "Product enquiry"}</p><button aria-label="Close product information" onClick={() => setOpenPanel(null)} type="button">Close</button></div>
      {openPanel === "details" ? <div className={styles.detailsDropdown}>
        <article className={styles.productPassport}>
          {data.product.primaryMedia.src ? <Image className={styles.passportMedia} alt={data.product.primaryMedia.alt || data.product.name} fill quality={95} sizes="(max-width: 720px) 100vw, 36vw" src={data.product.primaryMedia.src} unoptimized={!data.product.primaryMedia.src.startsWith("/")} /> : null}
          <span className={styles.passportShade} aria-hidden="true" />
          <span className={styles.passportIndex}>01 / Identity</span>
          <div className={styles.passportHeading}>
            <div><small>ICON surface</small><h2>{data.product.name}</h2></div>
            {data.productCode ? <p><small>Product code</small><strong>{data.productCode}</strong></p> : null}
          </div>
          <p className={styles.passportDescription}>{data.description}</p>
          <span className={styles.passportStamp} aria-hidden="true">ICON</span>
        </article>
        <section className={styles.classificationCanvas} aria-labelledby="classification-title">
          <header>
            <span>02 / Classification</span>
            <h3 id="classification-title">Material profile.</h3>
            <p>The selected characteristics that define this surface.</p>
          </header>
          <dl>
            {data.details.map((item, index) => <div className={styles.detailFacet} key={item.label}>
              <dt><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</dt>
              <dd>{item.value.split(" / ").map((value) => <span className={styles.detailValue} key={`${item.label}-${value}`}>{value}</span>)}</dd>
            </div>)}
          </dl>
        </section>
      </div> : null}
      {openPanel === "enquire" ? <div className={styles.enquireDropdown}><div><h2>Interested in this surface?</h2><p>Your selected product{activeSize ? ", size" : ""}{activeFinish ? " and finish" : ""} will be carried into the enquiry.</p></div><div><Link href={enquiryHref}>Add to enquiry <Arrow diagonal /></Link><Link href="/contact">Contact ICON <Arrow /></Link></div></div> : null}
    </section> : null}

    {data.sizes.length > 1 ? <section className={styles.sizeExplorer} data-detail-reveal aria-labelledby="size-title">
      <div className={styles.sectionIntro}><p className="eyebrow">03 / Proportion</p><h2 id="size-title">Available sizes.</h2><p>Select a verified format to review the available product proportions.</p></div>
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

    {data.applicationMedia?.src ? <section className={styles.application} data-header-theme="dark" data-detail-reveal aria-labelledby="application-title">
      <div className={styles.applicationMedia}><Image alt={data.applicationMedia.alt} fill quality={95} sizes="100vw" src={data.applicationMedia.src} style={{ objectFit: "cover" }} unoptimized={!data.applicationMedia.src.startsWith("/")} /></div>
      <div className={styles.applicationShade} aria-hidden="true" />
      <div className={styles.applicationCopy}><p className="eyebrow">06 / Material in context</p><h2 id="application-title">See it in space.</h2><p>This client-supplied architectural preview shows the material as part of a complete environment.</p>{data.product.applications.length ? <span>{data.product.applications.join(" / ")}</span> : null}</div>
    </section> : null}

    {data.relatedProducts.length ? <section className={styles.related} data-detail-reveal aria-labelledby="related-title">
      <header><p className="eyebrow">09 / Continue exploring</p><h2 className={styles.relatedTitle!} id="related-title">Related material directions.</h2></header>
      <div className={styles.relatedRail}>{data.relatedProducts.map((product, index) => <Link data-product-transition-id={product.slug} href={`/products/${product.slug}`} key={product.id}>
        <span className={styles.relatedMedia}>{product.primaryMedia.src ? <Image alt={product.primaryMedia.alt} fill quality={90} sizes="(max-width: 760px) 76vw, 32vw" src={product.primaryMedia.src} style={{ objectFit: "cover" }} unoptimized={!product.primaryMedia.src.startsWith("/")} /> : null}<i>{String(index + 1).padStart(2, "0")}</i></span>
        <span className={styles.relatedCopy}><small>{product.category}</small><strong>{product.name}</strong><Arrow diagonal /></span>
      </Link>)}</div>
    </section> : null}
  </main>;
}
