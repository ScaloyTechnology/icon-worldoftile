"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow } from "@/components/arrow";
import { ProjectLightbox } from "@/components/projects/project-lightbox";
import type { ProjectLayout, ProjectMedia, ProjectsPageData } from "@/types/projects";
import styles from "./projects.module.css";

const layoutClass: Record<ProjectLayout, string> = {
  landscape: styles.projectLandscape,
  portrait: styles.projectPortrait,
  wide: styles.projectWide,
};

function ProjectImage({ media, priority = false, sizes }: Readonly<{ media: ProjectMedia; priority?: boolean; sizes: string }>) {
  return <Image
    alt={media.alt}
    fill
    priority={priority}
    quality={88}
    sizes={sizes}
    src={media.src}
    style={{ objectFit: "cover", objectPosition: media.position ?? "50% 50%" }}
  />;
}

export function ProjectsExperience({ data }: Readonly<{ data: ProjectsPageData }>) {
  const rootRef = useRef<HTMLElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewCategory, setPreviewCategory] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const featured = data.projects.find((project) => project.id === data.featuredProjectId) ?? data.projects[0]!;
  const listing = useMemo(() => {
    const projects = data.projects.filter((project) => project.id !== featured.id);
    const base = projects.length ? projects : data.projects;
    if (activeCategory === "all") return base;
    const selected = data.categories.find((category) => category.id === activeCategory);
    return selected ? base.filter((project) => project.category === selected.label) : base;
  }, [activeCategory, data.categories, data.projects, featured.id]);
  const categoryPreview = data.categories.find((category) => category.id === (previewCategory ?? activeCategory))
    ?? data.categories[0]!;

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
    <section className={styles.hero} data-header-theme="dark" aria-labelledby="projects-title">
      <div className={styles.heroGrid} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <p className="eyebrow">{data.hero.eyebrow}</p>
        <h1 id="projects-title">
          <span className={styles.heroLine}><span data-hero-line>{data.hero.title[0]}</span></span>
          <span className={styles.heroLine}><span data-hero-line>{data.hero.title[1]}</span></span>
        </h1>
        <p>{data.hero.description}</p>
        <a className={styles.heroGuide} href="#featured-project"><span>Enter the casebook</span><i aria-hidden="true" /></a>
      </div>
      <figure className={styles.heroMedia}>
        <ProjectImage media={data.hero.media} priority sizes="(max-width: 760px) 100vw, 68vw" />
        <figcaption><span>Architectural visual</span><span>01 / Atlas</span></figcaption>
      </figure>
      <span className={styles.heroIndex} aria-hidden="true">P / 01</span>
    </section>

    <section className={styles.featured} id="featured-project" aria-labelledby="featured-title">
      <header className={styles.sectionHeader} data-reveal>
        <p className="eyebrow">02 / Featured project</p>
        <span>{data.source === "development-fallback" ? "Development preview / Verified project data pending" : "Selected project"}</span>
      </header>
      <div className={styles.featuredComposition}>
        <figure className={styles.featuredMain} data-image-reveal>
          <div data-parallax><ProjectImage media={featured.heroMedia} sizes="(max-width: 760px) 100vw, 72vw" /></div>
          <figcaption>Material in context</figcaption>
        </figure>
        {featured.secondaryMedia ? <figure className={styles.featuredSecondary} data-image-reveal>
          <ProjectImage media={featured.secondaryMedia} sizes="(max-width: 760px) 58vw, 24vw" />
        </figure> : null}
        <div className={styles.featuredNumber} aria-hidden="true">{featured.index}</div>
        <div className={styles.featuredCopy} data-reveal>
          <p className="eyebrow">{featured.category}{featured.location ? ` / ${featured.location}` : " / Location pending"}</p>
          <h2 id="featured-title">{featured.title}</h2>
          <p>{featured.shortDescription}</p>
          <Link href={`/projects/${featured.slug}`} data-project-transition={featured.id}>View project <Arrow diagonal /></Link>
        </div>
      </div>
    </section>

    <section className={styles.index} data-header-theme="dark" aria-labelledby="project-index-title">
      <div className={styles.indexCopy}>
        <p className="eyebrow">03 / Project categories</p>
        <h2 id="project-index-title">Project<br />index.</h2>
        <p>Move through the supplied studies by spatial character. Verified project categories will replace development labels when approved data is available.</p>
      </div>
      <div className={styles.categoryList} aria-label="Filter project studies" onMouseLeave={() => setPreviewCategory(null)}>
        {data.categories.map((category, index) => <button
          aria-controls="project-list"
          aria-pressed={activeCategory === category.id}
          className={activeCategory === category.id ? styles.categoryActive : undefined}
          key={category.id}
          onClick={() => setActiveCategory(category.id)}
          onFocus={() => setPreviewCategory(category.id)}
          onMouseEnter={() => setPreviewCategory(category.id)}
          type="button"
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{category.label}</strong>
          <small>{String(category.count).padStart(2, "0")}</small>
        </button>)}
      </div>
      <figure className={styles.categoryPreview} aria-live="polite">
        <ProjectImage media={categoryPreview.preview} sizes="(max-width: 760px) 92vw, 35vw" />
        <figcaption>{categoryPreview.label} / preview</figcaption>
      </figure>
    </section>

    <section className={styles.listing} aria-labelledby="project-list-title">
      <header className={styles.listingHeader} data-reveal>
        <div><p className="eyebrow">04 / Selected spaces</p><h2 id="project-list-title">The casebook.</h2></div>
        <p aria-live="polite">Showing {listing.length} {listing.length === 1 ? "study" : "studies"}</p>
      </header>
      <div className={styles.projectList} id="project-list">
        {listing.map((project) => <article className={`${styles.projectItem} ${layoutClass[project.layout]}`} key={project.id} data-reveal>
          <Link href={`/projects/${project.slug}`} data-project-transition={project.id}>
            <figure className={styles.projectMedia} data-image-reveal>
              <ProjectImage media={project.heroMedia} sizes={project.layout === "wide" ? "(max-width: 760px) 100vw, 88vw" : "(max-width: 760px) 100vw, 58vw"} />
              <span>{project.index}</span>
            </figure>
            <div className={styles.projectMeta}>
              <div><p className="eyebrow">{project.category}</p><h3>{project.title}</h3></div>
              <p>{project.location ?? "Verified location pending"}</p>
              <span className={styles.projectArrow} aria-hidden="true"><Arrow diagonal /></span>
            </div>
          </Link>
        </article>)}
      </div>
    </section>

    <section className={styles.gallery} data-header-theme="dark" aria-labelledby="gallery-title">
      <header className={styles.galleryHeader} data-reveal>
        <p className="eyebrow">05 / Project gallery</p>
        <h2 id="gallery-title">Fragments of<br />space.</h2>
        <p>Architecture is read in sequences: a room, a threshold, a surface, a detail.</p>
      </header>
      {data.gallery.length ? <div className={styles.galleryGrid}>
        {data.gallery.map((item, index) => <figure className={styles.galleryItem} key={item.id} data-image-reveal>
          <button aria-label={`Open ${item.label} in gallery`} onClick={(event) => openGallery(index, event.currentTarget)} type="button">
            <ProjectImage media={item.media} sizes="(max-width: 760px) 100vw, 62vw" />
          </button>
          <figcaption>{item.label}</figcaption>
        </figure>)}
      </div> : <p className={styles.galleryEmpty}>Additional approved project gallery images will appear here.</p>}
    </section>

    {data.story.length ? <section className={styles.story} aria-labelledby="story-title">
      <header data-reveal><p className="eyebrow">06 / Selected spaces</p><h2 id="story-title">A material story,<br />frame by frame.</h2></header>
      <div className={styles.storyRail}>
        {data.story.map((item, index) => <figure key={item.id} data-reveal>
          <div><ProjectImage media={item.media} sizes="(max-width: 760px) 82vw, 32vw" /></div>
          <figcaption><span>{String(index + 1).padStart(2, "0")}</span>{item.label.split(" / ")[0]}</figcaption>
        </figure>)}
      </div>
    </section> : null}

    <section className={styles.atlas} data-header-theme="dark" aria-labelledby="atlas-title">
      <div className={styles.atlasMap} data-image-reveal>
        <Image alt="" fill sizes="(max-width: 760px) 100vw, 64vw" src="/assets/world-map-equal-earth.svg" />
        <span>Project coordinates / awaiting verified data</span>
      </div>
      <div className={styles.atlasCopy} data-reveal>
        <p className="eyebrow">07 / Locations</p>
        <h2 id="atlas-title">Project<br />atlas.</h2>
        {data.locations.length ? <><p>Published project locations.</p><ul>{data.locations.map((location) => <li key={location.label}><span>{location.label}</span><small>{String(location.count).padStart(2, "0")}</small></li>)}</ul></> : <div className={styles.atlasPending}><span aria-hidden="true" /><p>Verified project locations have not yet been supplied. The atlas will activate when approved city and project data is available.</p></div>}
      </div>
    </section>

    <section className={styles.productsUsed} aria-labelledby="products-used-title">
      <header data-reveal><p className="eyebrow">08 / Products used</p><h2 id="products-used-title">From project<br />to product.</h2></header>
      {featured.products.length ? <div className={styles.productRail}>{featured.products.map((product) => <Link href={`/products/${product.slug}`} key={product.id}>
        <figure><div><ProjectImage media={product.media} sizes="(max-width: 760px) 72vw, 24vw" /></div><figcaption>{product.name}<Arrow diagonal /></figcaption></figure>
      </Link>)}</div> : <div className={styles.productsPending} data-reveal>
        <p>Product associations will appear when verified project-to-product relationships are available.</p>
        <Link href="/products">Explore the product world <Arrow diagonal /></Link>
      </div>}
    </section>

    <section className={styles.discover} aria-labelledby="discover-project-title">
      <p className="eyebrow">09 / Discover project</p>
      <div className={styles.discoverLine} aria-hidden="true"><span /><i>01</i><span /></div>
      <div><h2 id="discover-project-title">From index<br />to case study.</h2><p>The project-detail route is prepared for approved introductions, credits, galleries and product relationships.</p><Link href={`/projects/${featured.slug}`} data-project-transition={featured.id}>Discover selected project <Arrow diagonal /></Link></div>
    </section>

    <section className={styles.cta} data-header-theme="dark" aria-labelledby="project-cta-title">
      <p className="eyebrow">10 / Begin a project</p>
      <h2 id="project-cta-title"><span>Have a space</span><span>in mind?</span></h2>
      <div><p>Discover the right surface for the atmosphere, scale and use of your space.</p><nav aria-label="Project calls to action"><Link href="/products">Explore products <Arrow diagonal /></Link><Link href="/contact">Start an enquiry <Arrow diagonal /></Link></nav></div>
    </section>

    <ProjectLightbox activeIndex={lightboxIndex} items={data.gallery} onChange={setLightboxIndex} onClose={closeLightbox} returnFocus={openerRef.current} />
  </main>;
}
