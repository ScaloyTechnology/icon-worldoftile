"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Arrow } from "@/components/arrow";
import { ProjectLightbox } from "@/components/projects/project-lightbox";
import type { ProjectDetailData } from "@/types/project-detail";
import type { ProjectMedia } from "@/types/projects";
import styles from "./project-detail.module.css";

function ProjectImage({ media, priority = false, sizes }: Readonly<{ media: ProjectMedia; priority?: boolean; sizes: string }>) {
  return <Image
    alt={media.alt}
    fill
    priority={priority}
    quality={90}
    sizes={sizes}
    src={media.src}
    style={{ objectFit: "cover", objectPosition: media.position ?? "50% 50%" }}
  />;
}

export function ProjectDetailExperience({ data }: Readonly<{ data: ProjectDetailData }>) {
  const rootRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const verified = data.source === "database";
  const category = data.facts.find((fact) => fact.label === "Category")?.value;
  const location = data.facts.find((fact) => fact.label === "Location")?.value;
  const support = verified ? [category, location].filter(Boolean).join(" / ") : "Development preview / verified details pending";

  useEffect(() => {
    const root = rootRef.current;
    const header = document.querySelector<HTMLElement>(".site-header");
    if (!root || !header) return;
    let frame = 0;
    const syncHeader = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const sampleY = Math.min(header.offsetHeight / 2, window.innerHeight / 2);
        const dark = Array.from(root.querySelectorAll<HTMLElement>("[data-header-theme='dark']")).some((section) => {
          const bounds = section.getBoundingClientRect();
          return bounds.top <= sampleY && bounds.bottom > sampleY;
        });
        header.dataset.theme = dark ? "dark" : "light";
      });
    };
    syncHeader();
    window.addEventListener("scroll", syncHeader, { passive: true });
    window.addEventListener("resize", syncHeader);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncHeader);
      window.removeEventListener("resize", syncHeader);
      delete header.dataset.theme;
    };
  }, []);

  function openGallery(index: number, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setLightboxIndex(index);
  }

  return <main className={styles.page} id="main" ref={rootRef}>
    <section className={styles.hero} data-header-theme="dark" aria-labelledby="project-title">
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <Link className={styles.backLink} href="/projects"><span aria-hidden="true">←</span> Projects</Link>
        <p className="eyebrow">Project / {data.project.index}</p>
        <h1 id="project-title">{data.project.title}</h1>
        {support ? <p className={styles.heroSupport}>{support}</p> : null}
        <a className={styles.scrollCue} href="#project-introduction"><span>Read the case study</span><i aria-hidden="true" /></a>
      </div>
      <figure className={styles.heroMedia}>
        <ProjectImage media={data.project.heroMedia} priority sizes="(max-width: 760px) 100vw, 68vw" />
        <figcaption><span>Material in context</span><span>{data.project.index} / Project</span></figcaption>
      </figure>
      {data.project.secondaryMedia ? <figure className={styles.heroInset} aria-hidden="true">
        <ProjectImage media={data.project.secondaryMedia} sizes="(max-width: 760px) 45vw, 18vw" />
      </figure> : null}
    </section>

    <section className={styles.introduction} id="project-introduction" aria-labelledby="introduction-title">
      <div className={styles.sectionMarker}><p className="eyebrow">02 / Introduction</p><span aria-hidden="true">P—{data.project.index}</span></div>
      <div className={styles.introductionCopy} data-reveal>
        <h2 id="introduction-title">{data.introductionHeading}</h2>
        <p>{data.introduction}</p>
        {!verified ? <p className={styles.dataNotice}>Development content / no project attribution is implied.</p> : null}
      </div>
    </section>

    <section className={styles.information} data-header-theme="dark" aria-labelledby="information-title">
      <header data-reveal><p className="eyebrow">03 / Project information</p><h2 id="information-title">The brief,<br />at a glance.</h2></header>
      <div className={styles.factGrid}>
        {data.facts.length ? data.facts.map((fact, index) => <div className={styles.fact} key={fact.label} data-reveal>
          <span>{String(index + 1).padStart(2, "0")}</span><p>{fact.label}</p><strong>{fact.value}</strong>
        </div>) : <div className={styles.informationEmpty} data-reveal><span aria-hidden="true" /><p>No verified project information has been supplied for this development study.</p></div>}
      </div>
    </section>

    <section className={styles.gallery} aria-labelledby="detail-gallery-title">
      <header className={styles.galleryHeader} data-reveal>
        <p className="eyebrow">04 / Project gallery</p>
        <h2 id="detail-gallery-title">Space,<br />in sequence.</h2>
        <div><p>Move from the broad architectural frame to the closer material reading.</p>{data.galleryNote ? <small>{data.galleryNote}</small> : null}</div>
      </header>
      {data.gallery.length ? <div className={styles.galleryGrid}>
        {data.gallery.map((item, index) => <figure className={styles.galleryItem} key={item.id} data-image-reveal={index % 3 === 0 ? "" : undefined} data-reveal={index % 3 === 1 ? "" : undefined}>
          <button type="button" onClick={(event) => openGallery(index, event.currentTarget)} aria-label={`Open ${item.label} in gallery`}>
            <ProjectImage media={item.media} sizes={index === 0 ? "(max-width: 760px) 100vw, 78vw" : "(max-width: 760px) 100vw, 46vw"} />
            <span aria-hidden="true">View</span>
          </button>
          <figcaption><span>{String(index + 1).padStart(2, "0")}</span>{item.label.split(" / ")[0]}</figcaption>
        </figure>)}
      </div> : <div className={styles.galleryEmpty}><span aria-hidden="true" /><p>No additional approved project images are attached to this record.</p></div>}
    </section>

    <section className={styles.products} data-header-theme="dark" aria-labelledby="project-products-title">
      <header data-reveal><p className="eyebrow">05 / Products used</p><h2 id="project-products-title">The material<br />register.</h2><p>Only products explicitly related to this published project appear here.</p></header>
      {data.products.length ? <div className={styles.productGrid}>
        {data.products.map((product, index) => <Link href={`/products/${product.slug}`} key={product.id}>
          <figure><div><ProjectImage media={product.media} sizes="(max-width: 760px) 78vw, 28vw" /></div><span>{String(index + 1).padStart(2, "0")}</span></figure>
          <div className={styles.productCopy}><p>{product.collectionName ?? "Published product"}</p><h3>{product.name}</h3>{product.finish || product.surface ? <small>{[product.finish && `Finish: ${product.finish}`, product.surface && `Surface: ${product.surface}`].filter(Boolean).join(" / ")}</small> : null}<Arrow diagonal /></div>
        </Link>)}
      </div> : <div className={styles.materialEmpty} data-reveal>
        <div className={styles.materialStudy} aria-hidden="true"><i /><i /><i /><span>Association pending</span></div>
        <div><p>No verified project-to-product associations have been published for this study.</p><Link className={styles.actionLink} href="/products">Explore all products <Arrow diagonal /></Link></div>
      </div>}
    </section>

    <section className={styles.collections} aria-labelledby="related-collections-title">
      <header data-reveal><p className="eyebrow">06 / Related collections</p><h2 id="related-collections-title">Material families.</h2></header>
      {data.relatedCollections.length ? <div className={styles.collectionRail}>
        {data.relatedCollections.map((collection, index) => <Link href={`/products?collection=${encodeURIComponent(collection.slug)}`} key={collection.id}>
          <figure><ProjectImage media={collection.media} sizes="(max-width: 760px) 84vw, 31vw" /><span>{String(index + 1).padStart(2, "0")}</span></figure>
          <div><h3>{collection.name}</h3>{collection.description ? <p>{collection.description}</p> : null}<Arrow diagonal /></div>
        </Link>)}
      </div> : <div className={styles.collectionEmpty} data-reveal><p>No verified collection relationship is attached to this project.</p><Link className={styles.actionLink} href="/products">Browse the collection library <Arrow diagonal /></Link></div>}
    </section>

    <section className={styles.related} aria-labelledby="related-projects-title">
      <header data-reveal><p className="eyebrow">07 / Related projects</p><h2 id="related-projects-title">Continue through<br />the casebook.</h2></header>
      {data.relatedProjects.length ? <div className={styles.relatedGrid}>
        {data.relatedProjects.map((project, index) => <article key={project.id}>
          <Link href={`/projects/${project.slug}`} data-project-transition={project.id}>
            <figure><ProjectImage media={project.heroMedia} sizes="(max-width: 760px) 100vw, 32vw" /><span>{String(index + 1).padStart(2, "0")}</span></figure>
            <div><p>{verified ? [project.category, project.location].filter(Boolean).join(" / ") : "Development preview"}</p><h3>{project.title}</h3><Arrow diagonal /></div>
          </Link>
        </article>)}
      </div> : <p className={styles.relatedEmpty}>No related published projects are available yet.</p>}
    </section>

    <section className={styles.cta} data-header-theme="dark" aria-labelledby="project-enquiry-title">
      <p className="eyebrow">08 / Enquiry</p>
      <h2 id="project-enquiry-title"><span>Discuss your</span><span>project.</span></h2>
      <div><p>Speak with ICON about surfaces, scale and the material direction for your space.</p><Link href="/contact">Start an enquiry <Arrow diagonal /></Link></div>
    </section>

    <ProjectLightbox activeIndex={lightboxIndex} items={data.gallery} onChange={setLightboxIndex} onClose={closeLightbox} returnFocus={openerRef.current} />
  </main>;
}
