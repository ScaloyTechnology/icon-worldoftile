"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const recordId = z.string().min(1).max(64);
const productInput = z.object({
  id: recordId.optional(), name: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  code: z.string().trim().max(100), description: z.string().trim().max(5000),
  state: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  isFeatured: z.boolean(), homepageHeroEligible: z.boolean(),
  categoryId: recordId.nullable(), primaryTextureId: recordId.nullable(), previewMediaId: recordId.nullable(),
  documentMediaId: recordId.nullable(), documentTitle: z.string().trim().max(120),
  collectionIds: z.array(recordId).max(30), attributeIds: z.array(recordId).max(100),
  sizeIds: z.array(recordId).max(50), applicationIds: z.array(recordId).max(30), galleryIds: z.array(recordId).max(20),
  newThicknessMm: z.number().positive().max(9999).nullable(),
  specifications: z.array(z.object({ definitionId: recordId, value: z.string().trim().min(1).max(500) })).max(50),
  variantThickness: z.array(z.object({ id: recordId, thicknessMm: z.number().positive().max(9999).nullable() })).max(50),
});

function field(form: FormData, key: string) { const entry = form.get(key); return typeof entry === "string" ? entry : ""; }
function ids(form: FormData, key: string) { return [...new Set(form.getAll(key).filter((value): value is string => typeof value === "string" && value.length > 0))]; }
function decimal(value: string) { if (!value.trim()) return null; const parsed = Number(value); return Number.isFinite(parsed) ? parsed : NaN; }
function back(message: string | null, id?: string) { return `/admin/products?${new URLSearchParams(message ? { error: message, ...(id ? { edit: id } : { action: "new" }) } : { saved: "1" })}`; }

export async function saveProduct(form: FormData): Promise<void> {
  await requireAdmin();
  const specifications = [...form.entries()].filter(([key, value]) => key.startsWith("spec:") && typeof value === "string" && value.trim())
    .map(([key, value]) => ({ definitionId: key.slice(5), value: String(value) }));
  const variantThickness = [...form.entries()].filter(([key]) => key.startsWith("variant:"))
    .map(([key, value]) => ({ id: key.slice(8), thicknessMm: decimal(String(value)) }));
  const parsed = productInput.safeParse({
    id: field(form, "id") || undefined, name: field(form, "name"), slug: field(form, "slug"),
    code: field(form, "code"), description: field(form, "description"), state: field(form, "state"),
    sortOrder: field(form, "sortOrder"), isFeatured: field(form, "isFeatured") === "on",
    homepageHeroEligible: field(form, "homepageHeroEligible") === "on",
    categoryId: field(form, "categoryId") || null, primaryTextureId: field(form, "primaryTextureId") || null,
    previewMediaId: field(form, "previewMediaId") || null, documentMediaId: field(form, "documentMediaId") || null,
    documentTitle: field(form, "documentTitle"), collectionIds: ids(form, "collectionId"),
    attributeIds: ids(form, "attributeId"), sizeIds: ids(form, "sizeId"),
    applicationIds: ids(form, "applicationId"), galleryIds: ids(form, "galleryMediaId"),
    newThicknessMm: decimal(field(form, "newThicknessMm")), specifications, variantThickness,
  });
  if (!parsed.success) redirect(back("Check the Product fields, identifiers, and numeric values.", field(form, "id") || undefined));
  const input = parsed.data;
  let error: string | null = null;
  let oldSlug: string | null = null;
  try {
    const db = getDb();
    await db.$transaction(async (tx) => {
      const current = input.id ? await tx.product.findUnique({ where: { id: input.id }, select: { id: true, slug: true, publishedAt: true } }) : null;
      if (input.id && !current) throw new Error("Product no longer exists");
      if (current && current.slug !== input.slug) throw new Error("Existing Product slug cannot be changed");
      oldSlug = current?.slug ?? null;
      if (input.categoryId && await tx.productCategory.count({ where: { id: input.categoryId } }) !== 1) throw new Error("Invalid category");
      if (await tx.collection.count({ where: { id: { in: input.collectionIds }, ...(input.state === "PUBLISHED" ? { state: "PUBLISHED" as const } : {}) } }) !== input.collectionIds.length) throw new Error("Choose existing public Collections before publishing");
      if (await tx.attributeValue.count({ where: { id: { in: input.attributeIds } } }) !== input.attributeIds.length) throw new Error("Invalid attribute value");
      if (await tx.size.count({ where: { id: { in: input.sizeIds } } }) !== input.sizeIds.length) throw new Error("Invalid size");
      if (await tx.application.count({ where: { id: { in: input.applicationIds }, ...(input.state === "PUBLISHED" ? { state: "PUBLISHED" as const } : {}) } }) !== input.applicationIds.length) throw new Error("Choose public Applications before publishing");
      if (await tx.specificationDefinition.count({ where: { id: { in: input.specifications.map((item) => item.definitionId) } } }) !== input.specifications.length) throw new Error("Invalid specification definition");
      const mediaIds = [...new Set([input.primaryTextureId, input.previewMediaId, input.documentMediaId, ...input.galleryIds].filter((id): id is string => id !== null))];
      const media = await tx.mediaAsset.findMany({ where: { id: { in: mediaIds }, approved: true }, select: { id: true, mimeType: true } });
      if (media.length !== mediaIds.length) throw new Error("Choose approved media assets");
      const mediaTypes = new Map(media.map((item) => [item.id, item.mimeType]));
      for (const id of [input.primaryTextureId, input.previewMediaId, ...input.galleryIds]) if (id && !mediaTypes.get(id)?.startsWith("image/")) throw new Error("Product images must be approved image assets");
      if (input.documentMediaId && mediaTypes.get(input.documentMediaId) !== "application/pdf") throw new Error("Product document must be an approved PDF");
      if (input.state === "PUBLISHED" && !input.primaryTextureId && !input.previewMediaId && !input.galleryIds.length) throw new Error("Published Products require an approved image");

      const data = {
        name: input.name, code: input.code || null, description: input.description || null,
        state: input.state, sortOrder: input.sortOrder, isFeatured: input.isFeatured,
        homepageHeroEligible: input.homepageHeroEligible, categoryId: input.categoryId,
        primaryTextureId: input.primaryTextureId, previewMediaId: input.previewMediaId,
        publishedAt: input.state === "PUBLISHED" ? current?.publishedAt ?? new Date() : current?.publishedAt ?? null,
      };
      const saved = current ? await tx.product.update({ where: { id: current.id }, data })
        : await tx.product.create({ data: { ...data, slug: input.slug } });

      await tx.productCollection.deleteMany({ where: { productId: saved.id } });
      if (input.collectionIds.length) await tx.productCollection.createMany({ data: input.collectionIds.map((collectionId, sortOrder) => ({ productId: saved.id, collectionId, sortOrder })) });
      await tx.productAttribute.deleteMany({ where: { productId: saved.id } });
      if (input.attributeIds.length) await tx.productAttribute.createMany({ data: input.attributeIds.map((valueId) => ({ productId: saved.id, valueId })) });
      await tx.productApplication.deleteMany({ where: { productId: saved.id } });
      if (input.applicationIds.length) await tx.productApplication.createMany({ data: input.applicationIds.map((applicationId) => ({ productId: saved.id, applicationId })) });
      await tx.productImage.deleteMany({ where: { productId: saved.id } });
      if (input.galleryIds.length) await tx.productImage.createMany({ data: input.galleryIds.map((mediaId, sortOrder) => ({ productId: saved.id, mediaId, role: "gallery", sortOrder })) });
      const existingDocuments = await tx.productDocument.findMany({ where: { productId: saved.id }, orderBy: [{ sortOrder: "asc" }, { id: "asc" }], select: { id: true, mediaId: true } });
      const editableDocument = existingDocuments[0];
      if (input.documentMediaId && existingDocuments.slice(1).some((document) => document.mediaId === input.documentMediaId)) throw new Error("That PDF is already attached to this Product");
      if (editableDocument && input.documentMediaId) await tx.productDocument.update({ where: { id: editableDocument.id }, data: { mediaId: input.documentMediaId, title: input.documentTitle || "Product document" } });
      else if (editableDocument) await tx.productDocument.delete({ where: { id: editableDocument.id } });
      else if (input.documentMediaId) await tx.productDocument.create({ data: { productId: saved.id, mediaId: input.documentMediaId, title: input.documentTitle || "Product document" } });
      await tx.productSpecification.deleteMany({ where: { productId: saved.id } });
      if (input.specifications.length) await tx.productSpecification.createMany({ data: input.specifications.map((item, sortOrder) => ({ productId: saved.id, definitionId: item.definitionId, value: item.value, sortOrder })) });
      const variants = await tx.productVariant.findMany({ where: { productId: saved.id }, select: { id: true, sizeId: true } });
      const selectedSizes = new Set(input.sizeIds);
      const removed = variants.filter((variant) => !selectedSizes.has(variant.sizeId)).map((variant) => variant.id);
      if (removed.length) await tx.productVariant.deleteMany({ where: { id: { in: removed } } });
      const retained = new Set(variants.map((variant) => variant.sizeId));
      const added = input.sizeIds.filter((sizeId) => !retained.has(sizeId));
      if (added.length) await tx.productVariant.createMany({ data: added.map((sizeId, sortOrder) => ({ productId: saved.id, sizeId, variantKey: sizeId, sortOrder, thicknessMm: input.newThicknessMm })) });
      for (const item of input.variantThickness) {
        if (!variants.some((variant) => variant.id === item.id && selectedSizes.has(variant.sizeId))) throw new Error("Invalid existing variant");
        await tx.productVariant.update({ where: { id: item.id }, data: { thicknessMm: item.thicknessMm } });
      }
    });
  } catch (cause) {
    console.error("Product save failed", cause);
    error = cause instanceof Error && ["Product no longer exists", "Existing Product slug cannot be changed", "Invalid category", "Invalid attribute value", "Invalid size", "Invalid specification definition", "Choose approved media assets", "Product images must be approved image assets", "Product document must be an approved PDF", "Published Products require an approved image", "Invalid existing variant", "Choose existing public Collections before publishing", "Choose public Applications before publishing", "That PDF is already attached to this Product"].includes(cause.message)
      ? cause.message : "Product could not be saved. Check the database, unique slug/code, and selected relationships.";
  }
  if (error) redirect(back(error, input.id));
  revalidatePath("/products");
  revalidatePath(`/products/${input.slug}`);
  if (oldSlug && oldSlug !== input.slug) revalidatePath(`/products/${oldSlug}`);
  revalidatePath("/");
  revalidatePath("/admin/products");
  redirect(back(null));
}
