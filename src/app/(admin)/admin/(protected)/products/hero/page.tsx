import Link from "next/link";
import listStyles from "@/components/admin/admin-list.module.css";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { HomepageMediaEditor } from "@/components/admin/homepage-media-editor";
import { getProductHeroEditorData } from "@/server/products/product-hero-data";

export const dynamic = "force-dynamic";

export default async function ProductHeroEditor({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const query = await searchParams;
  let data: Awaited<ReturnType<typeof getProductHeroEditorData>> | null = null;
  try { data = await getProductHeroEditorData(); }
  catch (error) { console.error("Product hero editor unavailable", error); }
  return <main className={listStyles.page}>
    <AdminPageHeader eyebrow="Products" title="Products hero" description="Manage the tile carousel on the Products page. The home page frame sequence remains fixed." />
    <p><Link href="/admin/products">Back to products</Link> · <Link href="/products" target="_blank" rel="noreferrer">View Products page</Link></p>
    {query.error && <p className={listStyles.notice} role="alert">{query.error.slice(0, 240)}</p>}
    {query.saved === "1" && <p className={`${listStyles.notice} ${listStyles.success}`} role="status">Products hero saved and published.</p>}
    {data ? <HomepageMediaEditor data={data} destination="products" /> : <p className={listStyles.notice} role="alert">The hero settings could not be loaded. Please try again.</p>}
  </main>;
}
