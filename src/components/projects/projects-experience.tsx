"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadGsap } from "@/animations/load-gsap";
import { Arrow } from "@/components/arrow";
import { ProjectLightbox } from "@/components/projects/project-lightbox";
import { ProjectStoryPopup } from "@/components/projects/project-story-popup";
import type { ProjectLayout, ProjectMedia, ProjectSummary, ProjectsPageData } from "@/types/projects";
import styles from "./projects.module.css";

const layoutClass: Record<ProjectLayout, string> = {
  landscape: styles.projectLandscape!,
  portrait: styles.projectPortrait!,
  wide: styles.projectWide!,
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
  const featuredRef = useRef<HTMLElement>(null);
  const categoriesRef = useRef<HTMLElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  const galleryRailRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const storyOpenerRef = useRef<HTMLButtonElement | null>(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewCategory, setPreviewCategory] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectSummary | null>(null);
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const closeProjectStory = useCallback(() => setActiveProject(null), []);
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

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;

    void loadGsap().then(({ gsap }) => {
      if (disposed) return;
      const match = gsap.matchMedia();
      const context = gsap.context(() => {
        match.add("(min-width: 900px) and (prefers-reduced-motion: no-preference)", () => {
          const featuredSection = featuredRef.current;
          if (featuredSection) {
            const main = featuredSection.querySelector<HTMLElement>("[data-featured-main]");
            const secondary = featuredSection.querySelector<HTMLElement>("[data-featured-secondary]");
            const copy = featuredSection.querySelector<HTMLElement>("[data-featured-copy]");
            const timeline = gsap.timeline({
              scrollTrigger: { trigger: featuredSection, start: "top 76%", end: "top 22%", scrub: 1.25, invalidateOnRefresh: true },
            });
            if (main) timeline.fromTo(main, { clipPath: "inset(0 18% 0 0)", xPercent: -5 }, { clipPath: "inset(0% 0% 0% 0%)", xPercent: 0, ease: "none" }, 0);
            if (copy) timeline.fromTo(copy, { opacity: .18, xPercent: -12 }, { opacity: 1, xPercent: 0, ease: "none" }, .08);
            if (secondary) timeline.fromTo(secondary, { opacity: 0, yPercent: 24, rotate: 2 }, { opacity: 1, yPercent: 0, rotate: 0, ease: "none" }, .18);
          }

          const categories = categoriesRef.current;
          if (categories) {
            const copy = categories.querySelector<HTMLElement>("[data-category-copy]");
            const buttons = categories.querySelectorAll<HTMLElement>("[data-category-button]");
            const preview = categories.querySelector<HTMLElement>("[data-category-preview]");
            if (copy) gsap.fromTo(copy, { y: 80, opacity: .25 }, {
              y: -24, opacity: 1, ease: "none",
              scrollTrigger: { trigger: categories, start: "top bottom", end: "bottom top", scrub: 1.5 },
            });
            if (buttons.length) gsap.from(buttons, {
              x: 54, opacity: 0, stagger: .09, duration: .85, ease: "power3.out",
              scrollTrigger: { trigger: categories, start: "top 66%", once: true },
            });
            if (preview) {
              gsap.from(preview, {
                clipPath: "inset(18% 0 18% 0)", scale: .96, duration: 1.25, ease: "power3.out",
                scrollTrigger: { trigger: categories, start: "top 72%", once: true },
              });
              const image = preview.querySelector("img");
              if (image) gsap.fromTo(image, { yPercent: -4, scale: 1.08 }, {
                yPercent: 4, scale: 1.08, ease: "none",
                scrollTrigger: { trigger: categories, start: "top bottom", end: "bottom top", scrub: 1.35 },
              });
            }
          }

          const gallery = galleryRef.current;
          const rail = galleryRailRef.current;
          if (gallery && rail && rail.children.length > 1) {
            const travel = () => {
              const leftInset = rail.offsetLeft;
              return Math.max(0, rail.scrollWidth + leftInset - window.innerWidth);
            };
            gsap.to(rail, {
              x: () => -travel(),
              ease: "none",
              scrollTrigger: {
                trigger: gallery,
                start: "top top",
                end: () => `+=${Math.max(window.innerHeight, travel() * 1.15)}`,
                pin: true,
                scrub: 1.2,
                invalidateOnRefresh: true,
              },
            });
            gsap.from(rail.children, {
              opacity: 0, y: 45, stagger: .1, duration: 1, ease: "power3.out",
              scrollTrigger: { trigger: gallery, start: "top 70%", once: true },
            });
          }
        });
      }, root);
      cleanup = () => { match.revert(); context.revert(); };
    }).catch(() => { /* Motion is progressive enhancement. */ });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [data.gallery.length]);

  function openGallery(index: number, opener: HTMLButtonElement) {
    openerRef.current = opener;
    setLightboxIndex(index);
  }

  function openProjectStory(project: ProjectSummary, opener: HTMLButtonElement) {
    storyOpenerRef.current = opener;
    setActiveProject(project);
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
        <figcaption><span>Architectural visual</span><span>01 / Projects</span></figcaption>
      </figure>
      <span className={styles.heroIndex} aria-hidden="true">P / 01</span>
    </section>

    <section className={styles.featured} id="featured-project" aria-labelledby="featured-title" ref={featuredRef}>
      <header className={styles.sectionHeader} data-reveal>
        <p className="eyebrow">02 / Featured project</p>
        <span>{data.source === "development-fallback" ? "Development preview / Verified project data pending" : "Selected project"}</span>
      </header>
      <div className={styles.featuredComposition}>
        <div className={styles.featuredCopy} data-featured-copy>
          <span className={styles.featuredNumber} aria-hidden="true">{featured.index}</span>
          <p className="eyebrow">{featured.category}{featured.location ? ` / ${featured.location}` : " / Location pending"}</p>
          <h2 id="featured-title">{featured.title}</h2>
          <p>{featured.shortDescription}</p>
          <button aria-haspopup="dialog" className={styles.featuredAction} onClick={(event) => openProjectStory(featured, event.currentTarget)} type="button">View project story <Arrow diagonal /></button>
        </div>
        <div className={styles.featuredVisual}>
          <figure className={styles.featuredMain} data-featured-main>
            <div data-parallax><ProjectImage media={featured.heroMedia} sizes="(max-width: 760px) 100vw, 62vw" /></div>
            <figcaption><span>Material in context</span><small>{featured.index} / Featured</small></figcaption>
          </figure>
          {featured.secondaryMedia ? <figure className={styles.featuredSecondary} data-featured-secondary>
            <ProjectImage media={featured.secondaryMedia} sizes="(max-width: 760px) 58vw, 20vw" />
            <figcaption>Surface detail</figcaption>
          </figure> : null}
        </div>
      </div>
    </section>

    <section className={styles.index} data-header-theme="dark" aria-labelledby="project-index-title" ref={categoriesRef}>
      <div className={styles.indexCopy} data-category-copy>
        <p className="eyebrow">03 / Project categories</p>
        <h2 id="project-index-title">Project<br />index.</h2>
        <p>Move through the supplied studies by spatial character. Verified project categories will replace development labels when approved data is available.</p>
      </div>
      <div className={styles.categoryList} aria-label="Filter project studies" onMouseLeave={() => setPreviewCategory(null)}>
        {data.categories.map((category, index) => <button
          aria-controls="project-list"
          aria-pressed={activeCategory === category.id}
          className={activeCategory === category.id ? styles.categoryActive : undefined}
          data-category-button
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
      <figure className={styles.categoryPreview} aria-live="polite" data-category-preview>
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
          <button aria-haspopup="dialog" className={styles.projectTrigger} onClick={(event) => openProjectStory(project, event.currentTarget)} type="button">
            <span className={styles.projectMedia} data-image-reveal>
              <ProjectImage media={project.heroMedia} sizes={project.layout === "wide" ? "(max-width: 760px) 100vw, 88vw" : "(max-width: 760px) 100vw, 58vw"} />
              <span>{project.index}</span>
            </span>
            <span className={styles.projectMeta}>
              <span><span className="eyebrow">{project.category}</span><strong className={styles.projectTitle}>{project.title}</strong></span>
              <p>{project.location ?? "Verified location pending"}</p>
              <span className={styles.projectArrow} aria-hidden="true"><Arrow diagonal /></span>
            </span>
          </button>
        </article>)}
      </div>
    </section>

    <section className={styles.gallery} data-header-theme="dark" aria-labelledby="gallery-title" ref={galleryRef}>
      <div className={styles.galleryViewport}>
        <div className={styles.galleryRail} ref={galleryRailRef}>
          <header className={styles.galleryHeader}>
            <p className="eyebrow">05 / Project gallery</p>
            <h2 id="gallery-title">Fragments of space.</h2>
            <div><p>Architecture is read in sequences: a room, a threshold, a surface, a detail.</p><span>Scroll to move through the visual archive</span></div>
          </header>
          {data.gallery.length ? data.gallery.map((item, index) => <figure className={styles.galleryItem} key={item.id} data-gallery-item>
            <button aria-label={`Open ${item.label} in gallery`} onClick={(event) => openGallery(index, event.currentTarget)} type="button">
              <ProjectImage media={item.media} sizes="(max-width: 760px) 88vw, 58vw" />
              <span className={styles.galleryOpen}><small>Open frame</small><b><Arrow diagonal /></b></span>
            </button>
            <figcaption><span>{item.label}</span><small>{String(index + 1).padStart(2, "0")} / {String(data.gallery.length).padStart(2, "0")}</small></figcaption>
          </figure>) : <p className={styles.galleryEmpty}>Additional approved project gallery images will appear here.</p>}
        </div>
      </div>
    </section>

    {data.story.length ? <section className={styles.story} aria-labelledby="story-title">
      <header data-reveal><p className="eyebrow">06 / Material sequence</p><h2 id="story-title">A material story,<br />frame by frame.</h2></header>
      <div className={styles.storyRail}>
        {data.story.map((item, index) => <figure key={item.id} data-reveal>
          <div><ProjectImage media={item.media} sizes="(max-width: 760px) 82vw, 32vw" /></div>
          <figcaption><span>{String(index + 1).padStart(2, "0")}</span>{item.label.split(" / ")[0]}</figcaption>
        </figure>)}
      </div>
    </section> : null}

    <section className={styles.productsUsed} aria-labelledby="products-used-title">
      <header data-reveal><p className="eyebrow">07 / Products used</p><h2 id="products-used-title">From project<br />to product.</h2></header>
      {featured.products.length ? <div className={styles.productRail}>{featured.products.map((product) => <Link href={`/products/${product.slug}`} key={product.id}>
        <figure><div><ProjectImage media={product.media} sizes="(max-width: 760px) 72vw, 24vw" /></div><figcaption>{product.name}<Arrow diagonal /></figcaption></figure>
      </Link>)}</div> : <div className={styles.productsPending} data-reveal>
        <p>Product associations will appear when verified project-to-product relationships are available.</p>
        <Link href="/products">Explore the product world <Arrow diagonal /></Link>
      </div>}
    </section>

    <section className={styles.cta} data-header-theme="dark" aria-labelledby="project-cta-title">
      <p className="eyebrow">08 / Begin a project</p>
      <h2 id="project-cta-title"><span>Have a space</span><span>in mind?</span></h2>
      <div><p>Discover the right surface for the atmosphere, scale and use of your space.</p><nav aria-label="Project calls to action"><Link href="/products">Explore products <Arrow diagonal /></Link><Link href="/contact">Start an enquiry <Arrow diagonal /></Link></nav></div>
    </section>

    <ProjectLightbox activeIndex={lightboxIndex} items={data.gallery} onChange={setLightboxIndex} onClose={closeLightbox} returnFocus={openerRef.current} />
    {activeProject ? <ProjectStoryPopup onClose={closeProjectStory} project={activeProject} returnFocus={storyOpenerRef.current} /> : null}
  </main>;
}
