import { ProjectsExperience } from "@/components/projects/projects-experience";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getProjectsPageData } from "@/server/projects/projects-page";

const description = "Explore ICON's architectural project gallery and surface studies in context.";

export const metadata = pageMetadata("Projects", description, "/projects", true);
export const revalidate = 60;

export default async function ProjectsPage() {
  const data = await getProjectsPageData();
  return <>
    {indexable ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Projects", path: "/projects" },
    ])) }} /> : null}
    <ProjectsExperience data={data} />
  </>;
}
