"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const id = z.string().min(1).max(64);
const optionalId = z.string().max(64);
const collectionSchema = z.object({
  id: optionalId,
  name: z.string().trim().min(1).max(160),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  description: z.string().trim().max(1000),
  state: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  isFeatured: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(100000),
  homepageOrder: z.coerce.number().int().min(0).max(100000),
  coverMediaId: optionalId,
  heroMediaId: optionalId,
});

function value(form: FormData, name: string) {
  const item = form.get(name);
  return typeof item === "string" ? item : "";
}

function editorUrl(idValue: string, error: string) {
  return `/admin/collections?editor=${encodeURIComponent(idValue || "new")}&error=${encodeURIComponent(error)}`;
}

function errorCode(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : "";
}

function revalidateCollectionConsumers(productSlugs: readonly string[]) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/admin/collections");
  productSlugs.forEach((slug) => revalidatePath(`/products/${slug}`));
}

export async function saveCollection(form: FormData): Promise<void> {
  await requireAdmin();
  const intent = value(form, "intent");
  const requestedState = intent === "draft" ? "DRAFT" : intent === "publish" ? "PUBLISHED" : value(form, "state");
  const submittedId = value(form, "id");
  const parsed = collectionSchema.safeParse({
    id: submittedId,
    name: value(form, "name"),
    slug: value(form, "slug"),
    description: value(form, "description"),
    state: requestedState,
    isFeatured: value(form, "isFeatured") === "on",
    sortOrder: value(form, "sortOrder"),
    homepageOrder: value(form, "homepageOrder"),
    coverMediaId: value(form, "coverMediaId"),
    heroMediaId: value(form, "heroMediaId"),
  });
  if (!parsed.success) redirect(editorUrl(submittedId, "Check the required Collection fields and ordering values."));
  const input = parsed.data;

  try {
    const db = getDb();
    const mediaIds = [...new Set([input.coverMediaId, input.heroMediaId].filter(Boolean))];
    const media = await db.mediaAsset.findMany({
      where: { id: { in: mediaIds }, approved: true, mimeType: { startsWith: "image/" } },
      select: { id: true, storageKey: true },
    });
    if (media.length !== mediaIds.length) throw new Error("MEDIA");
    for (const asset of media) { try { mediaUrl(asset.storageKey); } catch { throw new Error("MEDIA_PATH"); } }
    if (input.state === "PUBLISHED" && input.isFeatured && !input.coverMediaId) throw new Error("HOMEPAGE_IMAGE");

    const current = input.id ? await db.collection.findUnique({
      where: { id: input.id },
      select: { id: true },
    }) : null;
    if (input.id && !current) throw new Error("MISSING");

    const data = {
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      state: input.state,
      isFeatured: input.isFeatured,
      sortOrder: input.sortOrder,
      homepageOrder: input.homepageOrder,
      coverMediaId: input.coverMediaId || null,
      heroMediaId: input.heroMediaId || null,
    };
    const saved = current
      ? await db.collection.update({ where: { id: current.id }, data, select: { products: { select: { product: { select: { slug: true } } } } } })
      : await db.collection.create({ data, select: { products: { select: { product: { select: { slug: true } } } } } });
    revalidateCollectionConsumers(saved.products.map((relation) => relation.product.slug));
  } catch (cause) {
    console.error("Collection save failed", cause);
    const known = cause instanceof Error ? cause.message : "";
    const message = known === "MEDIA" ? "Choose existing approved Collection images."
      : known === "MEDIA_PATH" ? "The selected Collection image does not have a public-safe storage key."
      : known === "HOMEPAGE_IMAGE" ? "A published Featured Collection requires an approved Main Image before it can appear on the homepage."
      : known === "MISSING" ? "This Collection no longer exists."
      : errorCode(cause) === "P2002" ? "That Collection slug is already in use. Choose a unique slug."
      : "The Collection could not be saved. Check its name, slug and image selections.";
    redirect(editorUrl(input.id, message));
  }

  redirect("/admin/collections?saved=1");
}

export async function archiveCollection(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = id.safeParse(value(form, "id"));
  if (!parsed.success) redirect("/admin/collections?error=Invalid%20Collection.");
  try {
    const collection = await getDb().collection.update({
      where: { id: parsed.data },
      data: { state: "ARCHIVED" },
      select: { products: { select: { product: { select: { slug: true } } } } },
    });
    revalidateCollectionConsumers(collection.products.map((relation) => relation.product.slug));
  } catch (cause) {
    console.error("Collection archive failed", cause);
    redirect("/admin/collections?error=The%20Collection%20could%20not%20be%20archived.");
  }
  redirect("/admin/collections?archived=1");
}
