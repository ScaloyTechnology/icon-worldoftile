import { NextResponse } from "next/server";

import { getServiceHealth } from "@/services/health.service";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getServiceHealth(), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
