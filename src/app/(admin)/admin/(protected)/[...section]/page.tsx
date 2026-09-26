import { notFound } from "next/navigation";

import { AdminEmptyState, AdminPageHeader, AdminTableShell } from "@/components/admin/admin-ui";
import { getDb } from "@/server/db";
import styles from "./placeholder.module.css";

export const dynamic = "force-dynamic";

const modules = {
  projects: { title: "Projects / Gallery", description: "Project stories and approved gallery media for the public website.", noun: "project", count: () => getDb().project.count() },
  enquiries: { title: "Enquiries", description: "Customer enquiries submitted through the public website.", noun: "enquiry", count: () => getDb().enquiry.count() },
  contact: {
    title: "Contact information",
    description: "Published contact settings used by public experiences.",
    noun: "contact setting",
    count: () => getDb().siteSection.count({ where: { page: "global", key: "contact-settings" } }),
  },
} as const;

export default async function AdminPlaceholderPage({ params }: Readonly<{ params: Promise<{ section: string[] }> }>) {
  const { section } = await params;
  if (section.length !== 1) notFound();
  const key = section[0] as keyof typeof modules;
  const moduleConfig = modules[key];
  if (!moduleConfig) notFound();
  let count: number | null = null;
  try { count = await moduleConfig.count(); } catch (error) { console.error(`${moduleConfig.title} count could not be loaded`, error); }

  return <main className={styles.page}>
    <AdminPageHeader eyebrow="Protected module" title={moduleConfig.title} description={moduleConfig.description} />
    <AdminTableShell><AdminEmptyState title={`${moduleConfig.title} management is not enabled yet.`}>
      {count === null ? "The existing records remain protected in the database." : `${count} existing ${moduleConfig.noun}${count === 1 ? "" : "s"} detected. No editing controls have been fabricated.`}
    </AdminEmptyState></AdminTableShell>
  </main>;
}
