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
  const heroMediaRef = useRef<HTMLButtonElement>(null);
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
  const selectedHeroImage = heroImages.find((image) => image.src === activeHeroImageSrc) ?? heroImages[0] ?? data.product.primaryMedia;
  const [displayedHeroImageSrc, setDisplayedHeroImageSrc] = useState<string | null>(null);
  const [loadedImages, setLoadedImages] = useState<Record<string, { width: number; height: number }>>({});
  const [failedImageSrc, setFailedImageSrc] = useState<string | null>(null);
  const [imageRetry, setImageRetry] = useState<Record<string, number>>({});
  const activeHeroImage = heroImages.find((image) => image.src === displayedHeroImageSrc) ?? selectedHeroImage;
  const galleryLoading = Boolean(selectedHeroImage.src && !loadedImages[selectedHeroImage.src] && failedImageSrc !== selectedHeroImage.src);
  const galleryFailed = Boolean(selectedHeroImage.src && failedImageSrc === selectedHeroImage.src);
  const visibleHeroImages = heroImages.filter((image) => image.src === displayedHeroImageSrc || image.src === selectedHeroImage.src);

  const selectHeroImage = (src: string) => {
    setActiveHeroImageSrc(src);
    setFailedImageSrc(null);
    if (src === displayedHeroImageSrc) return;
    // Keep the displayed element mounted; wait for each new element to decode.
    setLoadedImages((current) => {
      const next = { ...current };
      delete next[src];
      return next;
    });
    setImageRetry((current) => ({ ...current, [src]: (current[src] ?? 0) + 1 }));
  };

  useEffect(() => {
    // Commit only the current selection once decoded; late loads cannot replace it.
    if (selectedHeroImage.src && loadedImages[selectedHeroImage.src]) {
      setDisplayedHeroImageSrc(selectedHeroImage.src);
    }
  }, [selectedHeroImage.src, loadedImages]);

  useEffect(() => {
    const resetLens = () => {
      cancelAnimationFrame(lensFrame.current);
      if (heroMediaRef.current) heroMediaRef.current.dataset.lensActive = "false";
    };
    resetLens();
    window.addEventListener("resize", resetLens);
    return () => { resetLens(); window.removeEventListener("resize", resetLens); };
  }, [activeHeroImage.src]);

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
      const image = element.querySelector<HTMLImageElement>('img[data-displayed="true"]');
      const lens = element.querySelector<HTMLElement>(`.${styles.lens}`);
      if (!image || !lens || !image.naturalWidth || !image.naturalHeight) return;

      // Measure the actual image within the reserved area, including slim planks.
      const imageBounds = image.getBoundingClientRect();
      const renderedWidth = imageBounds.width;
      const renderedHeight = imageBounds.height;
      const fitScale = renderedWidth / image.naturalWidth;
      const imageLeft = imageBounds.left - rect.left;
      const imageTop = imageBounds.top - rect.top;
      if (pointerX < imageLeft || pointerX > imageLeft + renderedWidth || pointerY < imageTop || pointerY > imageTop + renderedHeight || fitScale >= 1) {
        element.dataset.lensActive = "false";
        return;
      }
      const zoom = Math.min(2, 1 / fitScale);
      const inset = 10;
      const diameter = Math.max(0, Math.min(192, Math.max(128, window.innerWidth * .12), renderedWidth - inset * 2, renderedHeight - inset * 2));
      if (diameter < 32) { element.dataset.lensActive = "false"; return; }
      lens.style.width = `${diameter}px`;
      lens.style.height = `${diameter}px`;
      const radius = diameter / 2;
      const lensLeft = Math.max(imageLeft + radius + inset, Math.min(imageLeft + renderedWidth - radius - inset, pointerX));
      const lensTop = Math.max(imageTop + radius + inset, Math.min(imageTop + renderedHeight - radius - inset, pointerY));

      lens.style.left = `${lensLeft}px`;
      lens.style.top = `${lensTop}px`;
      lens.style.backgroundSize = `${renderedWidth * zoom}px ${renderedHeight * zoom}px`;
      lens.style.backgroundPosition = `${radius - (pointerX - imageLeft) * zoom}px ${radius - (pointerY - imageTop) * zoom}px`;
      element.dataset.lensActive = "true";
    });
  };

  const openImageViewer = () => {
    if (!displayedHeroImageSrc) return;
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
          ref={heroMediaRef}
          aria-haspopup="dialog"
          aria-busy={galleryLoading}
          aria-disabled={!displayedHeroImageSrc}
          aria-label={`Open ${activeHeroImage.alt || data.product.name} in the image viewer`}
          onClick={openImageViewer}
          onPointerMove={moveLens}
          onPointerLeave={(event) => { cancelAnimationFrame(lensFrame.current); event.currentTarget.dataset.lensActive = "false"; }}
          onPointerCancel={(event) => { cancelAnimationFrame(lensFrame.current); event.currentTarget.dataset.lensActive = "false"; }}
        >
          {visibleHeroImages.map((image) => <Image
            alt={image.src === displayedHeroImageSrc ? image.alt || data.product.name : ""}
            aria-hidden={image.src !== displayedHeroImageSrc}
            data-displayed={image.src === displayedHeroImageSrc}
            width={loadedImages[image.src]?.width || image.width || 1920}
            height={loadedImages[image.src]?.height || image.height || 1080}
            key={`${image.src}-${imageRetry[image.src] ?? 0}`}
            loading="eager"
            fetchPriority="high"
            src={image.src}
            unoptimized
            onLoad={(event) => {
              // Next Image calls onLoad after decoding the image.
              const { naturalWidth: width, naturalHeight: height } = event.currentTarget;
              if (width && height) setLoadedImages((current) => ({ ...current, [image.src]: { width, height } }));
            }}
            onError={() => {
              setFailedImageSrc(image.src);
              setLoadedImages((current) => {
                const next = { ...current };
                delete next[image.src];
                return next;
              });
            }}
          />)}
          <span className={styles.lens} aria-hidden="true" style={{ backgroundImage: activeHeroImage.src ? `url(${activeHeroImage.src})` : undefined }} />
        </button>
        {heroImages.length > 1 ? <div className={styles.heroThumbnails} role="group" aria-label={`${data.product.name} image gallery`}>
          {heroImages.map((image, index) => <button aria-label={`Show ${data.product.name} image ${index + 1}`} aria-pressed={selectedHeroImage.src === image.src} key={image.src} onClick={() => selectHeroImage(image.src)} type="button">
            <Image alt="" fill quality={90} sizes="(max-width: 819px) 22vw, 12vw" src={image.src} unoptimized={!image.src.startsWith("/")} />
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>)}
        </div> : null}
        <p className={styles.heroLensHint} role="status" aria-live="polite">
          {galleryLoading ? "Loading image…" : galleryFailed ? <>Image could not load. <button type="button" onClick={() => { if (selectedHeroImage.src) selectHeroImage(selectedHeroImage.src); }}>Try again</button></> : displayedHeroImageSrc ? "Move to magnify / Tap to open" : "Image unavailable"}
        </p>
      </div>
      <span className={styles.heroIndex}>Product identity</span>
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
          const image = event.currentTarget.querySelector("img");
          const frame = event.currentTarget.querySelector<HTMLElement>(`.${styles.lightboxImage}`);
          if (!image || !frame || !image.naturalWidth || !image.naturalHeight) return;
          const rect = frame.getBoundingClientRect();
          const fit = Math.min(1, rect.width / image.naturalWidth, rect.height / image.naturalHeight);
          const left = (rect.width - image.naturalWidth * fit) / 2;
          const top = (rect.height - image.naturalHeight * fit) / 2;
          const x = Math.max(left, Math.min(rect.width - left, event.clientX - rect.left));
          const y = Math.max(top, Math.min(rect.height - top, event.clientY - rect.top));
          image.style.transformOrigin = `${x - left}px ${y - top}px`;
        }}
        type="button"
      >
        {activeHeroImage.src ? <span className={styles.lightboxImage}><Image
          alt={activeHeroImage.alt || data.product.name}
          fill
          quality={100}
          sizes="100vw"
          src={activeHeroImage.src}
          style={{ objectFit: "scale-down", transform: `scale(${imageZoom})`, transformOrigin: "50% 50%" }}
          unoptimized
        /></span> : null}
        <span className={styles.lightboxHint}>{imageZoom > 1 ? "Move across the image to inspect details" : "Tap or click the image to zoom"}</span>
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
          <span className={styles.passportIndex}>Identity</span>
          <div className={styles.passportHeading}>
            <div><small>ICON surface</small><h2>{data.product.name}</h2></div>
            {data.productCode ? <p><small>Product code</small><strong>{data.productCode}</strong></p> : null}
          </div>
          <p className={styles.passportDescription}>{data.description}</p>
          <span className={styles.passportStamp} aria-hidden="true">ICON</span>
        </article>
        <section className={styles.classificationCanvas} aria-labelledby="classification-title">
          <header>
            <span>Classification</span>
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
      <div className={styles.sectionIntro}><p className="eyebrow">Proportion</p><h2 id="size-title">Available sizes.</h2><p>Select a verified format to review the available product proportions.</p></div>
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
      <div><p className="eyebrow">Material response</p><h2 id="finish-title">Finish and light.</h2></div>
      <div role="group" aria-label="Select finish">{data.product.finishes.map((finish) => <button aria-pressed={activeFinish === finish} key={finish} onClick={() => setActiveFinish(finish)} type="button">{finish}</button>)}</div>
    </section> : null}

    {data.applicationMedia?.src ? <section className={styles.application} data-header-theme="dark" data-detail-reveal aria-labelledby="application-title">
      <div className={styles.applicationMedia}><Image alt={data.applicationMedia.alt} fill quality={95} sizes="100vw" src={data.applicationMedia.src} style={{ objectFit: "scale-down" }} unoptimized={!data.applicationMedia.src.startsWith("/")} /></div>
      <div className={styles.applicationShade} aria-hidden="true" />
      <div className={styles.applicationCopy}><p className="eyebrow">Material in context</p><h2 id="application-title">See it in space.</h2><p>This client-supplied architectural preview shows the material as part of a complete environment.</p>{data.product.applications.length ? <span>{data.product.applications.join(" / ")}</span> : null}</div>
    </section> : null}

    {data.relatedProducts.length ? <section className={styles.related} data-detail-reveal aria-labelledby="related-title">
      <header><p className="eyebrow">Continue exploring</p><h2 className={styles.relatedTitle!} id="related-title">Related material directions.</h2></header>
      <div className={styles.relatedRail}>{data.relatedProducts.map((product, index) => <Link data-product-transition-id={product.slug} href={`/products/${product.slug}`} key={product.id}>
        <span className={styles.relatedMedia}>{product.primaryMedia.src ? <Image alt={product.primaryMedia.alt} fill quality={90} sizes="(max-width: 760px) 76vw, 32vw" src={product.primaryMedia.src} style={{ objectFit: "scale-down" }} unoptimized={!product.primaryMedia.src.startsWith("/")} /> : null}<i>{String(index + 1).padStart(2, "0")}</i></span>
        <span className={styles.relatedCopy}><small>{product.category}</small><strong>{product.name}</strong><Arrow diagonal /></span>
      </Link>)}</div>
    </section> : null}
  </main>;
}
