"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const catalogueSchema = z.object({
  id: z.string().trim().max(64),
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(180),
  coverId: z.string().trim().min(1).max(64),
  pdfId: z.string().trim().min(1).max(64),
  state: z.enum(["DRAFT", "PUBLISHED"]),
});

function value(form: FormData, name: string) {
  const entry = form.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function errorCode(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : "";
}

function editorError(id: string, message: string) {
  return `/admin/catalogues?editor=${encodeURIComponent(id || "new")}&error=${encodeURIComponent(message)}`;
}

function revalidateCataloguePages() {
  revalidatePath("/catalogues");
  revalidatePath("/admin/catalogues");
}

export async function saveCatalogue(form: FormData): Promise<void> {
  await requireAdmin();
  const submittedId = value(form, "id");
  const parsed = catalogueSchema.safeParse({
    id: submittedId,
    title: value(form, "title"),
    slug: value(form, "slug"),
    coverId: value(form, "coverId"),
    pdfId: value(form, "pdfId"),
    state: value(form, "state"),
  });
  if (!parsed.success) redirect(editorError(submittedId, "Complete the title, slug, cover image and PDF file."));

  try {
    const db = getDb();
    const assets = await db.mediaAsset.findMany({
      where: { id: { in: [parsed.data.coverId, parsed.data.pdfId] }, approved: true },
      select: { id: true, mimeType: true },
    });
    const cover = assets.find((asset) => asset.id === parsed.data.coverId);
    const pdf = assets.find((asset) => asset.id === parsed.data.pdfId);
    if (!cover?.mimeType.startsWith("image/") || pdf?.mimeType !== "application/pdf") throw new Error("MEDIA");

    const data = {
      title: parsed.data.title,
      slug: parsed.data.slug,
      coverId: parsed.data.coverId,
      pdfId: parsed.data.pdfId,
      state: parsed.data.state,
      emailCaptureRequired: true,
      publishedAt: parsed.data.state === "PUBLISHED" ? new Date() : null,
    };
    if (parsed.data.id) await db.catalogue.update({ where: { id: parsed.data.id }, data });
    else await db.catalogue.create({ data });
  } catch (cause) {
    console.error("Catalogue save failed", cause);
    const message = cause instanceof Error && cause.message === "MEDIA"
      ? "Choose an approved cover image and PDF file."
      : errorCode(cause) === "P2002"
        ? "That catalogue URL slug is already in use."
        : "The catalogue could not be saved.";
    redirect(editorError(submittedId, message));
  }

  revalidateCataloguePages();
  redirect("/admin/catalogues?saved=1");
}

export async function archiveCatalogue(id: string, _form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.string().trim().min(1).max(64).safeParse(id);
  if (!parsed.success) redirect("/admin/catalogues?error=Invalid%20catalogue.");
  try {
    await getDb().catalogue.update({ where: { id: parsed.data }, data: { state: "ARCHIVED", publishedAt: null } });
  } catch (cause) {
    console.error("Catalogue archive failed", cause);
    redirect("/admin/catalogues?error=The%20catalogue%20could%20not%20be%20archived.");
  }
  revalidateCataloguePages();
  redirect("/admin/catalogues?archived=1");
}
