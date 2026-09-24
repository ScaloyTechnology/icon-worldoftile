"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { Prisma } from "@/generated/prisma/client";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { projectPageMediaSettingsSchema } from "@/server/projects/projects-admin-data";

const projectStorySchema = z.object({
  id: z.string().trim().max(64),
  title: z.string().trim().min(2).max(180),
  slug: z.string().trim().max(180),
  introduction: z.string().trim().min(2).max(3000),
  category: z.string().trim().min(2).max(100),
  location: z.string().trim().max(160),
  published: z.boolean(),
  mediaIds: z.array(z.string().trim().min(1).max(64)).min(1).max(40),
});

function value(formData: FormData, name: string) {
  const entry = formData.get(name);
  return typeof entry === "string" ? entry.trim() : "";
}

function values(formData: FormData, name: string) {
  return formData.getAll(name).flatMap((entry) => typeof entry === "string" && entry.trim() ? entry.trim() : []);
}

function allValues(formData: FormData, name: string) {
  return formData.getAll(name).map((entry) => typeof entry === "string" ? entry.trim() : "");
}

function slugify(input: string) {
  return input.toLocaleLowerCase("en").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 180);
}

function adminError(message: string) {
  return `/admin/projects?error=${encodeURIComponent(message)}`;
}

export async function saveProjectsPageMedia(formData: FormData): Promise<void> {
  await requireAdmin();
  let categoryMedia: unknown = [];
  try { categoryMedia = JSON.parse(value(formData, "categoryMedia") || "[]"); } catch { categoryMedia = []; }
  const parsed = projectPageMediaSettingsSchema.safeParse({
    heroMediaId: value(formData, "heroMediaId"),
    featuredProjectId: value(formData, "featuredProjectId"),
    featuredPrimaryMediaId: value(formData, "featuredPrimaryMediaId"),
    featuredSecondaryMediaId: value(formData, "featuredSecondaryMediaId"),
    categoryMedia,
    galleryMediaIds: allValues(formData, "galleryMediaId"),
    sequenceMediaIds: allValues(formData, "sequenceMediaId"),
  });
  if (!parsed.success) redirect(adminError("The project page media form was incomplete. Refresh and try again."));

  try {
    const db = getDb();
    const selectedIds = [...new Set([
      parsed.data.heroMediaId,
      parsed.data.featuredPrimaryMediaId,
      parsed.data.featuredSecondaryMediaId,
      ...parsed.data.categoryMedia.map((item) => item.mediaId),
      ...parsed.data.galleryMediaIds,
      ...parsed.data.sequenceMediaIds,
    ].filter(Boolean))];
    if (selectedIds.length) {
      const approvedCount = await db.mediaAsset.count({
        where: { id: { in: selectedIds }, approved: true, mimeType: { startsWith: "image/" } },
      });
      if (approvedCount !== selectedIds.length) throw new Error("MEDIA");
    }
    if (parsed.data.featuredProjectId) {
      const projectExists = await db.project.count({ where: { id: parsed.data.featuredProjectId, state: "PUBLISHED" } });
      if (!projectExists) throw new Error("PROJECT");
    }

    const payload = parsed.data as Prisma.InputJsonValue;
    await db.$transaction(async (transaction) => {
      const section = await transaction.siteSection.upsert({
        where: { page_key: { page: "projects", key: "media" } },
        create: { page: "projects", key: "media", state: "PUBLISHED", sortOrder: 0 },
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
    console.error("Project page media save failed", cause);
    const message = cause instanceof Error && cause.message === "MEDIA"
      ? "One or more selected images are no longer approved. Replace them and try again."
      : cause instanceof Error && cause.message === "PROJECT"
        ? "The selected featured project is no longer available. Choose another project."
        : "Project page images could not be saved. The public page was not changed.";
    redirect(adminError(message));
  }

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?saved=media");
}

export async function saveProjectStory(formData: FormData): Promise<void> {
  await requireAdmin();
  const deduplicatedMedia = [...new Set(values(formData, "projectMediaId"))];
  const parsed = projectStorySchema.safeParse({
    id: value(formData, "id"),
    title: value(formData, "title"),
    slug: value(formData, "slug"),
    introduction: value(formData, "introduction"),
    category: value(formData, "category"),
    location: value(formData, "location"),
    published: value(formData, "published") === "on",
    mediaIds: deduplicatedMedia,
  });
  if (!parsed.success) redirect(adminError("Complete the title, category, description and at least one project image."));

  try {
    const db = getDb();
    const approvedCount = await db.mediaAsset.count({
      where: { id: { in: parsed.data.mediaIds }, approved: true, mimeType: { startsWith: "image/" } },
    });
    if (approvedCount !== parsed.data.mediaIds.length) throw new Error("MEDIA");

    const categorySlug = slugify(parsed.data.category);
    const projectSlug = slugify(parsed.data.slug || parsed.data.title);
    if (!categorySlug || !projectSlug) throw new Error("SLUG");

    await db.$transaction(async (transaction) => {
      const category = await transaction.projectCategory.upsert({
        where: { slug: categorySlug },
        create: { slug: categorySlug, name: parsed.data.category },
        update: { name: parsed.data.category },
        select: { id: true },
      });
      const state = parsed.data.published ? "PUBLISHED" as const : "DRAFT" as const;
      const publishedAt = parsed.data.published ? new Date() : null;
      let projectId = parsed.data.id;
      if (projectId) {
        await transaction.project.update({
          where: { id: projectId },
          data: {
            title: parsed.data.title,
            slug: projectSlug,
            introduction: parsed.data.introduction,
            location: parsed.data.location || null,
            categoryId: category.id,
            state,
            publishedAt,
          },
        });
        await transaction.projectImage.deleteMany({ where: { projectId } });
      } else {
        const lastProject = await transaction.project.findFirst({ orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
        const project = await transaction.project.create({
          data: {
            title: parsed.data.title,
            slug: projectSlug,
            introduction: parsed.data.introduction,
            location: parsed.data.location || null,
            categoryId: category.id,
            state,
            publishedAt,
            sortOrder: (lastProject?.sortOrder ?? -1) + 1,
          },
          select: { id: true },
        });
        projectId = project.id;
      }
      await transaction.projectImage.createMany({
        data: parsed.data.mediaIds.map((mediaId, sortOrder) => ({ projectId, mediaId, sortOrder })),
      });
    });
  } catch (cause) {
    console.error("Project story save failed", cause);
    const message = cause instanceof Error && cause.message === "MEDIA"
      ? "One or more project images are no longer approved. Upload them again."
      : "The project story could not be saved. Check that its title and slug are unique.";
    redirect(adminError(message));
  }

  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?saved=story");
}

export async function archiveProjectStory(projectId: string, _formData: FormData): Promise<void> {
  await requireAdmin();
  const id = projectId.trim();
  if (!id) redirect(adminError("The project story could not be identified."));
  try {
    await getDb().project.update({ where: { id }, data: { state: "ARCHIVED", publishedAt: null } });
  } catch (cause) {
    console.error("Project story archive failed", cause);
    redirect(adminError("The project story could not be archived."));
  }
  revalidatePath("/projects");
  revalidatePath("/admin/projects");
  redirect("/admin/projects?saved=archived");
}
