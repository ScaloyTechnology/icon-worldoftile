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

  return (
    <main className="home-page" id="main">
      {indexable && <script dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema(contactSettings)) }} type="application/ld+json" />}
      <ArchitecturalHero scenes={homepageContent.heroScenes} tiles={homepageContent.heroTiles} />
      <HomepageContent data={homepageContent} />
    </main>
  );
}
