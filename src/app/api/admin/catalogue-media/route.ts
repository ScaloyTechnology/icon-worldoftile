import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

import { mediaUrl } from "@/lib/media";
import { trustedRequestOrigin } from "@/server/auth/policy";
import { currentAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

export const runtime = "nodejs";

const extensions = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["application/pdf", "pdf"],
]);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

function validImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/avif") { const brands = bytes.subarray(8, Math.min(bytes.length, 40)).toString("ascii"); return bytes.length > 16 && bytes.subarray(4, 8).toString("ascii") === "ftyp" && (brands.includes("avif") || brands.includes("avis")); }
  return false;
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  const admin = await currentAdmin();
  if (!admin) return fail("Your Admin session has expired.", 401);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return fail("Choose a catalogue cover or PDF file.", 415);

  try {
    const form = await request.formData();
    const entry = form.get("file");
    const altEntry = form.get("alt");
    const kindEntry = form.get("kind");
    const kind = kindEntry === "pdf" ? "pdf" : "cover";
    if (!(entry instanceof File)) return fail("Choose a catalogue cover or PDF file.", 400);
    const extension = extensions.get(entry.type);
    if (!extension || (kind === "pdf" ? entry.type !== "application/pdf" : !entry.type.startsWith("image/"))) {
      return fail(kind === "pdf" ? "Use a valid PDF file." : "Use a JPG, PNG, WebP or AVIF cover image.", 400);
    }
    if (!Number.isSafeInteger(entry.size) || entry.size < 1) return fail("The selected file has an invalid size.", 400);

    const bytes = Buffer.from(await entry.arrayBuffer());
    if (bytes.byteLength !== entry.size) return fail("The selected file could not be read.", 400);
    if (kind === "pdf" && (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-")) return fail("The selected file is not a valid PDF.", 400);
    if (kind === "cover" && !validImageSignature(bytes, entry.type)) return fail("The selected file is not a valid supported image.", 400);

    let width: number | null = null;
    let height: number | null = null;
    if (kind === "cover") {
      const metadata = await sharp(bytes).metadata();
      if (!metadata.width || !metadata.height) return fail("The catalogue cover dimensions could not be read.", 400);
      width = metadata.width;
      height = metadata.height;
    }

    const filename = `${randomUUID()}.${extension}`;
    const relativeKey = `media/uploads/catalogues/${filename}`;
    const directory = join(process.cwd(), "public", "media", "uploads", "catalogues");
    const destination = join(directory, filename);
    await mkdir(directory, { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });

    try {
      const originalFilename = entry.name.replace(/[\u0000-\u001f]/g, "").slice(0, 240) || filename;
      const alt = (typeof altEntry === "string" ? altEntry.trim() : "").slice(0, 300) || (kind === "pdf" ? originalFilename : "ICON catalogue cover");
      const record = await getDb().mediaAsset.create({
        data: {
          storageKey: relativeKey,
          sourcePath: `admin-catalogue-upload:${kind}:${admin.id}`,
          originalFilename,
          mimeType: entry.type,
          byteSize: BigInt(bytes.byteLength),
          width,
          height,
          alt,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          approved: true,
        },
        select: { id: true, alt: true, storageKey: true, width: true, height: true, originalFilename: true, byteSize: true, mimeType: true },
      });
      return NextResponse.json({ asset: {
        id: record.id,
        alt: record.alt,
        src: mediaUrl(record.storageKey),
        width: record.width,
        height: record.height,
        filename: record.originalFilename,
        byteSize: record.byteSize.toString(),
        mimeType: record.mimeType,
      } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (cause) {
      await unlink(destination).catch(() => undefined);
      throw cause;
    }
  } catch (cause) {
    console.error("Catalogue media upload failed", cause);
    return fail("The catalogue file could not be uploaded. Check server storage permissions and try again.", 500);
  }
}
