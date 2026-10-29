import { Suspense } from "react";
import { FrameHero } from "@/components/home/frame-hero/frame-hero";
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

export default function HomePage() {

  return (
    <main className="home-page" id="main">
      <FrameHero />
      <Suspense fallback={<section data-route-pending style={{ minHeight: "60svh", background: "#000" }} aria-label="Loading more about ICON" />}><HomeContent /></Suspense>
    </main>
  );
}

async function HomeContent() {
  const [homepageContent, contactSettings] = await Promise.all([getHomepageContent(), getContactSettings()]);
  return <>{indexable && <script dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema(contactSettings)) }} type="application/ld+json" />}<HomepageContent data={homepageContent} /></>;
}
