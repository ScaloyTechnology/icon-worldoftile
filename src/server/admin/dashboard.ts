import "server-only";
import { getDb } from "@/server/db";

export type DashboardMetric = Readonly<{ label: string; value: number }>;
export type DashboardRecentItem = Readonly<{ id: string; type: string; title: string; status: string; updatedAt: string }>;
export type AdminDashboardData = Readonly<{
  databaseStatus: "connected" | "unavailable";
  metrics: readonly DashboardMetric[];
  recentItems: readonly DashboardRecentItem[];
}>;

const emptyMetrics: readonly DashboardMetric[] = [
  { label: "Products", value: 0 },
  { label: "Collections", value: 0 },
  { label: "Categories", value: 0 },
  { label: "Projects", value: 0 },
  { label: "Enquiries", value: 0 },
];

export async function getAdminDashboardData(): Promise<AdminDashboardData> {
  if (!process.env.DATABASE_URL) return { databaseStatus: "unavailable", metrics: emptyMetrics, recentItems: [] };
  try {
    const db = getDb();
    await db.$queryRaw`SELECT 1`;
    const [products, collections, categories, projects, enquiries, recentProducts, recentProjects] = await Promise.all([
      db.product.count(),
      db.collection.count(),
      db.productCategory.count(),
      db.project.count(),
      db.enquiry.count(),
      db.product.findMany({ orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, name: true, state: true, updatedAt: true } }),
      db.project.findMany({ orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, title: true, state: true, updatedAt: true } }),
    ]);
    const recentItems = [
      ...recentProducts.map((item) => ({ id: item.id, type: "Product", title: item.name, status: item.state, updatedAt: item.updatedAt.toISOString() })),
      ...recentProjects.map((item) => ({ id: item.id, type: "Project", title: item.title, status: item.state, updatedAt: item.updatedAt.toISOString() })),
    ].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)).slice(0, 6);
    return {
      databaseStatus: "connected",
      metrics: [
        { label: "Products", value: products },
        { label: "Collections", value: collections },
        { label: "Categories", value: categories },
        { label: "Projects", value: projects },
        { label: "Enquiries", value: enquiries },
      ],
      recentItems,
    };
  } catch {
    return { databaseStatus: "unavailable", metrics: emptyMetrics, recentItems: [] };
  }
}
