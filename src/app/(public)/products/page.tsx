import { Suspense } from "react";
import { ProductsDiscoveryExperience } from "@/components/products/products-discovery-experience";
// Tile carousel temporarily paused pending client revisions.
// import { ArchitecturalHero } from "@/components/products/architectural-hero/architectural-hero";
// import { getProductHero } from "@/server/products/product-hero-data";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getProductDiscoveryForMarket } from "@/server/products/product-discovery";

export const metadata = pageMetadata("Products", "Explore ICON tile surfaces, material studies and collections.", "/products", true);
export const revalidate = 60;

export default function ProductsPage() {
  // Remove the hero's header overlap while the carousel is paused.
  return <main className="products-page" id="main" style={{ marginTop: 0 }}>
    <h1 className="sr-only">ICON Products</h1>
    {indexable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }])) }} />}
    {/* Tile carousel temporarily paused pending client revisions.
    <Suspense fallback={<section data-route-pending style={{ minHeight: "100svh", background: "var(--icon-charcoal-black)", color: "var(--icon-ivory)", display: "grid", placeItems: "center" }}><p role="status">Preparing the material showcase...</p></section>}><ProductHero /></Suspense>
    */}
    <Suspense fallback={<section className="products-library" aria-label="Loading product library" />}><ProductLibrary /></Suspense>
  </main>;
}

// async function ProductHero() {
//   return <ArchitecturalHero categories={await getProductHero()} />;
// }

async function ProductLibrary() {
  return <ProductsDiscoveryExperience data={await getProductDiscoveryForMarket("DOMESTIC")} />;
}
