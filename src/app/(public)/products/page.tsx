import { ProductsDiscoveryExperience } from "@/components/products/products-discovery-experience";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getProductDiscovery } from "@/server/products/product-discovery";

export const metadata = pageMetadata("Products", "Explore ICON tile surfaces, material studies and collections.", "/products", true);
export const revalidate = 60;

export default async function ProductsPage() {
  const data = await getProductDiscovery();
  return <>{indexable ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Products", path: "/products" }])) }} /> : null}<ProductsDiscoveryExperience data={data} /></>;
}
