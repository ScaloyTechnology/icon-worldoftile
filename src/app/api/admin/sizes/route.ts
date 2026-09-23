import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { trustedRequestOrigin } from "@/server/auth/policy";
import { currentAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

export const runtime = "nodejs";

const sizeSchema = z.object({
  label: z.string().trim().min(1).max(100),
  widthMm: z.coerce.number().positive().max(100000),
  lengthMm: z.coerce.number().positive().max(100000),
});

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

function errorCode(cause: unknown) {
  return typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string" ? cause.code : "";
}

async function findExistingSize(label: string, widthMm: number, lengthMm: number) {
  return getDb().size.findFirst({
    where: { OR: [{ label }, { widthMm, lengthMm }] },
    orderBy: { id: "asc" },
    select: { id: true, label: true },
  });
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  if (!await currentAdmin()) return fail("Your Admin session has expired.", 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Submit a valid Size record.", 415);

  let input: z.infer<typeof sizeSchema> | null = null;
  try {
    const parsed = sizeSchema.safeParse(await request.json());
    if (!parsed.success) return fail("Enter a Size label and positive width and length values.", 400);
    input = parsed.data;
    const existing = await findExistingSize(input.label, input.widthMm, input.lengthMm);
    if (existing) return NextResponse.json({ size: existing, reused: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
    const size = await getDb().size.create({
      data: input,
      select: { id: true, label: true },
    });
    return NextResponse.json({ size }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    if (errorCode(cause) === "P2002" && input) {
      const existing = await findExistingSize(input.label, input.widthMm, input.lengthMm);
      if (existing) return NextResponse.json({ size: existing, reused: true }, { status: 200, headers: { "Cache-Control": "no-store" } });
      return fail("That Size conflicts with an existing Size record.", 409);
    }
    console.error("Size creation failed", cause);
    return fail("The Size could not be created. Please try again.", 500);
  }
}
