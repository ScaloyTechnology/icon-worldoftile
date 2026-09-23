import { notFound } from "next/navigation";

import { AdminEmptyState, AdminPageHeader, AdminTableShell } from "@/components/admin/admin-ui";
import { getDb } from "@/server/db";
import styles from "./placeholder.module.css";

export const dynamic = "force-dynamic";

const modules = {
  categories: { title: "Categories", description: "Product category records used by catalogue classification.", noun: "category", count: () => getDb().productCategory.count() },
  specifications: { title: "Product specifications", description: "Specification definitions used by Product technical details.", noun: "specification definition", count: () => getDb().specificationDefinition.count() },
  projects: { title: "Projects / Gallery", description: "Project stories and approved gallery media for the public website.", noun: "project", count: () => getDb().project.count() },
  enquiries: { title: "Enquiries", description: "Customer enquiries submitted through the public website.", noun: "enquiry", count: () => getDb().enquiry.count() },
  contact: { title: "Contact information", description: "Verified location and contact records used by public experiences.", noun: "location", count: () => getDb().location.count() },
} as const;

export default async function AdminPlaceholderPage({ params }: Readonly<{ params: Promise<{ section: string[] }> }>) {
  const { section } = await params;
  if (section.length !== 1) notFound();
  const key = section[0] as keyof typeof modules;
  const module = modules[key];
  if (!module) notFound();
  let count: number | null = null;
  try { count = await module.count(); } catch (error) { console.error(`${module.title} count could not be loaded`, error); }

  return <main className={styles.page}>
    <AdminPageHeader eyebrow="Protected module" title={module.title} description={module.description} />
    <AdminTableShell><AdminEmptyState title={`${module.title} management is not enabled yet.`}>
      {count === null ? "The existing records remain protected in the database." : `${count} existing ${module.noun}${count === 1 ? "" : "s"} detected. No editing controls have been fabricated.`}
    </AdminEmptyState></AdminTableShell>
  </main>;
}
