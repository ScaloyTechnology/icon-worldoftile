import { ArchitecturalHero } from "@/components/home/architectural-hero/architectural-hero";
import { HomepageContent } from "@/components/home/homepage-content";
import { indexable, organizationSchema, pageMetadata, serializeSchema } from "@/lib/seo";
import { getHomepageContent } from "@/server/homepage/homepage-content-data";
import { getContactSettings } from "@/server/site/contact-settings";

export const metadata = pageMetadata(
  "World of Tile",
  "Explore ICON through architectural spaces, tile surfaces and material studies.",
  "/",
  true,
);

export const revalidate = 60;

export default async function HomePage() {
  const [homepageContent, contactSettings] = await Promise.all([getHomepageContent(), getContactSettings()]);
  const heroCategories = homepageContent.heroCategories ?? homepageContent.heroTiles.slice(0, 8).map((tile) => ({
    id: tile.id,
    title: tile.name,
    productImage: tile.image,
    interiorImage: tile.image,
  }));

  return (
    <main className="home-page" id="main">
      {indexable && <script dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema(contactSettings)) }} type="application/ld+json" />}
      <ArchitecturalHero categories={heroCategories} />
      <HomepageContent data={homepageContent} />
    </main>
  );
}
