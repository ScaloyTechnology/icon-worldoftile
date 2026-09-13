import { MeetIconExperience } from "@/components/meet-icon/meet-icon-experience";
import { breadcrumbSchema, indexable, organizationSchema, pageMetadata, serializeSchema } from "@/lib/seo";
import { getMeetIconPageData } from "@/server/meet-icon/meet-icon-data";

export const metadata = pageMetadata(
  "Meet ICON",
  "Discover ICON's verified 38-year story, company journey, technology, manufacturing process, surface innovation and global presence.",
  "/meet-icon",
  true,
);

export const revalidate = 60;

export default async function MeetIconPage() {
  const { content } = await getMeetIconPageData();

  return (
    <>
      {indexable ? (
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(organizationSchema()) }} />
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Meet ICON", path: "/meet-icon" }])) }} />
        </>
      ) : null}
      <MeetIconExperience content={content} />
    </>
  );
}
