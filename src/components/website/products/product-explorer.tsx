"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { SectionHeader } from "@/components/ui/section-header";
import { ProductGrid } from "@/components/website/products/product-grid";
import {
  cloneProductFilters,
  countProductFilters,
  createEmptyProductFilters,
  filterProducts,
  parseProductFilters,
  serializeProductFilters,
  toggleProductFilter,
  type MutableProductFilters,
} from "@/lib/products/filter-products";
import {
  productFilterKeys,
  type Product,
  type ProductCollection,
  type ProductFilterGroup,
  type ProductFilterKey,
  type ProductFilters,
  type ProductsPageContent,
} from "@/types/products";

type ProductExplorerProps = Readonly<{
  collections: readonly ProductCollection[];
  content: ProductsPageContent["listing"];
  filterGroups: readonly ProductFilterGroup[];
  products: readonly Product[];
}>;

type FilterOptionControlProps = Readonly<{
  checked: boolean;
  id: string;
  label: string;
  onChange: () => void;
  swatch?: string;
}>;

function FilterOptionControl({
  checked,
  id,
  label,
  onChange,
  swatch,
}: FilterOptionControlProps) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center justify-between gap-5 border-b py-3 transition-colors ${
        checked
          ? "border-foreground text-foreground"
          : "border-border text-muted"
      }`}
      htmlFor={id}
    >
      <span className="flex items-center gap-3">
        {swatch ? (
          <span
            aria-hidden="true"
            className="h-5 w-5 border border-border"
            style={{ backgroundColor: swatch }}
          />
        ) : null}
        <span>{label}</span>
      </span>
      <input
        checked={checked}
        className="h-5 w-5 accent-accent"
        id={id}
        onChange={onChange}
        type="checkbox"
      />
    </label>
  );
}

function groupSelectionCount(filters: ProductFilters, key: ProductFilterKey) {
  return filters[key].length;
}

export function ProductExplorer({
  collections,
  content,
  filterGroups,
  products,
}: ProductExplorerProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [openGroup, setOpenGroup] = useState<ProductFilterKey | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<MutableProductFilters>(() =>
    createEmptyProductFilters(),
  );
  const [draftCollectionId, setDraftCollectionId] = useState<string | null>(
    null,
  );
  const drawerRef = useRef<HTMLDialogElement>(null);
  const drawerTriggerRef = useRef<HTMLButtonElement>(null);

  const filters = useMemo(
    () => parseProductFilters(new URLSearchParams(queryString), filterGroups),
    [filterGroups, queryString],
  );
  const requestedCollectionId = searchParams.get("collection");
  const collectionId = collections.some(
    (collection) => collection.id === requestedCollectionId,
  )
    ? requestedCollectionId
    : null;
  const selectedCollection = collections.find(
    (collection) => collection.id === collectionId,
  );
  const activeCount = countProductFilters(filters, collectionId);
  const filteredProducts = useMemo(
    () => filterProducts(products, filters, collectionId),
    [collectionId, filters, products],
  );

  function commitFilters(
    nextFilters: ProductFilters,
    nextCollectionId: string | null,
  ) {
    const query = serializeProductFilters(
      nextFilters,
      filterGroups,
      nextCollectionId,
    );
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    window.history.pushState(null, "", nextUrl);
  }

  function clearAll() {
    commitFilters(createEmptyProductFilters(), null);
    setOpenGroup(null);
  }

  function openDrawer() {
    setDraftFilters(cloneProductFilters(filters));
    setDraftCollectionId(collectionId);
    setIsDrawerOpen(true);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    window.requestAnimationFrame(() => drawerTriggerRef.current?.focus());
  }

  useEffect(() => {
    const drawer = drawerRef.current;
    if (!isDrawerOpen || !drawer) return;
    const previousOverflow = document.body.style.overflow;
    const trigger = drawerTriggerRef.current;
    drawer.showModal();
    drawer.querySelector<HTMLButtonElement>("[data-drawer-close]")?.focus();
    document.body.style.overflow = "hidden";
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => setIsDrawerOpen(false);
    const resize = () => { if (desktop.matches) close(); };
    desktop.addEventListener("change", resize);
    window.addEventListener("popstate", close);
    return () => {
      drawer.close();
      document.body.style.overflow = previousOverflow;
      desktop.removeEventListener("change", resize);
      window.removeEventListener("popstate", close);
      trigger?.focus();
    };
  }, [isDrawerOpen]);

  return (
    <Section
      aria-labelledby="product-library-title"
      className="bg-background"
      id="product-library"
    >
      <Container size="wide">
        <div className="grid gap-8 md:grid-cols-12">
          <SectionHeader
            className="md:col-span-8"
            description={content.description}
            eyebrow={content.eyebrow}
            title={<span id="product-library-title">{content.title}</span>}
          />
          <p
            aria-live="polite"
            className="type-caption self-end text-muted md:col-span-3 md:col-start-10 md:text-right"
            role="status"
          >
            {filteredProducts.length} of {products.length} development products
          </p>
        </div>

        <div className="sticky top-[var(--header-height)] z-40 mt-12 border-y border-border bg-background/95 backdrop-blur-md lg:mt-16">
          <div className="hidden lg:block">
            <div className="flex items-stretch">
              {filterGroups.map((group) => {
                const selectionCount = groupSelectionCount(filters, group.key);
                const isOpen = openGroup === group.key;

                return (
                  <button
                    aria-controls={`desktop-filter-${group.key}`}
                    aria-expanded={isOpen}
                    className="type-label flex min-h-16 flex-1 items-center justify-between gap-3 border-r border-border px-4 text-left last:border-r-0 hover:bg-surface"
                    key={group.key}
                    onClick={() => setOpenGroup(isOpen ? null : group.key)}
                    type="button"
                  >
                    <span>{group.label}</span>
                    <span aria-hidden="true" className="text-muted">
                      {selectionCount > 0
                        ? String(selectionCount).padStart(2, "0")
                        : isOpen
                          ? "−"
                          : "+"}
                    </span>
                  </button>
                );
              })}
            </div>

            {openGroup ? (
              <div
                className="filter-panel-enter absolute right-0 left-0 border-y border-border bg-surface shadow-[0_1.5rem_3rem_var(--shadow-dark)]"
                id={`desktop-filter-${openGroup}`}
              >
                {filterGroups
                  .filter((group) => group.key === openGroup)
                  .map((group) => (
                    <div
                      className="grid gap-12 px-[var(--container-gutter)] py-8 lg:grid-cols-[0.65fr_1.35fr]"
                      key={group.key}
                    >
                      <div>
                        <p className="type-label">Browse by {group.label}</p>
                        <p className="type-small mt-4 max-w-sm text-muted">
                          {group.description}
                        </p>
                      </div>
                      <fieldset>
                        <legend className="sr-only">
                          Filter products by {group.label}
                        </legend>
                        <div className="grid grid-cols-2 gap-x-8 xl:grid-cols-3">
                          {group.options.map((option) => (
                            <FilterOptionControl
                              checked={filters[group.key].includes(
                                option.value,
                              )}
                              id={`desktop-${group.key}-${option.value.replaceAll(" ", "-")}`}
                              key={option.value}
                              label={option.label}
                              onChange={() =>
                                commitFilters(
                                  toggleProductFilter(
                                    filters,
                                    group.key,
                                    option.value,
                                  ),
                                  collectionId,
                                )
                              }
                              swatch={option.swatch}
                            />
                          ))}
                        </div>
                      </fieldset>
                    </div>
                  ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-h-16 items-center justify-between gap-6 lg:hidden">
            <button
              aria-controls="mobile-product-filters"
              aria-expanded={isDrawerOpen}
              className="type-label flex min-h-12 items-center gap-3"
              onClick={openDrawer}
              ref={drawerTriggerRef}
              type="button"
            >
              Filters
              <span className="grid min-h-6 min-w-6 place-items-center bg-foreground px-1 text-on-dark">
                {activeCount}
              </span>
            </button>
            <span className="type-caption text-muted">
              {filteredProducts.length} results
            </span>
          </div>
        </div>

        {activeCount > 0 ? (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {selectedCollection ? (
              <button
                className="filter-chip"
                onClick={() => commitFilters(filters, null)}
                type="button"
              >
                Collection: {selectedCollection.name}
                <span aria-hidden="true">×</span>
                <span className="sr-only">Remove collection filter</span>
              </button>
            ) : null}

            {productFilterKeys.flatMap((key) =>
              filters[key].map((value) => (
                <button
                  className="filter-chip"
                  key={`${key}-${value}`}
                  onClick={() =>
                    commitFilters(
                      toggleProductFilter(filters, key, value),
                      collectionId,
                    )
                  }
                  type="button"
                >
                  {value}
                  <span aria-hidden="true">×</span>
                  <span className="sr-only">Remove {value} filter</span>
                </button>
              )),
            )}

            <button
              className="type-label ml-2 min-h-11 border-b border-foreground"
              onClick={clearAll}
              type="button"
            >
              Clear all
            </button>
          </div>
        ) : null}

        <div className="product-results-enter mt-14 md:mt-20" key={queryString}>
          {filteredProducts.length > 0 ? (
            <ProductGrid
              collections={collections}
              products={filteredProducts}
            />
          ) : (
            <div className="border-y border-border py-20 text-center sm:py-28">
              <p className="type-label text-muted">No matching surfaces</p>
              <h3 className="type-h3 mt-5">Try a broader material view.</h3>
              <p className="type-body mt-5 text-muted">
                No development products match the selected filters.
              </p>
              <button
                className="text-link mt-9"
                onClick={clearAll}
                type="button"
              >
                Clear filters
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          )}
        </div>
      </Container>

      {isDrawerOpen ? (
        <dialog
          aria-labelledby="mobile-product-filters-title"
          aria-modal="true"
          className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-0 text-foreground backdrop:bg-surface-dark/65"
          id="mobile-product-filters"
          ref={drawerRef}
          onCancel={(event) => { event.preventDefault(); closeDrawer(); }}
        >
          <button
            aria-label="Close product filters"
            className="absolute inset-0 bg-surface-dark/65"
            data-filter-backdrop tabIndex={-1} aria-hidden="true"
            onClick={closeDrawer}
            type="button"
          />
          <div className="filter-drawer-enter absolute top-0 right-0 flex h-full w-[min(92vw,32rem)] flex-col bg-surface shadow-2xl">
            <div className="flex min-h-[var(--header-height)] items-center justify-between border-b border-border px-5">
              <div>
                <p className="type-label" id="mobile-product-filters-title">
                  Product filters
                </p>
                <p className="type-caption mt-1 text-muted">
                  {countProductFilters(draftFilters, draftCollectionId)}{" "}
                  selected
                </p>
              </div>
              <button
                aria-label="Close filters" data-drawer-close
                className="min-h-11 min-w-11 text-2xl"
                onClick={closeDrawer}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {draftCollectionId ? (
                <div className="flex min-h-14 items-center justify-between border-b border-border py-3">
                  <span className="text-sm">
                    Collection: {selectedCollection?.name ?? "Selected"}
                  </span>
                  <button
                    className="type-caption min-h-11"
                    onClick={() => setDraftCollectionId(null)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              ) : null}

              {filterGroups.map((group, index) => (
                <details className="border-b border-border" key={group.key}>
                  <summary className="type-label flex min-h-16 cursor-pointer list-none items-center justify-between">
                    <span>{group.label}</span>
                    <span className="text-muted">
                      {groupSelectionCount(draftFilters, group.key) > 0
                        ? groupSelectionCount(draftFilters, group.key)
                        : index === 0
                          ? "+"
                          : "·"}
                    </span>
                  </summary>
                  <fieldset className="pb-6">
                    <legend className="sr-only">
                      Filter products by {group.label}
                    </legend>
                    <p className="type-small mb-3 text-muted">
                      {group.description}
                    </p>
                    {group.options.map((option) => (
                      <FilterOptionControl
                        checked={draftFilters[group.key].includes(option.value)}
                        id={`mobile-${group.key}-${option.value.replaceAll(" ", "-")}`}
                        key={option.value}
                        label={option.label}
                        onChange={() =>
                          setDraftFilters((current) =>
                            toggleProductFilter(
                              current,
                              group.key,
                              option.value,
                            ),
                          )
                        }
                        swatch={option.swatch}
                      />
                    ))}
                  </fieldset>
                </details>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-border p-5">
              <button
                className="type-label min-h-12 border border-border"
                onClick={() => {
                  setDraftFilters(createEmptyProductFilters());
                  setDraftCollectionId(null);
                }}
                type="button"
              >
                Clear all
              </button>
              <button
                className="type-label min-h-12 bg-foreground px-4 text-on-dark"
                onClick={() => {
                  commitFilters(draftFilters, draftCollectionId);
                  closeDrawer();
                }}
                type="button"
              >
                Apply filters
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </Section>
  );
}
