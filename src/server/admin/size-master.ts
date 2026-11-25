import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getDb } from "@/server/db";

export const sizeSchema = z.object({
  label: z.string().trim().min(1).max(100),
  widthMm: z.coerce.number().positive().max(100000).multipleOf(0.01),
  lengthMm: z.coerce.number().positive().max(100000).multipleOf(0.01),
});

export class SizeMasterError extends Error {}

export function sizeErrorMessage(cause: unknown) {
  if (cause instanceof SizeMasterError) return cause.message;
  const code = typeof cause === "object" && cause !== null && "code" in cause ? cause.code : "";
  if (code === "P2002") return "A Size with those details already exists. Use the existing Size.";
  if (code === "P2003") return "This Size is assigned to a product and cannot be deleted.";
  if (code === "P2025") return "This Size no longer exists. Refresh the Size library.";
  if (code === "P2034") return "The Size library changed while saving. Please try again.";
  return "The Size could not be saved. Please try again.";
}

export async function getSizeMaster() {
  const sizes = await getDb().size.findMany({
    orderBy: [{ widthMm: "asc" }, { lengthMm: "asc" }, { label: "asc" }, { id: "asc" }],
    select: { id: true, label: true, widthMm: true, lengthMm: true, _count: { select: { variants: true } } },
  });
  return sizes.map(size => ({
    id: size.id, label: size.label, widthMm: size.widthMm.toString(), lengthMm: size.lengthMm.toString(),
    assignments: size._count.variants,
  }));
}

export async function saveSizeMaster(input: z.infer<typeof sizeSchema>, id?: string) {
  return getDb().$transaction(async tx => {
    const existing = await tx.size.findFirst({
      where: { ...(id ? { id: { not: id } } : {}), OR: [{ label: { equals: input.label, mode: "insensitive" } }, { widthMm: input.widthMm, lengthMm: input.lengthMm }] },
      orderBy: { id: "asc" }, select: { id: true, label: true },
    });
    if (existing) {
      if (id) throw new SizeMasterError("Another Size already has that label or those dimensions. Existing product assignments have not been changed.");
      return { size: existing, reused: true };
    }
    // Update the master in place: never recreate Size IDs or rewrite ProductVariants.
    const size = id
      ? await tx.size.update({ where: { id }, data: input, select: { id: true, label: true } })
      : await tx.size.create({ data: input, select: { id: true, label: true } });
    return { size, reused: false };
  }, { isolationLevel: "Serializable" });
}

export async function deleteSizeMaster(id: string) {
  await getDb().$transaction(async tx => {
    if (await tx.productVariant.count({ where: { sizeId: id } })) {
      throw new SizeMasterError("This Size is assigned to a product and cannot be deleted. Existing product sizes have been kept.");
    }
    await tx.size.delete({ where: { id } });
  }, { isolationLevel: "Serializable" });
}

export function revalidateSizeConsumers() {
  revalidatePath("/admin/sizes");
  revalidatePath("/admin/products");
  revalidatePath("/admin/products/new");
  revalidatePath("/admin/products/[id]/edit", "page");
  revalidatePath("/products");
  revalidatePath("/products/export");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/");
}
