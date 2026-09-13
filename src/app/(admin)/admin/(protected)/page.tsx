import { getDb } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
export default async function Dashboard() {
  await requireAdmin();
  const db = getDb();
  const [products, projects, enquiries] = await Promise.all([db.product.count(), db.project.count(), db.enquiry.count()]);
  return <main className="admin-main"><p className="eyebrow">Phase 1 / Foundation</p><h1>The world of ICON, in one place.</h1><p>The content foundation is ready. Product and content management will follow in the next phases.</p><div className="admin-stats">{[["Products", products], ["Projects", projects], ["Enquiries", enquiries]].map(([name, value]) => <div key={name}><strong>{value}</strong><span>{name} in the database</span></div>)}</div><section className="admin-panel"><h2>Content awaiting client input</h2><ul><li>Brand Identity Book, approved copy and company milestones</li><li>Product master spreadsheet and verified image relationships</li><li>Catalogue PDFs, technical sheets and certifications</li><li>Project stories and photography credits</li><li>Plant locations, contact details and enquiry routing</li></ul></section><section className="admin-panel"><h2>Publication status</h2><p>The public site uses clearly identified editorial development content. No product records are seeded or published automatically.</p></section></main>;
}
