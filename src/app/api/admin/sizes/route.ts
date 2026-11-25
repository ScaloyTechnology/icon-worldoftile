import { NextRequest, NextResponse } from "next/server";

import { getSizeMaster, revalidateSizeConsumers, saveSizeMaster, sizeErrorMessage, sizeSchema } from "@/server/admin/size-master";
import { trustedRequestOrigin } from "@/server/auth/policy";
import { currentAdmin } from "@/server/auth/session";

export const runtime = "nodejs";

export const dynamic = "force-dynamic";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  if (!await currentAdmin()) return fail("Your Admin session has expired.", 401);
  try {
    return NextResponse.json({ sizes: await getSizeMaster() }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Size library could not be loaded", cause);
    return fail("The Size library could not be loaded. Please try again.", 500);
  }
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  if (!await currentAdmin()) return fail("Your Admin session has expired.", 401);
  if (!request.headers.get("content-type")?.startsWith("application/json")) return fail("Submit a valid Size record.", 415);

  let body: unknown;
  try { body = await request.json(); } catch { return fail("Submit a valid Size record.", 400); }
  const parsed = sizeSchema.safeParse(body);
  if (!parsed.success) return fail("Enter a Size label and positive dimensions with at most two decimal places.", 400);
  try {
    const result = await saveSizeMaster(parsed.data);
    revalidateSizeConsumers();
    return NextResponse.json(result, { status: result.reused ? 200 : 201, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Size creation failed", cause);
    return fail(sizeErrorMessage(cause), 409);
  }
}
