import { HomepageContent } from "@/components/home/homepage-content";
import { ProductShowcaseHero } from "@/components/home/product-showcase-hero/product-showcase-hero";
import { indexable, organizationSchema, pageMetadata, serializeSchema } from "@/lib/seo";
import { getHomepageContent } from "@/server/homepage/homepage-content-data";
import { getHomepageHeroProducts } from "@/server/homepage/product-showcase-data";

export const metadata = pageMetadata(
  "World of Tile",
  "Explore ICON through architectural spaces, tile surfaces and material studies.",
  "/",
  true,
);

export const revalidate = 60;

export default async function HomePage() {
  const [heroProducts, homepageContent] = await Promise.all([
    getHomepageHeroProducts(),
    getHomepageContent(),
  ]);

  return (
    <main className="home-page" id="main">
      {indexable && <script dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema()) }} type="application/ld+json" />}
      <ProductShowcaseHero products={heroProducts} />
      <HomepageContent data={homepageContent} />
    </main>
  );
}
