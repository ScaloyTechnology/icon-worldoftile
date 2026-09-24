import listStyles from "@/components/admin/admin-list.module.css";
import { ProjectsAdminEditor } from "@/components/admin/projects-admin-editor";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getProjectsAdminData } from "@/server/projects/projects-admin-data";

export const dynamic = "force-dynamic";

type Query = Readonly<{ saved?: string; error?: string }>;

export default async function AdminProjectsPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let data: Awaited<ReturnType<typeof getProjectsAdminData>> | null = null;
  try { data = await getProjectsAdminData(); }
  catch (cause) { console.error("Projects editor could not be loaded", cause); }

  const savedMessage = query.saved === "story"
    ? "Project story saved and connected to Selected spaces."
    : query.saved === "archived"
      ? "Project story archived."
      : query.saved === "media"
        ? "Project page images saved and published."
        : "";

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Content" title="Projects / Gallery" description="Manage every Projects page image and the popup stories used by Selected spaces." />
    {query.error ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {savedMessage ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">{savedMessage}</p> : null}
    {!data ? <p className={listStyles.notice} role="alert">Project media is temporarily unavailable. The public page was not changed.</p> : null}
    {data ? <ProjectsAdminEditor data={data} /> : null}
  </main>;
}
