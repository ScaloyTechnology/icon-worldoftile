"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Arrow } from "@/components/arrow";
import {
  countProductFilters, createEmptyProductFilters, filterProducts, parseProductDiscoveryState,
  serializeProductDiscoveryState, sortProducts, toggleProductFilter,
  type ProductDiscoveryState,
} from "@/lib/products/filter-products";
import type { ProductDiscoveryData, ProductFilterKey } from "@/types/products";

type Props = Readonly<{ data: ProductDiscoveryData }>;

function defaultState(): ProductDiscoveryState {
  return { filters: createEmptyProductFilters(), collectionId: null, query: "", sort: "featured" };
}

export function ProductsDiscoveryExperience({ data }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const activeCollectionRef = useRef(0);
  const flipRef = useRef<typeof import("gsap/Flip").Flip | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<ProductDiscoveryState>(defaultState);
  const [queryInput, setQueryInput] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [openMenu, setOpenMenu] = useState<ProductFilterKey | "collection" | null>(null);
  const [activeCollectionIndex, setActiveCollectionIndex] = useState(0);

  const commit = useCallback((next: ProductDiscoveryState, mode: "push" | "replace" = "push") => {
    const cards = gridRef.current?.querySelectorAll("[data-product-card]");
    const flipState = cards?.length ? flipRef.current?.getState(cards) : null;
    const previous = cards?.length && !flipState ? Array.from(cards).map((element) => element.getBoundingClientRect()) : [];
    setState(next);
    const query = serializeProductDiscoveryState(next, data.filterGroups, data.collections);
    const url = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history[mode === "push" ? "pushState" : "replaceState"]({}, "", url);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && (flipState || previous.length)) {
      requestAnimationFrame(() => {
        if (flipState && flipRef.current) {
          flipRef.current.from(flipState, { duration: .62, ease: "power3.inOut", stagger: .018, absoluteOnLeave: true });
          return;
        }
        const current = gridRef.current?.querySelectorAll<HTMLElement>("[data-product-card]");
        current?.forEach((element, index) => {
          const before = previous[index];
          if (!before) return;
          const after = element.getBoundingClientRect();
          const dx = before.left - after.left;
          const dy = before.top - after.top;
          element.animate([{ transform: `translate(${dx}px, ${dy}px)`, opacity: .35 }, { transform: "translate(0, 0)", opacity: 1 }], { duration: 520, easing: "cubic-bezier(.22,1,.36,1)" });
        });
      });
    }
  }, [data.collections, data.filterGroups]);

  useEffect(() => {
    let live = true;
    void Promise.all([import("gsap"), import("gsap/Flip")]).then(([gsapModule, flipModule]) => {
      if (!live) return;
      gsapModule.gsap.registerPlugin(flipModule.Flip);
      flipRef.current = flipModule.Flip;
    });
    return () => { live = false; flipRef.current = null; };
  }, []);

  useEffect(() => {
    const section = rootRef.current?.querySelector<HTMLElement>(".products-collections");
    if (!section || data.collections.length < 2) return;
    let frame = 0;
    const syncCollection = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = section.getBoundingClientRect();
        const travel = Math.max(1, section.offsetHeight - window.innerHeight);
        const progress = Math.max(0, Math.min(1, -rect.top / travel));
        const index = Math.min(data.collections.length - 1, Math.round(progress * (data.collections.length - 1)));
        if (index !== activeCollectionRef.current) {
          activeCollectionRef.current = index;
          setActiveCollectionIndex(index);
        }
      });
    };
    syncCollection();
    window.addEventListener("scroll", syncCollection, { passive: true });
    window.addEventListener("resize", syncCollection);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", syncCollection);
      window.removeEventListener("resize", syncCollection);
    };
  }, [data.collections.length]);

  useEffect(() => {
    const read = () => {
      const parsed = parseProductDiscoveryState(new URLSearchParams(window.location.search), data.filterGroups, data.collections);
      setState(parsed); setQueryInput(parsed.query);
    };
    const frame = requestAnimationFrame(() => { read(); setHydrated(true); });
    window.addEventListener("popstate", read);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("popstate", read); };
  }, [data.collections, data.filterGroups]);

  useEffect(() => {
    const closeMenus = (event: PointerEvent) => {
      if (!controlsRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", closeMenus);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenus);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useEffect(() => () => { if (searchTimer.current) clearTimeout(searchTimer.current); }, []);

  const visibleProducts = useMemo(() => sortProducts(filterProducts(data.products, state.filters, state.collectionId, state.query), state.sort), [data.products, state]);

  useEffect(() => {
    const root = rootRef.current;
    const cards = Array.from(gridRef.current?.querySelectorAll<HTMLElement>("[data-product-card]") ?? []);
    if (!root || !cards.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    root.classList.add("has-product-card-motion");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        (entry.target as HTMLElement).classList.add("is-card-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -26%", threshold: 0.12 });
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [visibleProducts]);
  const selectedCollection = data.collections.find((collection) => collection.id === state.collectionId);
  const activeCount = countProductFilters(state.filters, state.collectionId) + (state.query ? 1 : 0);

  const patchState = (patch: Partial<ProductDiscoveryState>, mode?: "push" | "replace") => commit({ ...state, ...patch }, mode);
  const toggle = (key: ProductFilterKey, value: string) => patchState({ filters: toggleProductFilter(state.filters, key, value) });
  const clearFilter = (key: ProductFilterKey) => patchState({ filters: { ...state.filters, [key]: [] } });
  const clearAll = () => { setQueryInput(""); commit(defaultState()); };

  return <div className={`products-discovery${hydrated ? " is-ready" : ""}`} ref={rootRef}>
    <section id="product-library" className="products-library" aria-labelledby="products-library-title">
      <header className="products-library__header">
        <p className="eyebrow">{data.source === "database" ? "Published catalogue" : "Current source library"}</p>
        <h2 id="products-library-title">Explore the surfaces.</h2>
        <p>Search the current material image library, or combine the verified filters below.</p>
      </header>

      <div className="products-controls" aria-label="Product controls" ref={controlsRef}>
        <label className="products-search"><span className="sr-only">Search products</span><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg><input value={queryInput} type="search" placeholder="Search materials" onChange={(event) => {
          const value = event.target.value.slice(0, 80); setQueryInput(value);
          if (searchTimer.current) clearTimeout(searchTimer.current);
          searchTimer.current = setTimeout(() => patchState({ query: value.trim() }, "replace"), 250);
        }} /></label>
        {data.filterGroups.map((group) => {
          const selected = state.filters[group.key];
          const summary = selected.length === 0 ? "All" : selected.length === 1 ? selected[0] : `${selected.length} selected`;
          const menuId = `products-${group.key}-menu`;
          return <div className={`products-control-menu${openMenu === group.key ? " is-open" : ""}`} key={group.key}>
            <button type="button" className="products-control-menu__trigger" aria-expanded={openMenu === group.key} aria-controls={menuId} onClick={() => setOpenMenu(openMenu === group.key ? null : group.key)}>
              <span>{group.label}</span><strong>{summary}</strong><i aria-hidden="true" />
            </button>
            <div className="products-control-menu__panel" id={menuId} role="listbox" aria-label={`Choose ${group.label.toLocaleLowerCase()}`} aria-multiselectable="true">
              <button type="button" role="option" aria-selected={selected.length === 0} onClick={() => { clearFilter(group.key); setOpenMenu(null); }}><span>All {group.label.toLocaleLowerCase()}</span><i aria-hidden="true" /></button>
              {group.options.map((option) => <button type="button" role="option" key={option.value} aria-selected={selected.includes(option.value)} onClick={() => toggle(group.key, option.value)}><span>{option.label}</span><i aria-hidden="true" /></button>)}
            </div>
          </div>;
        })}
        <div className={`products-control-menu${openMenu === "collection" ? " is-open" : ""}`}>
          <button type="button" className="products-control-menu__trigger" aria-expanded={openMenu === "collection"} aria-controls="products-collection-menu" onClick={() => setOpenMenu(openMenu === "collection" ? null : "collection")}>
            <span>Collection</span><strong>{selectedCollection?.name ?? "All"}</strong><i aria-hidden="true" />
          </button>
          <div className="products-control-menu__panel" id="products-collection-menu" role="listbox" aria-label="Choose collection">
            <button type="button" role="option" aria-selected={!state.collectionId} onClick={() => { patchState({ collectionId: null }); setOpenMenu(null); }}><span>All collections</span><i aria-hidden="true" /></button>
            {data.collections.map((collection) => <button type="button" role="option" key={collection.id} aria-selected={state.collectionId === collection.id} onClick={() => { patchState({ collectionId: collection.id }); setOpenMenu(null); }}><span>{collection.name}</span><i aria-hidden="true" /></button>)}
          </div>
        </div>
      </div>

      {activeCount ? <div className="products-chips" aria-label="Active filters">
        {state.query ? <button type="button" onClick={() => { setQueryInput(""); patchState({ query: "" }); }}>Search: {state.query}<span aria-hidden="true">×</span></button> : null}
        {selectedCollection ? <button type="button" onClick={() => patchState({ collectionId: null })}>{selectedCollection.name}<span aria-hidden="true">×</span></button> : null}
        {data.filterGroups.flatMap((group) => state.filters[group.key].map((value) => <button type="button" key={`${group.key}-${value}`} onClick={() => toggle(group.key, value)}>{group.label}: {value}<span aria-hidden="true">×</span></button>))}
        <button type="button" className="products-clear" onClick={clearAll}>Clear all</button>
      </div> : null}

      <div className="products-result-line"><p aria-live="polite" aria-atomic="true"><strong>{visibleProducts.length}</strong> {visibleProducts.length === 1 ? "material" : "materials"}</p><span>{selectedCollection?.name ?? "All collections"}</span></div>
      {visibleProducts.length ? <div className="products-grid" ref={gridRef}>
        {visibleProducts.map((product, index) => { const isPlank = Boolean(product.primaryMedia.width && product.primaryMedia.height && product.primaryMedia.width / product.primaryMedia.height >= 3); return <article className={`product-card${isPlank ? " product-card--plank" : ""}`} data-product-card data-product-transition-id={product.slug} key={product.id} style={{ "--product-index": index, "--product-order": index % 4 } as React.CSSProperties}>
          <Link className="product-card__link" href={`/products/${product.slug}`} aria-label={`Explore ${product.name}`}>
            <div className="product-card__media">
              {product.primaryMedia.src ? <Image alt={product.primaryMedia.alt} fill priority={index < 2} quality={95} sizes="(max-width: 719px) 100vw, (max-width: 1199px) 50vw, 40vw" src={product.primaryMedia.src} style={{ objectPosition: product.primaryMedia.position ?? "50% 50%" }} unoptimized={!product.primaryMedia.src.startsWith("/")} /> : null}
              <span className="product-card__number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            </div>
            <div className="product-card__copy"><p className="eyebrow">{data.collections.find((collection) => collection.id === product.collectionId)?.name ?? product.category}</p><h3>{product.name}</h3>
              {[...product.sizes, ...product.colors, ...product.looks].length ? <p>{[...product.sizes, ...product.colors, ...product.looks].join(" / ")}</p> : <p>Material image study</p>}
            </div>
          </Link>
        </article>; })}
      </div> : <div className="products-empty"><span aria-hidden="true">0</span><h3>No material matches this view.</h3><p>Remove one or more filters, or clear the search to return to the full library.</p><button type="button" onClick={clearAll}>Clear all filters</button></div>}
    </section>

    {data.collections.length > 0 ? <section className="products-collections" aria-labelledby="products-collections-title" style={{ "--collection-count": data.collections.length } as React.CSSProperties}>
      <div className="products-collections__sticky">
        <header><p className="eyebrow">Source groups</p><h2 id="products-collections-title">Browse<br />collections.</h2><p>Move through the material studies. Select one to return to its products.</p></header>
        <div className="products-collections__stage" aria-live="polite">
          {data.collections.map((collection, index) => <div className={`products-collection-scene${activeCollectionIndex === index ? " is-active" : ""}${collection.id === "200x1200" ? " products-collection-scene--plank" : ""}`} key={collection.id} aria-hidden={activeCollectionIndex !== index}>
            <span className="products-collection-scene__media">{collection.media.src ? <Image alt={collection.media.alt} fill loading={index < 2 ? "eager" : "lazy"} quality={95} sizes="(max-width: 760px) 100vw, 58vw" src={collection.media.src} unoptimized={!collection.media.src.startsWith("/")} /> : null}</span>
            <span className="products-collection-scene__index">{String(index + 1).padStart(2, "0")}</span>
            <span className="products-collection-scene__name">{collection.name}</span>
          </div>)}
        </div>
        <nav className="products-collections__nav" aria-label="Collection sequence">
          {data.collections.map((collection, index) => <button type="button" key={collection.id} className={activeCollectionIndex === index ? "is-active" : ""} aria-current={activeCollectionIndex === index ? "step" : undefined} onClick={() => {
            const section = document.querySelector<HTMLElement>(".products-collections");
            if (!section) return;
            const distance = section.scrollHeight - window.innerHeight;
            window.scrollTo({ top: section.offsetTop + distance * (index / Math.max(1, data.collections.length - 1)), behavior: "smooth" });
          }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{collection.name}</strong></button>)}
        </nav>
        <button className="products-collections__select" type="button" onClick={() => { const collection = data.collections[activeCollectionIndex]; if (!collection) return; patchState({ collectionId: collection.id }); document.querySelector(".products-library")?.scrollIntoView({ behavior: "smooth" }); }}>View this collection <Arrow /></button>
      </div>
    </section> : null}

    <section className="products-next" data-header-theme="dark"><p className="eyebrow">Material conversations</p><h2>A surface becomes meaningful in context.</h2><p>Explore how ICON surfaces come to life across different spaces.</p><Link href="/applications" prefetch={false}>Explore applications<span className="circle"><Arrow diagonal /></span></Link></section>

  </div>;
}
