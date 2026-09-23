import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function EditProductPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }>) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const modal = new URLSearchParams({ editor: id });
  if (typeof query.error === "string") modal.set("error", query.error.slice(0, 240));
  redirect(`/admin/products?${modal}`);
}
