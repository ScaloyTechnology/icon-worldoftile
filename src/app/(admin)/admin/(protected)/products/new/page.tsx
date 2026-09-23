import { ProductEditor } from "@/components/admin/product-editor";
import { getProductEditorData } from "@/server/admin/product-editor-data";

export const dynamic = "force-dynamic";
export default async function NewProductPage({ searchParams }: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const [data, query] = await Promise.all([getProductEditorData(), searchParams]);
  return <ProductEditor data={data} error={typeof query.error === "string" ? query.error.slice(0, 240) : undefined} />;
}
