"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const slug = z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const id = z.string().max(64).optional();
const order = z.coerce.number().int().min(0).max(100000);
const definition = z.object({ id, slug, name: z.string().trim().min(1).max(100), kind: z.enum(["FINISH", "SURFACE", "COLOUR", "LOOK", "MATERIAL", "ROOM", "USAGE", "CUSTOM"]), sortOrder: order, filterable: z.boolean() });
const value = z.object({ id, definitionId: z.string().min(1).max(64), slug, label: z.string().trim().min(1).max(100), sortOrder: order });
const size = z.object({ id, label: z.string().trim().min(1).max(100), widthMm: z.coerce.number().positive().max(999999), lengthMm: z.coerce.number().positive().max(999999) });
const application = z.object({ id, slug, name: z.string().trim().min(1).max(100), state: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]), sortOrder: order });
const specification = z.object({ id, key: slug, label: z.string().trim().min(1).max(100), unit: z.string().trim().max(40), testMethod: z.string().trim().max(200) });
function field(form: FormData, key: string) { const entry = form.get(key); return typeof entry === "string" ? entry : ""; }
function url(error: string | null, kind?: string, id?: string) { return `/admin/product-masters?${new URLSearchParams(error ? { error, ...(kind ? { type: kind } : {}), ...(id ? { edit: id } : {}) } : { saved: "1" })}`; }

export async function saveProductMaster(form: FormData): Promise<void> {
  await requireAdmin();
  const kind = field(form, "intent");
  let error: string | null = null;
  try {
    const db = getDb();
    if (kind === "definition") {
      const parsed = definition.safeParse({ id: field(form, "id") || undefined, slug: field(form, "slug"), name: field(form, "name"), kind: field(form, "kind"), sortOrder: field(form, "sortOrder"), filterable: field(form, "filterable") === "on" });
      if (!parsed.success) error = "Check the attribute definition fields.";
      else {
        const input = parsed.data;
        const current = input.id ? await db.attributeDefinition.findUnique({ where: { id: input.id }, select: { slug: true, kind: true } }) : null;
        if (input.id && !current) error = "The definition no longer exists.";
        else if (current && (current.slug !== input.slug || current.kind !== input.kind)) error = "An existing definition's slug and kind must remain stable.";
        else if (input.id) await db.attributeDefinition.update({ where: { id: input.id }, data: { name: input.name, sortOrder: input.sortOrder, filterable: input.filterable } });
        else await db.attributeDefinition.create({ data: { slug: input.slug, name: input.name, kind: input.kind, sortOrder: input.sortOrder, filterable: input.filterable } });
      }
    } else if (kind === "value") {
      const parsed = value.safeParse({ id: field(form, "id") || undefined, definitionId: field(form, "definitionId"), slug: field(form, "slug"), label: field(form, "label"), sortOrder: field(form, "sortOrder") });
      if (!parsed.success) error = "Check the attribute value fields.";
      else {
        const input = parsed.data;
        const [parent, current] = await Promise.all([
          db.attributeDefinition.findUnique({ where: { id: input.definitionId }, select: { id: true } }),
          input.id ? db.attributeValue.findUnique({ where: { id: input.id }, select: { slug: true, definitionId: true } }) : null,
        ]);
        if (!parent || (input.id && !current)) error = "The selected master record no longer exists.";
        else if (current && (current.slug !== input.slug || current.definitionId !== input.definitionId)) error = "An existing value's slug and definition must remain stable.";
        else if (input.id) await db.attributeValue.update({ where: { id: input.id }, data: { label: input.label, sortOrder: input.sortOrder } });
        else await db.attributeValue.create({ data: { definitionId: input.definitionId, slug: input.slug, label: input.label, sortOrder: input.sortOrder } });
      }
    } else if (kind === "size") {
      const parsed = size.safeParse({ id: field(form, "id") || undefined, label: field(form, "label"), widthMm: field(form, "widthMm"), lengthMm: field(form, "lengthMm") });
      if (!parsed.success) error = "Check the size label and dimensions.";
      else {
        const input = parsed.data;
        const current = input.id ? await db.size.findUnique({ where: { id: input.id }, select: { id: true } }) : null;
        if (input.id && !current) error = "The size no longer exists.";
        else if (current) await db.size.update({ where: { id: current.id }, data: { label: input.label, widthMm: input.widthMm, lengthMm: input.lengthMm } });
        else await db.size.create({ data: { label: input.label, widthMm: input.widthMm, lengthMm: input.lengthMm } });
      }
    } else if (kind === "application") {
      const parsed = application.safeParse({ id: field(form, "id") || undefined, slug: field(form, "slug"), name: field(form, "name"), state: field(form, "state"), sortOrder: field(form, "sortOrder") });
      if (!parsed.success) error = "Check the application fields.";
      else {
        const input = parsed.data;
        const current = input.id ? await db.application.findUnique({ where: { id: input.id }, select: { slug: true } }) : null;
        if (input.id && !current) error = "The application no longer exists.";
        else if (current && current.slug !== input.slug) error = "An existing application slug must remain stable.";
        else if (input.id) await db.application.update({ where: { id: input.id }, data: { name: input.name, state: input.state, sortOrder: input.sortOrder } });
        else await db.application.create({ data: { slug: input.slug, name: input.name, state: input.state, sortOrder: input.sortOrder } });
      }
    } else if (kind === "specification") {
      const parsed = specification.safeParse({ id: field(form, "id") || undefined, key: field(form, "key"), label: field(form, "label"), unit: field(form, "unit"), testMethod: field(form, "testMethod") });
      if (!parsed.success) error = "Check the specification definition fields.";
      else {
        const input = parsed.data;
        const current = input.id ? await db.specificationDefinition.findUnique({ where: { id: input.id }, select: { key: true } }) : null;
        if (input.id && !current) error = "The specification no longer exists.";
        else if (current && current.key !== input.key) error = "An existing specification key must remain stable.";
        else if (input.id) await db.specificationDefinition.update({ where: { id: input.id }, data: { label: input.label, unit: input.unit || null, testMethod: input.testMethod || null } });
        else await db.specificationDefinition.create({ data: { key: input.key, label: input.label, unit: input.unit || null, testMethod: input.testMethod || null } });
      }
    } else error = "Unknown product master type.";
  } catch (cause) { console.error("Product master save failed", cause); error = "The master record could not be saved. Check the database and unique values."; }
  if (error) redirect(url(error, kind, field(form, "id") || undefined));
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/");
  revalidatePath("/admin/product-masters");
  redirect(url(null));
}
