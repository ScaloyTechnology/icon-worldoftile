"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const id = z.string().min(1).max(64);
const optionalId = z.string().max(64);
const toggleTarget = z.enum(["on", "off"]);
const variantSchema = z.array(z.object({ id: id.nullable(), sizeId: id, sku: z.string().trim().max(100), thicknessMm: z.union([z.string(), z.number()]).transform(String), attributeValueIds: z.array(id).max(100) })).max(50);
const productSchema = z.object({
  id: optionalId, name: z.string().trim().min(1).max(160), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  code: z.string().trim().max(100), description: z.string().trim().max(5000),
  collectionIds: z.array(id).max(50), attributeValueIds: z.array(id).max(150),
  previewMediaId: optionalId, primaryTextureId: optionalId, galleryIds: z.array(id).max(40), variants: variantSchema,
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
    id: value(form, "id"), name: value(form, "name"), slug: value(form, "slug"), code: value(form, "code"), description: value(form, "description"),
    collectionIds: values(form, "collectionId"), attributeValueIds: values(form, "attributeValueId"),
    previewMediaId: value(form, "previewMediaId"), primaryTextureId: value(form, "primaryTextureId"), galleryIds: jsonValue(value(form, "gallery")), variants: jsonValue(value(form, "variants")),
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
    const [collectionCount, attributeCount, sizeCount] = await Promise.all([
      db.collection.count({ where: {
        id: { in: input.collectionIds },
        OR: input.id ? [{ state: "PUBLISHED" as const }, { products: { some: { productId: input.id } } }] : [{ state: "PUBLISHED" as const }],
      } }), db.attributeValue.count({ where: { id: { in: input.attributeValueIds } } }),
      db.size.count({ where: { id: { in: input.variants.map((item) => item.sizeId) } } }),
    ]);
    if (collectionCount !== input.collectionIds.length) throw new Error(input.state === "PUBLISHED" ? "PUBLIC_COLLECTION" : "COLLECTION");
    const variantAttributeIds = [...new Set(input.variants.flatMap((item) => item.attributeValueIds))];
    const allAttributeIds = [...new Set([...input.attributeValueIds, ...variantAttributeIds])];
    if (attributeCount !== input.attributeValueIds.length || await db.attributeValue.count({ where: { id: { in: allAttributeIds } } }) !== allAttributeIds.length) throw new Error("ATTRIBUTE");
    if (sizeCount !== input.variants.length) throw new Error("SIZE");

    const mediaIds = [...new Set([input.previewMediaId, input.primaryTextureId, input.seoImageId, ...input.galleryIds].filter(Boolean))];
    const media = await db.mediaAsset.findMany({ where: { id: { in: mediaIds }, approved: true }, select: { id: true, mimeType: true, storageKey: true } });
    if (media.length !== mediaIds.length) throw new Error("MEDIA");
    const mediaById = new Map(media.map((item) => [item.id, item]));
    for (const mediaId of [input.previewMediaId, input.primaryTextureId, input.seoImageId, ...input.galleryIds]) if (mediaId && !mediaById.get(mediaId)?.mimeType.startsWith("image/")) throw new Error("IMAGE");
    for (const asset of media) { try { mediaUrl(asset.storageKey); } catch { throw new Error("MEDIA_PATH"); } }
    if (input.state === "PUBLISHED" && !input.previewMediaId) throw new Error("PUBLISHED_IMAGE");

    await db.$transaction(async (tx) => {
      const current = input.id ? await tx.product.findUnique({ where: { id: input.id }, select: { id: true, slug: true, publishedAt: true, seoId: true } }) : null;
      if (input.id && !current) throw new Error("MISSING");
      oldSlug = current?.slug ?? null;
      const scalars = {
        name: input.name, slug: input.slug, code: input.code || null, description: input.description || null, applicationDescription: null, technicalDescription: null, technicalMediaId: null, categoryId: null,
        previewMediaId: input.previewMediaId || null, primaryTextureId: input.primaryTextureId || null, state: input.state, isFeatured: input.isFeatured,
        homepageHeroEligible: input.homepageHeroEligible, sortOrder: input.sortOrder, publishedAt: input.state === "PUBLISHED" ? current?.publishedAt ?? new Date() : current?.publishedAt ?? null,
      };
      const product = current ? await tx.product.update({ where: { id: current.id }, data: scalars }) : await tx.product.create({ data: scalars });

      await tx.productCollection.deleteMany({ where: { productId: product.id } });
      if (input.collectionIds.length) await tx.productCollection.createMany({ data: input.collectionIds.map((collectionId, sortOrder) => ({ productId: product.id, collectionId, sortOrder })) });
      await tx.productAttribute.deleteMany({ where: { productId: product.id } });
      if (input.attributeValueIds.length) await tx.productAttribute.createMany({ data: input.attributeValueIds.map((valueId) => ({ productId: product.id, valueId })) });
      await tx.productApplication.deleteMany({ where: { productId: product.id } });

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
      await tx.productSpecification.deleteMany({ where: { productId: product.id } });

      const seoData = { title: input.seoTitle || null, description: input.seoDescription || null, socialImageKey: input.seoImageId ? mediaById.get(input.seoImageId)?.storageKey ?? null : null, noIndex: input.seoNoIndex };
      const hasSeo = Boolean(input.seoTitle || input.seoDescription || input.seoImageId || input.seoNoIndex);
      if (current?.seoId) await tx.seoMetadata.update({ where: { id: current.seoId }, data: seoData });
      else if (hasSeo) { const seo = await tx.seoMetadata.create({ data: seoData }); await tx.product.update({ where: { id: product.id }, data: { seoId: seo.id } }); }
    });
  } catch (cause) {
    console.error("Product save failed", cause);
    const code = cause instanceof Error ? cause.message : "";
    const messages: Record<string, string> = { COLLECTION: "One or more collections are unavailable.", PUBLIC_COLLECTION: "Published products can use only published collections.", ATTRIBUTE: "One or more product filter values are unavailable.", SIZE: "One or more sizes are unavailable.", MEDIA: "Choose existing approved media.", MEDIA_PATH: "One or more selected media assets do not have a public-safe storage key.", IMAGE: "Product imagery must use approved image assets.", PUBLISHED_IMAGE: "Published products require an approved main image.", MISSING: "This product no longer exists.", VARIANT: "A submitted variant does not belong to this product." };
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

export async function toggleProductFeatured(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id, target: toggleTarget }).safeParse({ id: value(form, "id"), target: value(form, "target") });
  if (!parsed.success) redirect("/admin/products?error=Invalid%20Product%20update.");
  try {
    const product = await getDb().product.update({ where: { id: parsed.data.id }, data: { isFeatured: parsed.data.target === "on" }, select: { slug: true } });
    publicPaths(product.slug);
    revalidatePath("/admin/products");
  } catch (cause) {
    console.error("Product Featured update failed", cause);
    redirect("/admin/products?error=The%20Featured%20setting%20could%20not%20be%20updated.");
  }
}

export async function toggleProductPublished(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = z.object({ id, target: toggleTarget }).safeParse({ id: value(form, "id"), target: value(form, "target") });
  if (!parsed.success) redirect("/admin/products?error=Invalid%20Product%20update.");
  let slug = "";
  try {
    const db = getDb();
    const product = await db.product.findUnique({
      where: { id: parsed.data.id },
      select: {
        slug: true, state: true, publishedAt: true,
        previewMedia: { select: { approved: true, mimeType: true, storageKey: true } },
        collections: { select: { collection: { select: { state: true } } } },
      },
    });
    if (!product) throw new Error("MISSING");
    if (product.state === "ARCHIVED") throw new Error("ARCHIVED");
    const nextState = parsed.data.target === "on" ? "PUBLISHED" : "DRAFT";
    if (nextState === "PUBLISHED") {
      if (!product.previewMedia?.approved || !product.previewMedia.mimeType.startsWith("image/")) throw new Error("IMAGE");
      try { mediaUrl(product.previewMedia.storageKey); } catch { throw new Error("IMAGE"); }
      if (product.collections.some((item) => item.collection.state !== "PUBLISHED")) throw new Error("COLLECTION");
    }
    slug = product.slug;
    await db.product.update({
      where: { id: parsed.data.id },
      data: { state: nextState, publishedAt: nextState === "PUBLISHED" ? product.publishedAt ?? new Date() : product.publishedAt },
    });
  } catch (cause) {
    console.error("Product publishing update failed", cause);
    const code = cause instanceof Error ? cause.message : "";
    const message = code === "ARCHIVED" ? "Archived Products must be restored through an explicit edit."
      : code === "IMAGE" ? "Add an approved Main Image before publishing this Product."
      : code === "COLLECTION" ? "Publish all assigned Collections before publishing this Product."
      : code === "MISSING" ? "This Product no longer exists."
      : "The Product publishing status could not be updated.";
    redirect(`/admin/products?error=${encodeURIComponent(message)}`);
  }
  publicPaths(slug);
  revalidatePath("/admin/products");
}
