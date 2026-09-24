import listStyles from "@/components/admin/admin-list.module.css";
import { HomepageMediaEditor } from "@/components/admin/homepage-media-editor";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getHomepageMediaEditorData } from "@/server/homepage/homepage-content-data";

export const dynamic = "force-dynamic";

type Query = Readonly<{ saved?: string; error?: string }>;

export default async function AdminHomepagePage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let unavailable = false;
  let data: Awaited<ReturnType<typeof getHomepageMediaEditorData>> | null = null;
  try { data = await getHomepageMediaEditorData(); }
  catch (cause) { console.error("Home Page media editor could not be loaded", cause); unavailable = true; }

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Content" title="Home Page" description="Manage homepage imagery while preserving the approved text, links, layout and animation effects." />
    {query.error ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved === "1" ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Home Page images saved and published successfully.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">Home Page media is temporarily unavailable. The public homepage was not changed.</p> : null}
    {data ? <HomepageMediaEditor data={data} /> : null}
  </main>;
}
