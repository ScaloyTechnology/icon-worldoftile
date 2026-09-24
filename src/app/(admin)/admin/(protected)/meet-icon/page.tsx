import listStyles from "@/components/admin/admin-list.module.css";
import { MeetIconMediaEditor } from "@/components/admin/meet-icon-media-editor";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { getMeetIconMediaEditorData } from "@/server/meet-icon/meet-icon-data";

export const dynamic = "force-dynamic";

type Query = Readonly<{ saved?: string; error?: string }>;

export default async function AdminMeetIconPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let unavailable = false;
  let data: Awaited<ReturnType<typeof getMeetIconMediaEditorData>> | null = null;
  try { data = await getMeetIconMediaEditorData(); }
  catch (cause) { console.error("Meet ICON media editor could not be loaded", cause); unavailable = true; }

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Content" title="Meet ICON" description="Manage the approved imagery used throughout the Meet ICON story. Page copy, ordering and animations remain protected." />
    {query.error ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved === "1" ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Meet ICON images saved and published successfully.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">Meet ICON media is temporarily unavailable. The public page was not changed.</p> : null}
    {data ? <MeetIconMediaEditor data={data} /> : null}
  </main>;
}
