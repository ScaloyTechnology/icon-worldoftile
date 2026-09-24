"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const updateSchema = z.object({
  id: z.string().trim().min(1).max(64),
  status: z.enum(["NEW", "IN_PROGRESS", "CLOSED", "SPAM"]),
});

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item : "";
}

function safeReturnTo(value: string) {
  try {
    const url = new URL(value, "https://admin.local");
    if (url.origin !== "https://admin.local" || url.pathname !== "/admin/enquiries") return "/admin/enquiries";
    url.searchParams.delete("error");
    url.searchParams.delete("updated");
    return `${url.pathname}${url.search}`;
  } catch {
    return "/admin/enquiries";
  }
}

function resultUrl(returnTo: string, key: "error" | "updated", message: string) {
  const url = new URL(returnTo, "https://admin.local");
  url.searchParams.set(key, message);
  return `${url.pathname}${url.search}`;
}

export async function updateEnquiryStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const returnTo = safeReturnTo(value(formData, "returnTo"));
  const parsed = updateSchema.safeParse({
    id: value(formData, "id"),
    status: value(formData, "status"),
  });

  if (!parsed.success) redirect(resultUrl(returnTo, "error", "Invalid enquiry update."));

  try {
    await getDb().enquiry.update({
      where: { id: parsed.data.id },
      data: { status: parsed.data.status },
    });
  } catch (cause) {
    console.error("Enquiry status update failed", cause);
    redirect(resultUrl(returnTo, "error", "The enquiry status could not be updated."));
  }

  revalidatePath("/admin/enquiries");
  redirect(resultUrl(returnTo, "updated", "1"));
}
