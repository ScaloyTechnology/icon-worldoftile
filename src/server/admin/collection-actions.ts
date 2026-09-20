"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { mediaUrl } from "@/lib/media";
import { getDb } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";

const collectionInput = z.object({
  id: z.string().max(64).optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  description: z.string().trim().max(1500),
  state: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  homepageOrder: z.coerce.number().int().min(0).max(100000),
  isFeatured: z.boolean(),
  coverMediaId: z.string().max(64).nullable(),
  heroMediaId: z.string().max(64).nullable(),
});

function value(form: FormData, key: string): string {
  const entry = form.get(key);
  return typeof entry === "string" ? entry : "";
}

function resultUrl(status: "saved" | "error", message?: string, editId?: string) {
  const params = new URLSearchParams();
  params.set(status, message ?? "1");
  if (status === "error") params.set(editId ? "edit" : "action", editId ?? "new");
  return `/admin/collections?${params.toString()}`;
}

export async function saveCollection(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = collectionInput.safeParse({
    id: value(form, "id") || undefined,
    name: value(form, "name"),
    slug: value(form, "slug"),
    description: value(form, "description"),
    state: value(form, "state"),
    sortOrder: value(form, "sortOrder"),
    homepageOrder: value(form, "homepageOrder"),
    isFeatured: value(form, "isFeatured") === "on",
    coverMediaId: value(form, "coverMediaId") || null,
    heroMediaId: value(form, "heroMediaId") || null,
  });
  if (!parsed.success) redirect(resultUrl("error", "Please check the collection fields and try again.", value(form, "id") || undefined));

  const input = parsed.data;
  let error: string | null = null;
  try {
    const db = getDb();
    const existing = input.id ? await db.collection.findUnique({ where: { id: input.id }, select: { id: true, slug: true } }) : null;
    if (input.id && !existing) {
      error = "The collection no longer exists. Refresh and try again.";
    } else if (existing && existing.slug !== input.slug) {
      error = "The collection slug cannot be changed after creation.";
    } else {
      const mediaIds = [...new Set([input.coverMediaId, input.heroMediaId].filter((id): id is string => id !== null))];
      const media = mediaIds.length ? await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, approved: true }, select: { id: true, storageKey: true, mimeType: true } }) : [];
      if (media.length !== mediaIds.length || media.some((asset) => !asset.mimeType.startsWith("image/"))) error = "Choose approved image assets for Collection media.";
      if (!error) {
        try { media.forEach((asset) => mediaUrl(asset.storageKey)); }
        catch { error = "A selected image has an invalid public media URL."; }
      }
      if (!error && input.state === "PUBLISHED" && input.isFeatured && !media.some((asset) => asset.id === (input.heroMediaId || input.coverMediaId))) {
        error = "Homepage Collections require an approved image. Select a cover or a different homepage image before saving.";
      }
      if (!error) {
        const data = {
          name: input.name,
          description: input.description || null,
          state: input.state,
          sortOrder: input.sortOrder,
          homepageOrder: input.homepageOrder,
          isFeatured: input.state === "ARCHIVED" ? false : input.isFeatured,
          coverMediaId: input.coverMediaId,
          heroMediaId: input.heroMediaId,
        };
        if (existing) {
          await db.collection.update({ where: { id: existing.id }, data });
        } else {
          await db.collection.create({ data: { ...data, slug: input.slug } });
        }
      }
    }
  } catch (cause) {
    console.error("Collection save failed", cause);
    error = "Collection could not be saved. Check the database connection and unique slug.";
  }
  if (error) redirect(resultUrl("error", error, input.id));
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/collections");
  redirect(resultUrl("saved"));
}

export async function archiveCollection(form: FormData): Promise<void> {
  await requireAdmin();
  const id = value(form, "id");
  if (!id || id.length > 64) redirect(resultUrl("error", "Choose a Collection to archive."));
  try {
    await getDb().collection.update({ where: { id }, data: { state: "ARCHIVED", isFeatured: false } });
  } catch (cause) {
    console.error("Collection archive failed", cause);
    redirect(resultUrl("error", "Collection could not be archived. Refresh and try again.", id));
  }
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/collections");
  redirect(resultUrl("saved"));
}
