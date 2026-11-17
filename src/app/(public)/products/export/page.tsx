import { Suspense } from "react";
import { ProductsDiscoveryExperience } from "@/components/products/products-discovery-experience";
import { getProductDiscoveryForMarket } from "@/server/products/product-discovery";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import styles from "./export-products.module.css";

export const metadata = pageMetadata("Export Products", "Explore ICON tile surfaces for international projects.", "/products/export", true);
export const revalidate = 60;

export default function ExportProductsPage() {
  return <main className={`products-page ${styles.page}`} id="main">
    {indexable && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }, { name: "Export", path: "/products/export" }])) }} />}
    <Suspense fallback={<section className="products-library" data-route-pending aria-label="Loading export products"><p role="status">Loading materials...</p></section>}>
      <ExportProductLibrary />
    </Suspense>
  </main>;
}

async function ExportProductLibrary() {
  return <ProductsDiscoveryExperience data={await getProductDiscoveryForMarket("EXPORT")} variant="export" />;
}
