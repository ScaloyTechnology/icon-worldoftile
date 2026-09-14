import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailExperience } from "@/components/products/product-detail-experience";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getFallbackProductSlugs, getProductDetail } from "@/server/products/product-detail";

type ProductDetailPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export const dynamicParams = true;
export const revalidate = 60;

export function generateStaticParams() {
  return getFallbackProductSlugs();
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductDetail(slug);
  if (!data) return pageMetadata("Product not found", "The requested ICON material could not be found.", `/products/${slug}`);

  const metadata = pageMetadata(data.product.name, data.description, `/products/${slug}`, true);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: data.product.primaryMedia.src ? [{ url: data.product.primaryMedia.src, alt: data.product.primaryMedia.alt }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;
  const data = await getProductDetail(slug);
  if (!data) notFound();

  return <>
    {indexable ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
      { name: data.product.name, path: `/products/${data.product.slug}` },
    ])) }} /> : null}
    <ProductDetailExperience data={data} />
  </>;
}
