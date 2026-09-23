import { createHash, randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { mediaUrl } from "@/lib/media";
import { trustedRequestOrigin } from "@/server/auth/policy";
import { currentAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

export const runtime = "nodejs";
const extensions = new Map([
  ["image/jpeg", "jpg"], ["image/png", "png"], ["image/webp", "webp"], ["image/avif", "avif"],
  ["application/pdf", "pdf"],
]);
const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
function validImageSignature(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mimeType === "image/png") return bytes.length > 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mimeType === "image/webp") return bytes.length > 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  if (mimeType === "image/avif") { const brands = bytes.subarray(8, Math.min(bytes.length, 40)).toString("ascii"); return bytes.length > 16 && bytes.subarray(4, 8).toString("ascii") === "ftyp" && (brands.includes("avif") || brands.includes("avis")); }
  if (mimeType === "application/pdf") return bytes.length > 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

export async function POST(request: NextRequest) {
  if (!trustedRequestOrigin(request)) return fail("Request origin could not be verified.", 403);
  const admin = await currentAdmin();
  if (!admin) return fail("Your Admin session has expired.", 401);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) return fail("Choose a supported file to upload.", 415);

  try {
    const form = await request.formData();
    const entry = form.get("file");
    const altEntry = form.get("alt");
    if (!(entry instanceof File)) return fail("Choose a supported file to upload.", 400);
    const extension = extensions.get(entry.type);
    if (!extension) return fail("Use a JPG, PNG, WebP, AVIF or PDF file.", 400);
    if (entry.size < 1) return fail("The selected file is empty.", 400);

    const bytes = Buffer.from(await entry.arrayBuffer());
    if (bytes.byteLength !== entry.size) return fail("The uploaded image is incomplete.", 400);
    if (!validImageSignature(bytes, entry.type)) return fail("The selected file does not contain a valid supported image or PDF.", 400);
    const filename = `${randomUUID()}.${extension}`;
    const relativeKey = `media/uploads/products/${filename}`;
    const directory = join(process.cwd(), "public", "media", "uploads", "products");
    const destination = join(directory, filename);
    await mkdir(directory, { recursive: true });
    await writeFile(destination, bytes, { flag: "wx" });

    try {
      const originalFilename = entry.name.replace(/[\u0000-\u001f]/g, "").slice(0, 240) || filename;
      const alt = (typeof altEntry === "string" ? altEntry.trim() : "").slice(0, 300) || originalFilename.replace(/\.[^.]+$/, "");
      const asset = await getDb().mediaAsset.create({ data: {
        storageKey: relativeKey, sourcePath: `admin-upload:${admin.id}`, originalFilename, mimeType: entry.type,
        byteSize: BigInt(bytes.byteLength), alt, sha256: createHash("sha256").update(bytes).digest("hex"), approved: true,
      }, select: { id: true, originalFilename: true, alt: true, storageKey: true, mimeType: true } });
      return NextResponse.json({ asset: { id: asset.id, label: asset.alt || asset.originalFilename, src: mediaUrl(asset.storageKey), mimeType: asset.mimeType } }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      await unlink(destination).catch(() => undefined);
      throw error;
    }
  } catch (error) {
    console.error("Product image upload failed", error);
    return fail("The file could not be uploaded. Check server storage permissions and try again.", 500);
  }
}
