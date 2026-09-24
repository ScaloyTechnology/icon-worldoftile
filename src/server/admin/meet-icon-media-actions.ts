"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { meetIconMediaPayloadSchema } from "@/server/meet-icon/meet-icon-data";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function values(formData: FormData, name: string) {
  return formData.getAll(name).map((entry) => typeof entry === "string" ? entry.trim() : "");
}

function errorUrl(message: string) {
  return `/admin/meet-icon?error=${encodeURIComponent(message)}`;
}

export async function saveMeetIconMedia(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = meetIconMediaPayloadSchema.safeParse({
    heroMediaId: value(formData, "heroMediaId"),
    journeyMediaIds: values(formData, "journeyMediaId"),
    manufacturingMediaIds: values(formData, "manufacturingMediaId"),
    technologyMediaIds: values(formData, "technologyMediaId"),
    finalCtaMediaId: value(formData, "finalCtaMediaId"),
  });

  if (!parsed.success) redirect(errorUrl("The Meet ICON media form was incomplete. Refresh the page and try again."));

  try {
    const db = getDb();
    const selectedIds = [...new Set([
      parsed.data.heroMediaId,
      ...parsed.data.journeyMediaIds,
      ...parsed.data.manufacturingMediaIds,
      ...parsed.data.technologyMediaIds,
      parsed.data.finalCtaMediaId,
    ].filter(Boolean))];
    if (selectedIds.length) {
      const approvedCount = await db.mediaAsset.count({ where: { id: { in: selectedIds }, approved: true, mimeType: { startsWith: "image/" } } });
      if (approvedCount !== selectedIds.length) throw new Error("MEDIA");
    }

    const payload = parsed.data as Prisma.InputJsonValue;
    await db.$transaction(async (transaction) => {
      const section = await transaction.siteSection.upsert({
        where: { page_key: { page: "meet-icon", key: "media" } },
        create: { page: "meet-icon", key: "media", state: "PUBLISHED", sortOrder: 0 },
        update: { state: "PUBLISHED" },
        select: { id: true },
      });
      await transaction.siteContent.upsert({
        where: { sectionId_locale: { sectionId: section.id, locale: "en" } },
        create: { sectionId: section.id, locale: "en", payload, version: 1 },
        update: { payload, version: { increment: 1 } },
      });
    });
  } catch (cause) {
    console.error("Meet ICON media save failed", cause);
    redirect(errorUrl(cause instanceof Error && cause.message === "MEDIA" ? "One or more selected images are no longer approved. Replace them and try again." : "Meet ICON images could not be saved. The public page was not changed."));
  }

  revalidatePath("/meet-icon");
  revalidatePath("/admin/meet-icon");
  redirect("/admin/meet-icon?saved=1");
}
