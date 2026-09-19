import {
  productFilterKeys,
  type Product,
  type ProductCollection,
  type ProductFilterGroup,
  type ProductFilterKey,
  type ProductFilters,
} from "@/types/products";

type SearchParamsReader = Pick<URLSearchParams, "get" | "getAll">;

export type MutableProductFilters = Record<ProductFilterKey, string[]>;
export type ProductSort = "featured" | "name";
export type ProductDiscoveryState = Readonly<{
  filters: MutableProductFilters;
  collectionId: string | null;
  query: string;
  sort: ProductSort;
}>;

export function createEmptyProductFilters(): MutableProductFilters {
  return {
    locations: [],
    sizes: [],
    finishes: [],
    surfaces: [],
    colors: [],
    looks: [],
    applications: [],
  };
}

export function cloneProductFilters(
  filters: ProductFilters,
): MutableProductFilters {
  return {
    locations: [...filters.locations],
    sizes: [...filters.sizes],
    finishes: [...filters.finishes],
    surfaces: [...filters.surfaces],
    colors: [...filters.colors],
    looks: [...filters.looks],
    applications: [...filters.applications],
  };
}

export function parseProductFilters(
  searchParams: SearchParamsReader,
  groups: readonly ProductFilterGroup[],
): MutableProductFilters {
  const filters = createEmptyProductFilters();

  groups.forEach((group) => {
    const validValues = new Set(group.options.map((option) => option.value));
    filters[group.key] = [...new Set(searchParams
      .getAll(group.param)
      .filter((value) => validValues.has(value)))];
  });

  return filters;
}

export function toggleProductFilter(
  filters: ProductFilters,
  key: ProductFilterKey,
  value: string,
): MutableProductFilters {
  const next = cloneProductFilters(filters);
  next[key] = next[key].includes(value)
    ? next[key].filter((item) => item !== value)
    : [...next[key], value];

  return next;
}

export function serializeProductFilters(
  filters: ProductFilters,
  groups: readonly ProductFilterGroup[],
  collectionId: string | null,
) {
  const params = new URLSearchParams();

  if (collectionId) {
    params.set("collection", collectionId);
  }

  groups.forEach((group) => {
    filters[group.key].forEach((value) => params.append(group.param, value));
  });

  return params.toString();
}

export function filterProducts(
  products: readonly Product[],
  filters: ProductFilters,
  collectionId: string | null,
  query = "",
) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return products.filter((product) => {
    if (collectionId && product.collectionId !== collectionId) {
      return false;
    }

    if (terms.length) {
      const searchable = [
        product.name,
        product.category,
        ...(product.keywords ?? []),
        ...product.sizes,
        ...product.colors,
        ...product.looks,
      ].join(" ").toLocaleLowerCase();
      if (!terms.every((term) => searchable.includes(term))) return false;
    }

    return productFilterKeys.every((key) => {
      const selected = filters[key];
      return (
        selected.length === 0 ||
        selected.some((value) => product[key].includes(value))
      );
    });
  });
}

export function sortProducts(products: readonly Product[], sort: ProductSort) {
  return [...products].sort((a, b) => sort === "name"
    ? a.name.localeCompare(b.name)
    : (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function parseProductDiscoveryState(
  searchParams: SearchParamsReader,
  groups: readonly ProductFilterGroup[],
  collections: readonly ProductCollection[],
): ProductDiscoveryState {
  const collection = searchParams.get("collection");
  const validCollection = collections.find((item) => item.slug === collection || item.id === collection);
  const query = (searchParams.get("q") ?? "").replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
  return {
    filters: parseProductFilters(searchParams, groups),
    collectionId: validCollection?.id ?? null,
    query,
    sort: searchParams.get("sort") === "name" ? "name" : "featured",
  };
}

export function serializeProductDiscoveryState(
  state: ProductDiscoveryState,
  groups: readonly ProductFilterGroup[],
  collections: readonly ProductCollection[],
) {
  const params = new URLSearchParams();
  const collection = collections.find((item) => item.id === state.collectionId);
  if (collection) params.set("collection", collection.slug);
  if (state.query) params.set("q", state.query);
  if (state.sort !== "featured") params.set("sort", state.sort);
  groups.forEach((group) => state.filters[group.key].forEach((value) => params.append(group.param, value)));
  return params.toString();
}

export function countProductFilters(
  filters: ProductFilters,
  collectionId: string | null,
) {
  return (
    productFilterKeys.reduce((count, key) => count + filters[key].length, 0) +
    (collectionId ? 1 : 0)
  );
}
