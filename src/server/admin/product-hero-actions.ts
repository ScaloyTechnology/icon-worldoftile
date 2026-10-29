"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { productHeroPayloadSchema } from "@/server/products/product-hero-data";

const editor = "/admin/products/hero";
export async function saveProductHero(formData: FormData): Promise<void> {
  await requireAdmin();
  const values = (name: string) => formData.getAll(name).map(value => typeof value === "string" ? value.trim() : "");
  const parsed = productHeroPayloadSchema.safeParse({ tileMediaIds: values("heroTileMediaId"), titles: values("heroTitle"), interiorMediaIds: values("heroInteriorMediaId") });
  if (!parsed.success) redirect(`${editor}?error=${encodeURIComponent("Enter all eight tile titles (1–80 characters) and refresh any incomplete image fields.")}`);
  try {
    const db = getDb();
    const ids = [...new Set([...parsed.data.tileMediaIds, ...parsed.data.interiorMediaIds].filter(Boolean))];
    if (ids.length && await db.mediaAsset.count({ where: { id: { in: ids }, approved: true, mimeType: { startsWith: "image/" } } }) !== ids.length) throw new Error("MEDIA");
    const payload = parsed.data as Prisma.InputJsonValue;
    await db.$transaction(async transaction => {
      const section = await transaction.siteSection.upsert({
        where: { page_key: { page: "products", key: "hero" } },
        create: { page: "products", key: "hero", state: "PUBLISHED", sortOrder: 0 }, update: { state: "PUBLISHED" }, select: { id: true },
      });
      await transaction.siteContent.upsert({
        where: { sectionId_locale: { sectionId: section.id, locale: "en" } },
        create: { sectionId: section.id, locale: "en", payload, version: 1 }, update: { payload, version: { increment: 1 } },
      });
    });
  } catch (error) {
    console.error("Product hero save failed", error);
    redirect(`${editor}?error=${encodeURIComponent(error instanceof Error && error.message === "MEDIA" ? "An uploaded image is no longer available. Replace it and save again." : "The Products hero could not be saved. Please try again.")}`);
  }
  revalidatePath("/products"); revalidatePath(editor);
  redirect(`${editor}?saved=1`);
}
