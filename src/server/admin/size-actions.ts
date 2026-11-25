"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { deleteSizeMaster, revalidateSizeConsumers, saveSizeMaster, sizeErrorMessage, sizeSchema } from "@/server/admin/size-master";
import { requireAdmin } from "@/server/auth/session";

export async function saveSize(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().max(64).safeParse(form.get("id") ?? "");
  const parsed = sizeSchema.safeParse({ label: form.get("label"), widthMm: form.get("widthMm"), lengthMm: form.get("lengthMm") });
  if (!id.success || !parsed.success) redirect("/admin/sizes?error=" + encodeURIComponent("Enter a Size label and positive dimensions with at most two decimal places."));
  let issue = "";
  let reused = false;
  try {
    const result = await saveSizeMaster(parsed.data, id.data || undefined);
    reused = result.reused;
  } catch (cause) {
    console.error("Size save failed", cause);
    issue = sizeErrorMessage(cause);
  }
  if (issue) redirect(`/admin/sizes?editor=${encodeURIComponent(id.data || "new")}&error=${encodeURIComponent(issue)}`);
  revalidateSizeConsumers();
  redirect(`/admin/sizes?saved=${reused ? "existing" : "1"}`);
}

export async function deleteSize(form: FormData): Promise<void> {
  await requireAdmin();
  const id = z.string().min(1).max(64).safeParse(form.get("id"));
  if (!id.success) redirect("/admin/sizes?error=Choose+a+valid+Size.");
  let issue = "";
  try { await deleteSizeMaster(id.data); }
  catch (cause) { console.error("Size deletion failed", cause); issue = sizeErrorMessage(cause); }
  if (issue) redirect(`/admin/sizes?error=${encodeURIComponent(issue)}`);
  revalidateSizeConsumers();
  redirect("/admin/sizes?deleted=1");
}
