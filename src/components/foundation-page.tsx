import Link from "next/link";

import { Arrow } from "@/components/arrow";
import { routeContent } from "@/content/site";
import { pageMetadata } from "@/lib/seo";

export type FoundationSearchParams = Promise<Record<string, string | string[] | undefined>>;

export function foundationPageMetadata(section: string) {
  const page = routeContent[section];
  if (!page) throw new Error(`Unknown foundation route: ${section}`);
  return pageMetadata(page.eyebrow, page.description, `/${section}`);
}

export async function FoundationPage({
  section,
  searchParams,
}: {
  section: string;
  searchParams?: FoundationSearchParams;
}) {
  const page = routeContent[section];
  if (!page) throw new Error(`Unknown foundation route: ${section}`);
  const query = searchParams ? await searchParams : {};
  const selected = ["look", "collection", "surface", "application"].flatMap((key) =>
    typeof query[key] === "string" ? [`${key}: ${query[key].slice(0, 80)}`] : [],
  );

  return (
    <main id="main" className={`holding-page holding-page--${section} section`}>
      <p className="eyebrow">{page.eyebrow} / Phase 1 foundation</p>
      <h1>{page.title}</h1>
      <p className="holding-description">{page.description}</p>
      {selected.length > 0 && (
        <p className="selected-context">Discovery context: {selected.join(" · ")}. Filtering will become available in Phase 2.</p>
      )}
      <div className="holding-details">
        <h2>Content in preparation</h2>
        <ul>{page.pending.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <p className="content-note">This section is reserved for a later development phase.</p>
      <Link href="/" className="text-link">Return to the homepage<Arrow /></Link>
    </main>
  );
}
