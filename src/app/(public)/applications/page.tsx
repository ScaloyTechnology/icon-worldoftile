import { ApplicationsExperience } from "@/components/applications/applications-experience";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getApplicationsPageData } from "@/server/applications/application-content";

const description = "Explore ICON surfaces across residential, commercial, hospitality, retail, office and outdoor architectural settings.";

export const metadata = pageMetadata("Applications", description, "/applications", true);
export const revalidate = 60;

export default async function ApplicationsPage() {
  const data = await getApplicationsPageData();
  return <>
    {indexable ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Applications", path: "/applications" },
    ])) }} /> : null}
    <ApplicationsExperience data={data} />
  </>;
}
