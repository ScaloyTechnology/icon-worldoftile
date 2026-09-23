import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export default async function NewProductPage({ searchParams }: Readonly<{ searchParams: Promise<{ error?: string }> }>) {
  const query = await searchParams;
  const params = new URLSearchParams({ editor: "new" });
  if (typeof query.error === "string") params.set("error", query.error.slice(0, 240));
  redirect(`/admin/products?${params}`);
}
