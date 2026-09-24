import { ContactSettingsEditor } from "@/components/admin/contact-settings-editor";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import listStyles from "@/components/admin/admin-list.module.css";
import { getContactSettingsEditorData } from "@/server/site/contact-settings";

export const dynamic = "force-dynamic";

type Query = Readonly<{ saved?: string; error?: string }>;

export default async function AdminContactPage({ searchParams }: Readonly<{ searchParams: Promise<Query> }>) {
  const query = await searchParams;
  let unavailable = false;
  let data: Awaited<ReturnType<typeof getContactSettingsEditorData>> | null = null;
  try { data = await getContactSettingsEditorData(); }
  catch (cause) { console.error("Contact settings editor could not be loaded", cause); unavailable = true; }

  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Settings" title="Contact information" description="Manage the public website logo, enquiry contacts, social links and addresses from one published source." />
    {query.error ? <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p> : null}
    {query.saved === "1" ? <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Contact information saved and published across the website.</p> : null}
    {unavailable ? <p className={listStyles.notice} role="alert">Contact information is temporarily unavailable. No public content was changed.</p> : null}
    {data ? <ContactSettingsEditor data={data} /> : null}
  </main>;
}
