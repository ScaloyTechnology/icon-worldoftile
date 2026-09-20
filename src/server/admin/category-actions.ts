"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const inputSchema = z.object({
  id: z.string().max(64).optional(), name: z.string().trim().min(1).max(120),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  sortOrder: z.coerce.number().int().min(0).max(100000), parentId: z.string().max(64).nullable(),
});

function text(form: FormData, key: string) { const value = form.get(key); return typeof value === "string" ? value : ""; }
function returnTo(message: string, success = false, id?: string) {
  const query = new URLSearchParams({ [success ? "saved" : "error"]: message });
  if (!success) query.set(id ? "edit" : "action", id ?? "new");
  return `/admin/categories?${query}`;
}

export async function saveCategory(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = inputSchema.safeParse({
    id: text(form, "id") || undefined, name: text(form, "name"), slug: text(form, "slug"),
    sortOrder: text(form, "sortOrder"), parentId: text(form, "parentId") || null,
  });
  if (!parsed.success) redirect(returnTo("Check the category fields and try again.", false, text(form, "id") || undefined));
  const input = parsed.data;
  let error: string | null = null;
  try {
    const db = getDb();
    const existing = input.id ? await db.productCategory.findUnique({ where: { id: input.id }, select: { id: true, slug: true, parentId: true } }) : null;
    if (input.id && !existing) error = "The category no longer exists.";
    else if (existing && existing.slug !== input.slug) error = "An existing category slug cannot be changed.";
    else if (input.parentId) {
      const parents = await db.productCategory.findMany({ select: { id: true, parentId: true } });
      const parentOf = new Map(parents.map((row) => [row.id, row.parentId]));
      let cursor: string | null = input.parentId;
      const visited = new Set<string>();
      if (!parentOf.has(input.parentId)) error = "Choose an existing parent category.";
      while (!error && cursor) {
        if (cursor === input.id || visited.has(cursor)) error = "Choose a parent category without a cycle.";
        visited.add(cursor);
        cursor = parentOf.get(cursor) ?? null;
      }
    }
    if (!error) {
      const data = { name: input.name, sortOrder: input.sortOrder, parentId: input.parentId };
      if (existing) await db.productCategory.update({ where: { id: existing.id }, data });
      else await db.productCategory.create({ data: { ...data, slug: input.slug } });
    }
  } catch (cause) {
    console.error("Category save failed", cause);
    error = "Category could not be saved. Check the database and unique slug.";
  }
  if (error) redirect(returnTo(error, false, input.id));
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/admin/categories");
  redirect(returnTo("1", true));
}
