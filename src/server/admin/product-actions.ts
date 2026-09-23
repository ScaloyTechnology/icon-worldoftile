"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const id = z.string().min(1).max(64);
const optionalId = z.string().max(64);
const variantSchema = z.array(z.object({ id: id.nullable(), sizeId: id, sku: z.string().trim().max(100), thicknessMm: z.union([z.string(), z.number()]).transform(String), attributeValueIds: z.array(id).max(100) })).max(50);
const documentSchema = z.array(z.object({ mediaId: id, title: z.string().trim().min(1).max(160) })).max(20);
const specificationSchema = z.record(z.string(), z.string().trim().max(500));
const productSchema = z.object({
  id: optionalId, name: z.string().trim().min(1).max(160), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  code: z.string().trim().max(100), description: z.string().trim().max(5000), applicationDescription: z.string().trim().max(10000), technicalDescription: z.string().trim().max(10000), technicalMediaId: optionalId, categoryId: optionalId,
  collectionIds: z.array(id).max(50), attributeValueIds: z.array(id).max(150), applicationIds: z.array(id).max(50),
  previewMediaId: optionalId, primaryTextureId: optionalId, galleryIds: z.array(id).max(40), variants: variantSchema, documents: documentSchema, specifications: specificationSchema,
  state: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]), isFeatured: z.boolean(), homepageHeroEligible: z.boolean(), sortOrder: z.coerce.number().int().min(0).max(100000),
  seoTitle: z.string().trim().max(160), seoDescription: z.string().trim().max(320), seoImageId: optionalId, seoNoIndex: z.boolean(),
});

function value(form: FormData, name: string) { const item = form.get(name); return typeof item === "string" ? item : ""; }
function values(form: FormData, name: string) { return [...new Set(form.getAll(name).filter((item): item is string => typeof item === "string" && item.length > 0))]; }
function jsonValue(source: string): unknown { try { return JSON.parse(source); } catch { return null; } }
function editorUrl(idValue: string, error: string) {
  const editor = idValue || "new";
  return `/admin/products?editor=${encodeURIComponent(editor)}&error=${encodeURIComponent(error)}`;
}
function publicPaths(slug: string, oldSlug?: string | null) {
  revalidatePath("/products"); revalidatePath(`/products/${slug}`); revalidatePath("/");
  if (oldSlug && oldSlug !== slug) revalidatePath(`/products/${oldSlug}`);
}

export async function saveProduct(form: FormData): Promise<void> {
  await requireAdmin();
  const intent = value(form, "intent");
  const requestedState = intent === "draft" ? "DRAFT" : intent === "publish" ? "PUBLISHED" : value(form, "state");
  const parsed = productSchema.safeParse({
    id: value(form, "id"), name: value(form, "name"), slug: value(form, "slug"), code: value(form, "code"), description: value(form, "description"), applicationDescription: value(form, "applicationDescription"), technicalDescription: value(form, "technicalDescription"), technicalMediaId: value(form, "technicalMediaId"), categoryId: value(form, "categoryId"),
    collectionIds: values(form, "collectionId"), attributeValueIds: values(form, "attributeValueId"), applicationIds: values(form, "applicationId"),
    previewMediaId: value(form, "previewMediaId"), primaryTextureId: value(form, "primaryTextureId"), galleryIds: jsonValue(value(form, "gallery")), variants: jsonValue(value(form, "variants")), documents: jsonValue(value(form, "documents")), specifications: jsonValue(value(form, "specifications")),
    state: requestedState, isFeatured: value(form, "isFeatured") === "on", homepageHeroEligible: value(form, "homepageHeroEligible") === "on", sortOrder: value(form, "sortOrder"),
    seoTitle: value(form, "seoTitle"), seoDescription: value(form, "seoDescription"), seoImageId: value(form, "seoImageId"), seoNoIndex: value(form, "seoNoIndex") === "on",
  });
  const submittedId = value(form, "id");
  if (!parsed.success) redirect(editorUrl(submittedId, "Check the required fields and relationship values."));
  const input = parsed.data;
  const uniqueVariants = new Set(input.variants.map((item) => item.sizeId));
  if (uniqueVariants.size !== input.variants.length) redirect(editorUrl(input.id, "Each size can be selected only once."));
  const thicknesses = input.variants.map((item) => item.thicknessMm.trim()).filter(Boolean);
  if (thicknesses.some((item) => !Number.isFinite(Number(item)) || Number(item) <= 0)) redirect(editorUrl(input.id, "Variant thickness must be a positive number."));

  let oldSlug: string | null = null;
  try {
    const db = getDb();
    const [categoryCount, collectionCount, attributeCount, applicationCount, sizeCount, specificationCount] = await Promise.all([
      input.categoryId ? db.productCategory.count({ where: { id: input.categoryId } }) : 0,
      db.collection.count({ where: {
        id: { in: input.collectionIds },
        OR: input.id ? [{ state: "PUBLISHED" as const }, { products: { some: { productId: input.id } } }] : [{ state: "PUBLISHED" as const }],
      } }), db.attributeValue.count({ where: { id: { in: input.attributeValueIds } } }),
      db.application.count({ where: { id: { in: input.applicationIds }, ...(input.state === "PUBLISHED" ? { state: "PUBLISHED" as const } : {}) } }), db.size.count({ where: { id: { in: input.variants.map((item) => item.sizeId) } } }),
      db.specificationDefinition.count({ where: { id: { in: Object.keys(input.specifications).filter((key) => input.specifications[key]?.trim()) } } }),
    ]);
    if (input.categoryId && categoryCount !== 1) throw new Error("CATEGORY");
    if (collectionCount !== input.collectionIds.length) throw new Error(input.state === "PUBLISHED" ? "PUBLIC_COLLECTION" : "COLLECTION");
    const variantAttributeIds = [...new Set(input.variants.flatMap((item) => item.attributeValueIds))];
    const allAttributeIds = [...new Set([...input.attributeValueIds, ...variantAttributeIds])];
    if (attributeCount !== input.attributeValueIds.length || await db.attributeValue.count({ where: { id: { in: allAttributeIds } } }) !== allAttributeIds.length) throw new Error("ATTRIBUTE");
    if (applicationCount !== input.applicationIds.length) throw new Error(input.state === "PUBLISHED" ? "PUBLIC_APPLICATION" : "APPLICATION");
    if (sizeCount !== input.variants.length) throw new Error("SIZE");
    if (specificationCount !== Object.values(input.specifications).filter((item) => item.trim()).length) throw new Error("SPECIFICATION");

    const mediaIds = [...new Set([input.previewMediaId, input.primaryTextureId, input.technicalMediaId, input.seoImageId, ...input.galleryIds, ...input.documents.map((item) => item.mediaId)].filter(Boolean))];
    const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, approved: true }, select: { id: true, mimeType: true, storageKey: true } });
    if (media.length !== mediaIds.length) throw new Error("MEDIA");
    const mediaById = new Map(media.map((item) => [item.id, item]));
    for (const mediaId of [input.previewMediaId, input.primaryTextureId, input.seoImageId, ...input.galleryIds]) if (mediaId && !mediaById.get(mediaId)?.mimeType.startsWith("image/")) throw new Error("IMAGE");
    if (input.technicalMediaId) { const type = mediaById.get(input.technicalMediaId)?.mimeType; if (type !== "application/pdf" && !type?.startsWith("image/")) throw new Error("TECHNICAL_MEDIA"); }
    for (const document of input.documents) if (mediaById.get(document.mediaId)?.mimeType !== "application/pdf") throw new Error("PDF");
    for (const asset of media) { try { mediaUrl(asset.storageKey); } catch { throw new Error("MEDIA_PATH"); } }
    if (input.state === "PUBLISHED" && !input.previewMediaId) throw new Error("PUBLISHED_IMAGE");

    await db.$transaction(async (tx) => {
      const current = input.id ? await tx.product.findUnique({ where: { id: input.id }, select: { id: true, slug: true, publishedAt: true, seoId: true } }) : null;
      if (input.id && !current) throw new Error("MISSING");
      oldSlug = current?.slug ?? null;
      const scalars = {
        name: input.name, slug: input.slug, code: input.code || null, description: input.description || null, applicationDescription: input.applicationDescription || null, technicalDescription: input.technicalDescription || null, technicalMediaId: input.technicalMediaId || null, categoryId: input.categoryId || null,
        previewMediaId: input.previewMediaId || null, primaryTextureId: input.primaryTextureId || null, state: input.state, isFeatured: input.isFeatured,
        homepageHeroEligible: input.homepageHeroEligible, sortOrder: input.sortOrder, publishedAt: input.state === "PUBLISHED" ? current?.publishedAt ?? new Date() : current?.publishedAt ?? null,
      };
      const product = current ? await tx.product.update({ where: { id: current.id }, data: scalars }) : await tx.product.create({ data: scalars });

      await tx.productCollection.deleteMany({ where: { productId: product.id } });
      if (input.collectionIds.length) await tx.productCollection.createMany({ data: input.collectionIds.map((collectionId, sortOrder) => ({ productId: product.id, collectionId, sortOrder })) });
      await tx.productAttribute.deleteMany({ where: { productId: product.id } });
      if (input.attributeValueIds.length) await tx.productAttribute.createMany({ data: input.attributeValueIds.map((valueId) => ({ productId: product.id, valueId })) });
      await tx.productApplication.deleteMany({ where: { productId: product.id } });
      if (input.applicationIds.length) await tx.productApplication.createMany({ data: input.applicationIds.map((applicationId) => ({ productId: product.id, applicationId })) });

      const existingVariants = await tx.productVariant.findMany({ where: { productId: product.id }, select: { id: true } });
      const retainedIds = input.variants.flatMap((item) => item.id ?? []);
      await tx.productVariant.deleteMany({ where: { productId: product.id, id: { notIn: retainedIds } } });
      for (let index = 0; index < input.variants.length; index += 1) {
        const variant = input.variants[index];
        if (!variant) continue;
        const owned = variant.id ? existingVariants.some((item) => item.id === variant.id) : false;
        if (variant.id && !owned) throw new Error("VARIANT");
        const variantData = { sizeId: variant.sizeId, sku: variant.sku || null, thicknessMm: variant.thicknessMm.trim() ? Number(variant.thicknessMm) : null, variantKey: variant.sizeId, sortOrder: index };
        const savedVariant = variant.id ? await tx.productVariant.update({ where: { id: variant.id }, data: variantData }) : await tx.productVariant.create({ data: { ...variantData, productId: product.id } });
        await tx.variantAttribute.deleteMany({ where: { variantId: savedVariant.id } });
        if (variant.attributeValueIds.length) await tx.variantAttribute.createMany({ data: variant.attributeValueIds.map((valueId) => ({ variantId: savedVariant.id, valueId })) });
      }

      await tx.productImage.deleteMany({ where: { productId: product.id } });
      if (input.galleryIds.length) await tx.productImage.createMany({ data: input.galleryIds.map((mediaId, sortOrder) => ({ productId: product.id, mediaId, role: "gallery", sortOrder })) });
      await tx.productDocument.deleteMany({ where: { productId: product.id } });
      if (input.documents.length) await tx.productDocument.createMany({ data: input.documents.map((document, sortOrder) => ({ productId: product.id, mediaId: document.mediaId, title: document.title, sortOrder })) });
      await tx.productSpecification.deleteMany({ where: { productId: product.id } });
      const specificationValues = Object.entries(input.specifications).filter((entry) => entry[1].trim());
      if (specificationValues.length) await tx.productSpecification.createMany({ data: specificationValues.map(([definitionId, specificationValue], sortOrder) => ({ productId: product.id, definitionId, value: specificationValue, sortOrder })) });

      const seoData = { title: input.seoTitle || null, description: input.seoDescription || null, socialImageKey: input.seoImageId ? mediaById.get(input.seoImageId)?.storageKey ?? null : null, noIndex: input.seoNoIndex };
      const hasSeo = Boolean(input.seoTitle || input.seoDescription || input.seoImageId || input.seoNoIndex);
      if (current?.seoId) await tx.seoMetadata.update({ where: { id: current.seoId }, data: seoData });
      else if (hasSeo) { const seo = await tx.seoMetadata.create({ data: seoData }); await tx.product.update({ where: { id: product.id }, data: { seoId: seo.id } }); }
    });
  } catch (cause) {
    console.error("Product save failed", cause);
    const code = cause instanceof Error ? cause.message : "";
    const messages: Record<string, string> = { CATEGORY: "The selected category is unavailable.", COLLECTION: "One or more collections are unavailable.", PUBLIC_COLLECTION: "Published products can use only published collections.", ATTRIBUTE: "One or more attribute values are unavailable.", APPLICATION: "One or more applications are unavailable.", PUBLIC_APPLICATION: "Published products can use only published applications.", SIZE: "One or more sizes are unavailable.", SPECIFICATION: "One or more specification definitions are unavailable.", MEDIA: "Choose existing approved media.", MEDIA_PATH: "One or more selected media assets do not have a public-safe storage key.", IMAGE: "Product imagery must use approved image assets.", TECHNICAL_MEDIA: "Technical media must be an approved image or PDF.", PDF: "Product documents must use approved PDF assets.", PUBLISHED_IMAGE: "Published products require an approved main image.", MISSING: "This product no longer exists.", VARIANT: "A submitted variant does not belong to this product." };
    redirect(editorUrl(input.id, messages[code] ?? "The product could not be saved. Check unique slug, code, and variant SKU values."));
  }
  publicPaths(input.slug, oldSlug);
  revalidatePath("/admin/products");
  redirect("/admin/products?saved=1");
}

export async function archiveProduct(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = id.safeParse(value(form, "id"));
  if (!parsed.success) redirect("/admin/products?error=Invalid%20product.");
  try {
    const product = await getDb().product.update({ where: { id: parsed.data }, data: { state: "ARCHIVED" }, select: { slug: true } });
    publicPaths(product.slug); revalidatePath("/admin/products");
  } catch (cause) { console.error("Product archive failed", cause); redirect("/admin/products?error=The%20product%20could%20not%20be%20archived."); }
  redirect("/admin/products?archived=1");
}
