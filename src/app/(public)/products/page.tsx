import { Suspense } from "react";
import { ProductsDiscoveryExperience } from "@/components/products/products-discovery-experience";
import { ArchitecturalHero } from "@/components/products/architectural-hero/architectural-hero";
import { getProductHero } from "@/server/products/product-hero-data";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getProductDiscovery } from "@/server/products/product-discovery";

export const metadata = pageMetadata("Products", "Explore ICON tile surfaces, material studies and collections.", "/products", true);
export const revalidate = 60;

export default function ProductsPage() {
  return <main className="products-page" id="main">
    {indexable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }])) }} />}
    <Suspense fallback={<section data-route-pending style={{ minHeight: "100svh", background: "var(--icon-charcoal-black)", color: "var(--icon-ivory)", display: "grid", placeItems: "center" }}><p role="status">Preparing the material showcase...</p></section>}><ProductHero /></Suspense>
    <Suspense fallback={<section className="products-library" aria-label="Loading product library" />}><ProductLibrary /></Suspense>
  </main>;
}

async function ProductHero() {
  return <ArchitecturalHero categories={await getProductHero()} />;
}

async function ProductLibrary() {
  return <ProductsDiscoveryExperience data={await getProductDiscovery()} />;
}
