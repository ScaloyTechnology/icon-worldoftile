import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <div className="admin-shell"><aside className="admin-sidebar"><Link href="/" className="wordmark"><span>ICON</span><small>CONTENT STUDIO</small></Link><nav aria-label="Admin navigation"><Link href="/admin" aria-current="page">Dashboard</Link><Link href="/">View website ↗</Link></nav><p className="eyebrow">Next phases</p><nav aria-label="Planned modules">{["Products", "Attributes", "Collections", "Media", "Projects", "Catalogues", "Applications", "Certifications", "Enquiries", "Locations", "Site content", "SEO", "Admin users"].map(label => <span key={label}>{label}<small>Planned</small></span>)}</nav></aside><div><header className="admin-header"><p>Content studio / Dashboard</p><p>{admin.name} · {admin.role.name}</p><form action="/api/admin/logout" method="post"><button className="button secondary">Sign out</button></form></header>{children}</div></div>;
}
