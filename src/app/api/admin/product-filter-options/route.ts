import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { managedProductFilterTaxonomy, productFilterValueSlug } from "@/lib/products/product-filter-taxonomy";
import { trustedRequestOrigin } from "@/server/auth/policy";
import { currentAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

export const runtime = "nodejs";

const optionSchema = z.object({
  definitionId: z.string().min(1).max(64),
  label: z.string().trim().min(1).max(100),
});
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  if (!await currentAdmin()) return fail("Your Admin session has expired.", 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Submit a valid option.", 415);

  const parsed = optionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Enter an option name of up to 100 characters.", 400);
  const { definitionId, label } = parsed.data;
  const slug = productFilterValueSlug(label);
  if (!slug) return fail("Include at least one letter (A–Z) or number in the option name.", 400);

  try {
    const db = getDb();
    const definition = await db.attributeDefinition.findUnique({ where: { id: definitionId }, select: { kind: true } });
    if (!definition || !managedProductFilterTaxonomy.some(filter => filter.kind === definition.kind)) {
      return fail("This product filter is unavailable.", 404);
    }
    // Reuse matching names instead of creating duplicates or renaming a value
    // that another product already uses.
    const option = await db.attributeValue.upsert({
      where: { definitionId_slug: { definitionId, slug } },
      create: { definitionId, slug, label, sortOrder: 1000 },
      update: {},
      select: { id: true, label: true },
    });
    return NextResponse.json({ option }, { headers });
  } catch (cause) {
    console.error("Product filter option creation failed", cause);
    return fail("The option could not be added. Please try again.", 500);
  }
}
