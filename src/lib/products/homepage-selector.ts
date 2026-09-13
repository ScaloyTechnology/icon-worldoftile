export type HeroCandidate<T> = { value: T | null; source: "configured-product" | "configured-collection" | "featured-product" };

/** Priority is explicit and stable; database return order can never pick the hero by accident. */
export function chooseHomepageHeroCandidate<T>(candidates: HeroCandidate<T>[]) {
  const order: HeroCandidate<T>["source"][] = ["configured-product", "configured-collection", "featured-product"];
  for (const source of order) {
    const candidate = candidates.find(item => item.source === source && item.value !== null);
    if (candidate) return candidate as { value: T; source: HeroCandidate<T>["source"] };
  }
  return null;
}
