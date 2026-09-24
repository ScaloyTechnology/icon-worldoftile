"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { contactSettingsPayloadSchema } from "@/server/site/contact-settings";
import { getDb } from "@/server/db";

function value(formData: FormData, name: string) {
  const item = formData.get(name);
  return typeof item === "string" ? item.trim() : "";
}

function values(formData: FormData, name: string) {
  return formData.getAll(name).map((item) => typeof item === "string" ? item.trim() : "");
}

function errorUrl(message: string) {
  return `/admin/contact?error=${encodeURIComponent(message)}`;
}

export async function saveContactSettings(formData: FormData): Promise<void> {
  await requireAdmin();
  const socialLabels = values(formData, "socialLabel");
  const socialUrls = values(formData, "socialUrl");
  const unitIds = values(formData, "unitId");
  const unitNames = values(formData, "unitName");
  const unitAddresses = values(formData, "unitAddress");
  const unitMaps = values(formData, "unitMapUrl");

  const parsed = contactSettingsPayloadSchema.safeParse({
    logoMediaId: value(formData, "logoMediaId"),
    domestic: { label: value(formData, "domesticLabel"), phone: value(formData, "domesticPhone"), email: value(formData, "domesticEmail") },
    export: { label: value(formData, "exportLabel"), phone: value(formData, "exportPhone"), email: value(formData, "exportEmail") },
    socials: socialLabels.map((label, index) => ({ label, href: socialUrls[index] ?? "" })),
    units: unitIds.map((id, index) => ({
      id,
      name: unitNames[index] ?? "",
      addressLines: (unitAddresses[index] ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
      mapUrl: unitMaps[index] ?? "",
    })),
  });

  if (!parsed.success) redirect(errorUrl("Check all required contact, social link and address fields."));

  try {
    const db = getDb();
    const payload = parsed.data as Prisma.InputJsonValue;
    if (parsed.data.logoMediaId) {
      const validLogo = await db.mediaAsset.count({ where: { id: parsed.data.logoMediaId, approved: true, mimeType: { startsWith: "image/" } } });
      if (!validLogo) throw new Error("LOGO");
    }
    await db.$transaction(async (transaction) => {
      const section = await transaction.siteSection.upsert({
        where: { page_key: { page: "global", key: "contact-settings" } },
        create: { page: "global", key: "contact-settings", state: "PUBLISHED", sortOrder: 0 },
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
    console.error("Contact settings save failed", cause);
    redirect(errorUrl(cause instanceof Error && cause.message === "LOGO" ? "Choose an approved image for the website logo." : "Contact information could not be saved. No public content was changed."));
  }

  revalidatePath("/", "layout");
  revalidatePath("/contact");
  revalidatePath("/admin/contact");
  redirect("/admin/contact?saved=1");
}
