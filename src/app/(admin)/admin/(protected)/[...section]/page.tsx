import { notFound } from "next/navigation";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

const modules: Record<string, Readonly<{ title: string; description: string; phase: string }>> = {
  products: { title: "Products", description: "Product management will be connected after Categories, Collections and Product Masters are established.", phase: "Phase 3" },
  "products/new": { title: "Add product", description: "The product editor will be introduced with the complete Product Management phase.", phase: "Phase 3" },
  categories: { title: "Categories", description: "Category structure and management are scheduled for the next admin implementation phase.", phase: "Phase 2" },
  collections: { title: "Collections", description: "Collection management and ordering are scheduled for the next admin implementation phase.", phase: "Phase 2" },
  "product-masters": { title: "Product masters", description: "Reusable product master definitions are scheduled for the next admin implementation phase.", phase: "Phase 2" },
  projects: { title: "Projects", description: "Project and gallery management will be connected after Product Management.", phase: "Phase 4" },
  "projects/new": { title: "Add project", description: "The project editor will be introduced with the complete Projects and Gallery phase.", phase: "Phase 4" },
  "project-categories": { title: "Project categories", description: "Project category controls will arrive with the Projects and Gallery phase.", phase: "Phase 4" },
  enquiries: { title: "Enquiries", description: "Enquiry review and status management will be connected in its dedicated phase.", phase: "Phase 5" },
  catalogues: { title: "Catalogues", description: "Catalogue publication and file management will be connected after Enquiries.", phase: "Phase 6" },
  technical: { title: "Technical sheets", description: "Technical document management will be connected with Catalogues and Certifications.", phase: "Phase 6" },
  certifications: { title: "Certifications", description: "Certification records and approved documents will be connected in the content-document phase.", phase: "Phase 6" },
  media: { title: "Media", description: "Central media management will be enabled alongside the modules that require uploads.", phase: "Future phase" },
  "settings/contact": { title: "Contact information", description: "Website contact information will be connected during frontend synchronisation.", phase: "Phase 7" },
  "settings/social": { title: "Social links", description: "Social profile settings will be connected during frontend synchronisation.", phase: "Phase 7" },
};

export default async function AdminModulePage({ params }: Readonly<{ params: Promise<{ section: string[] }> }>) {
  const key = (await params).section.join("/");
  const module = modules[key];
  if (!module) notFound();
  return <AdminPlaceholder {...module} />;
}
