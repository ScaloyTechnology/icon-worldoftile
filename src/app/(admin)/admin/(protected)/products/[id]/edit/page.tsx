import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { getProductEditorData } from "@/server/admin/product-editor-data";

export const dynamic = "force-dynamic";
export default async function EditProductPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; saved?: string }> }>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getProductEditorData(id);
  if (!data.product) notFound();
  return <ProductEditor data={data} error={typeof query.error === "string" ? query.error.slice(0, 240) : undefined} saved={query.saved === "1"} />;
}
