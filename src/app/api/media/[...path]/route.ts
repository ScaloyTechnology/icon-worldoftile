import { NextRequest, NextResponse } from "next/server";

import { readUploadedMedia, uploadedMediaContentType } from "@/server/media-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = Readonly<{ params: Promise<{ path: string[] }> }>;

async function serve(context: Context, includeBody: boolean) {
  const { path } = await context.params;
  const relative = path.join("/");
  const storageKey = `media/uploads/${relative}`;

  try {
    const media = await readUploadedMedia(storageKey);
    if (!media) return NextResponse.json({ error: "This media file is no longer available." }, { status: 404 });
    const headers = new Headers({
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(media.size),
      "Content-Type": uploadedMediaContentType(storageKey),
      "X-Content-Type-Options": "nosniff",
    });
    return new NextResponse(includeBody ? new Uint8Array(media.contents) : null, { status: 200, headers });
  } catch (cause) {
    console.error("Uploaded media could not be served", cause);
    return NextResponse.json({ error: "This media file could not be loaded." }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, context: Context) {
  return serve(context, true);
}

export async function HEAD(_request: NextRequest, context: Context) {
  return serve(context, false);
}
