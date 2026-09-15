"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { Arrow } from "@/components/arrow";
import type { HomepageContentData } from "@/types/homepage-content";

import styles from "./homepage-content.module.css";

function number(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function HomepageContent({ data }: { data: HomepageContentData }) {
  const [activeSurface, setActiveSurface] = useState(0);
  const selectedSurface = data.surfaces[activeSurface] ?? data.surfaces[0];
  const selectedImage = selectedSurface?.image ?? data.surfaceArchiveImage;
  const hasVerifiedSurfaceImage = Boolean(selectedSurface?.image);

  return <>
    <section aria-labelledby="discover-icon-title" className={styles.discover} data-home-header-tone="light">
      <div aria-hidden="true" className={styles.heroTransition} />
      <header className={styles.discoverHeader}>
        <p className="eyebrow">01 / Discover ICON</p>
        <p className={styles.coordinate}>Morbi<br />India</p>
      </header>

      <div className={styles.discoverStatement} data-reveal>
        <h2 id="discover-icon-title">{data.discover.heading}</h2>
        <p>{data.discover.intro}</p>
      </div>

      <div className={styles.discoverComposition}>
        <figure className={styles.discoverMedia} data-image-reveal>
          {data.discover.image.src ? <Image
            alt={data.discover.image.alt}
            fill
            quality={92}
            sizes="(max-width: 760px) 100vw, 58vw"
            src={data.discover.image.src}
            style={{ objectFit: "cover", objectPosition: data.discover.image.position }}
          /> : null}
          <figcaption>Material and space / ICON archive</figcaption>
        </figure>

        <div className={styles.discoverFacts}>
          <ol aria-label="ICON company statistics">
            {data.discover.stats.map((stat, index) => <li data-reveal key={stat.value}>
              <small>{number(index)}</small>
              <strong>{stat.value}</strong>
              <div><span>{stat.label}</span>{stat.note ? <em>{stat.note}</em> : null}</div>
            </li>)}
          </ol>
          <Link className={styles.editorialLink} href={data.discover.cta.href}>{data.discover.cta.label}<Arrow diagonal /></Link>
        </div>
      </div>
    </section>

    <section aria-labelledby="collections-title" className={styles.collections} data-home-header-tone="light">
      <header className={styles.collectionsHeader}>
        <div><p className="eyebrow">02 / Collections</p><h2 id="collections-title">The material<br /><i>library.</i></h2></div>
        <p>An edited index of ICON product families, arranged through colour, scale and material character.</p>
      </header>

      <div className={styles.collectionGuide}>
        <span>Current collection edit</span>
        <p>Select a study to open the product library with that collection already in focus.</p>
        <strong>{String(data.collections.length).padStart(2, "0")} / Studies</strong>
      </div>

      <div className={styles.folio}>
        {data.collections.map((collection, index) => <Link
          aria-label={`Explore the ${collection.name} collection`}
          className={styles.folioSheet}
          href={collection.href}
          key={collection.id}
        >
          <span className={styles.folioMedia} data-image-reveal>
            {collection.image.src ? <Image
              alt={collection.image.alt}
              fill
              quality={90}
              sizes="(max-width: 760px) 78vw, 38vw"
              src={collection.image.src}
              style={{ objectFit: "cover", objectPosition: collection.image.position }}
            /> : null}
          </span>
          <span className={styles.folioMeta}>
            <small>{number(index)} / Collection study</small>
            <strong>{collection.name}</strong>
            <em>View filtered family</em>
            <Arrow diagonal />
          </span>
        </Link>)}
      </div>

      <div className={styles.collectionsFooter}>
        <span>{String(data.collections.length).padStart(2, "0")} selected studies</span>
        <Link className={styles.editorialLink} href="/products">View all products<Arrow diagonal /></Link>
      </div>
    </section>

    <section aria-labelledby="surfaces-title" className={styles.surfaces} data-home-header-tone="dark" id="surfaces">
      <header className={styles.surfacesHeader}>
        <p className="eyebrow">03 / Explore surfaces</p>
        <h2 id="surfaces-title">Surface<br /><i>lab.</i></h2>
        <p>Move through the client-defined surface index, then continue into the filtered material library.</p>
      </header>

      <div className={styles.surfaceLayout}>
        <div className={styles.surfacePreview} data-image-reveal>
          {selectedImage.src ? <Image
            alt={hasVerifiedSurfaceImage ? selectedImage.alt : "Material detail from the ICON client archive"}
            fill
            key={selectedImage.src}
            quality={92}
            sizes="(max-width: 760px) 100vw, 56vw"
            src={selectedImage.src}
            style={{ objectFit: "cover", objectPosition: selectedImage.position }}
          /> : null}
          <span className={styles.surfaceShade} aria-hidden="true" />
          <div className={styles.surfacePreviewMeta}>
            <small>{hasVerifiedSurfaceImage ? "Published product relation" : "Material archive"}</small>
            <strong>{selectedSurface?.name ?? "Surface"}</strong>
            <span>{number(activeSurface)} / {number(data.surfaces.length - 1)}</span>
          </div>
        </div>

        <nav aria-label="Browse products by surface" className={styles.surfaceIndex}>
          {data.surfaces.map((surface, index) => <Link
            aria-current={activeSurface === index ? "true" : undefined}
            href={surface.href}
            key={surface.id}
            onFocus={() => setActiveSurface(index)}
            onPointerEnter={() => setActiveSurface(index)}
          >
            <small>{number(index)}</small><strong>{surface.name}</strong><span aria-hidden="true" /><Arrow diagonal />
          </Link>)}
        </nav>
      </div>
    </section>
  </>;
}
