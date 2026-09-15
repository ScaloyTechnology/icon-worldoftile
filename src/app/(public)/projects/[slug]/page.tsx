import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectDetailExperience } from "@/components/projects/project-detail-experience";
import { breadcrumbSchema, indexable, pageMetadata, serializeSchema } from "@/lib/seo";
import { getFallbackProjectSlugs, getProjectDetail } from "@/server/projects/project-detail";

type ProjectDetailPageProps = Readonly<{ params: Promise<{ slug: string }> }>;

export const dynamicParams = true;
export const revalidate = 60;

export function generateStaticParams() {
  return getFallbackProjectSlugs();
}

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProjectDetail(slug);
  if (!data) return pageMetadata("Project not found", "The requested ICON project could not be found.", `/projects/${slug}`);

  const metadataTitle = data.source === "database" ? `${data.project.title} | Projects` : "Project study | Projects";
  const metadata = pageMetadata(metadataTitle, data.seo.description, `/projects/${data.project.slug}`, !data.seo.noIndex);
  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      images: [{ url: data.project.heroMedia.src, alt: data.project.heroMedia.alt }],
    },
  };
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { slug } = await params;
  const data = await getProjectDetail(slug);
  if (!data) notFound();

  return <>
    {indexable && !data.seo.noIndex ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeSchema(breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Projects", path: "/projects" },
      { name: data.source === "database" ? data.project.title : "Project study", path: `/projects/${data.project.slug}` },
    ])) }} /> : null}
    <ProjectDetailExperience data={data} />
  </>;
}
