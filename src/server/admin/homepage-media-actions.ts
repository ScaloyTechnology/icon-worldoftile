"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { homepageMediaPayloadSchema } from "@/server/homepage/homepage-content-data";
import { HOMEPAGE_ARTWORK_REVISION } from "@/content/homepage-art-direction";

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function values(formData: FormData, name: string) {
  return formData.getAll(name).map((entry) => typeof entry === "string" ? entry.trim() : "");
}

function errorUrl(message: string) {
  return `/admin/home?error=${encodeURIComponent(message)}`;
}

export async function saveHomepageMedia(formData: FormData): Promise<void> {
  await requireAdmin();
  const parsed = homepageMediaPayloadSchema.safeParse({
    artworkRevision: HOMEPAGE_ARTWORK_REVISION,
    heroTileMediaIds: values(formData, "heroTileMediaId"),
    heroTitles: values(formData, "heroTitle"),
    heroInteriorMediaIds: values(formData, "heroInteriorMediaId"),
    houseMainMediaId: value(formData, "houseMainMediaId"),
    houseDetailMediaId: value(formData, "houseDetailMediaId"),
    surfaceMediaIds: values(formData, "surfaceMediaId"),
  });

  if (!parsed.success) {
    const titleIssue = parsed.error.issues.find((issue) => issue.path[0] === "heroTitles");
    redirect(errorUrl(titleIssue
      ? "Enter a product title of 1–80 characters for each of the eight hero items."
      : "The Home Page media form was incomplete. Refresh the page and try again."));
  }
  const missingTitle = parsed.data.heroTitles.findIndex((title) => !title);
  if (missingTitle >= 0) redirect(errorUrl(`Enter a product title for hero item ${missingTitle + 1}.`));

  try {
    const db = getDb();
    const selectedIds = [...new Set([
      ...parsed.data.heroTileMediaIds,
      ...parsed.data.heroInteriorMediaIds,
      parsed.data.houseMainMediaId,
      parsed.data.houseDetailMediaId,
      ...parsed.data.surfaceMediaIds,
    ].filter(Boolean))];
    if (selectedIds.length) {
      const approvedCount = await db.mediaAsset.count({
        where: { id: { in: selectedIds }, approved: true, mimeType: { startsWith: "image/" } },
      });
      if (approvedCount !== selectedIds.length) throw new Error("MEDIA");
    }

    const payload = parsed.data as Prisma.InputJsonValue;
    await db.$transaction(async (transaction) => {
      const section = await transaction.siteSection.upsert({
        where: { page_key: { page: "home", key: "media" } },
        create: { page: "home", key: "media", state: "PUBLISHED", sortOrder: 0 },
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
    console.error("Homepage media save failed", cause);
    redirect(errorUrl(cause instanceof Error && cause.message === "MEDIA"
      ? "One or more selected images are no longer approved. Replace them and try again."
      : "Home Page content could not be saved. The public page was not changed."));
  }

  revalidatePath("/");
  revalidatePath("/admin/home");
  redirect("/admin/home?saved=1");
}
