"use server";

import { open, realpath, stat } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { mediaUrl } from "@/lib/media";
import { requireAdmin } from "@/server/auth/session";
import { getDb } from "@/server/db";

const keySchema = z.string().trim().min(1).max(240).regex(/^[a-zA-Z0-9/_\-.]+$/).refine((key) => !key.startsWith("/") && !key.includes(".."));
const inputSchema = z.object({ id: z.string().max(64).optional(), storageKey: keySchema, alt: z.string().trim().min(1).max(300), approved: z.boolean() });
const mimeTypes: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif", ".pdf": "application/pdf" };
async function matchesFileType(file: string, mimeType: string) {
  const handle = await open(file, "r");
  try {
    const header = Buffer.alloc(16);
    await handle.read(header, 0, header.length, 0);
    if (mimeType === "image/jpeg") return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (mimeType === "image/png") return header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (mimeType === "image/webp") return header.toString("ascii", 0, 4) === "RIFF" && header.toString("ascii", 8, 12) === "WEBP";
    if (mimeType === "image/avif") return header.toString("ascii", 4, 8) === "ftyp" && ["avif", "avis"].includes(header.toString("ascii", 8, 12));
    return mimeType === "application/pdf" && header.toString("ascii", 0, 5) === "%PDF-";
  } finally { await handle.close(); }
}
function text(form: FormData, key: string) { const entry = form.get(key); return typeof entry === "string" ? entry : ""; }
function back(message: string | null, id?: string) { return `/admin/media?${new URLSearchParams(message ? { error: message, ...(id ? { edit: id } : { action: "new" }) } : { saved: "1" })}`; }

export async function saveMediaAsset(form: FormData): Promise<void> {
  await requireAdmin();
  const parsed = inputSchema.safeParse({ id: text(form, "id") || undefined, storageKey: text(form, "storageKey"), alt: text(form, "alt"), approved: text(form, "approved") === "on" });
  if (!parsed.success) redirect(back("Enter a valid deployed media key and descriptive alt text.", text(form, "id") || undefined));
  const input = parsed.data;
  let error: string | null = null;
  try {
    const editorialAsset = input.storageKey.startsWith("assets/");
    const bundledMedia = input.storageKey.startsWith("media/");
    if (process.env.MEDIA_BASE_URL && !input.id && !editorialAsset && !bundledMedia) throw new Error("CDN storage cannot be verified from the deployed public directory");
    const db = getDb();
    const existing = input.id ? await db.mediaAsset.findUnique({ where: { id: input.id }, select: { id: true, storageKey: true, mimeType: true, approved: true } }) : null;
    if (input.id && !existing) error = "This media asset no longer exists.";
    else if (existing && existing.storageKey !== input.storageKey) error = "An existing storage key cannot be changed.";
    else if (existing) {
      mediaUrl(existing.storageKey);
      if (input.approved && !existing.approved) {
        if (!Object.values(mimeTypes).includes(existing.mimeType)) error = "Only supported image and PDF assets can be approved.";
        else if (process.env.MEDIA_BASE_URL && !editorialAsset && !bundledMedia) error = "A CDN file needs a verified persistent storage workflow before new approval.";
        else {
          const root = resolve(process.cwd(), "public", editorialAsset ? "assets" : "media");
          const relativeKey = editorialAsset ? input.storageKey.slice("assets/".length) : bundledMedia ? input.storageKey.slice("media/".length) : input.storageKey;
          const file = resolve(root, relativeKey);
          const realRoot = await realpath(root);
          const realFile = await realpath(file);
          const info = await stat(file);
          if (!relativeKey || !file.startsWith(`${root}${sep}`) || !realFile.startsWith(`${realRoot}${sep}`) || !info.isFile() || info.size <= 0 || info.size > 100 * 1024 * 1024 || !await matchesFileType(file, existing.mimeType)) error = "The deployed file is missing or does not match its media type.";
        }
      }
      if (!error) await db.mediaAsset.update({ where: { id: existing.id }, data: { alt: input.alt, approved: input.approved } });
    }
    else {
      const root = resolve(process.cwd(), "public", editorialAsset ? "assets" : "media");
      const relativeKey = editorialAsset ? input.storageKey.slice("assets/".length) : bundledMedia ? input.storageKey.slice("media/".length) : input.storageKey;
      const file = resolve(root, relativeKey);
      const extension = `.${input.storageKey.split(".").pop()?.toLowerCase() ?? ""}`;
      const mimeType = mimeTypes[extension];
      if (!relativeKey || !file.startsWith(`${root}${sep}`) || !mimeType) error = "Only deployed image and PDF files under public/media or public/assets can be registered.";
      if (!error) {
        const realRoot = await realpath(root);
        const realFile = await realpath(file);
        if (!realFile.startsWith(`${realRoot}${sep}`)) throw new Error("Media path resolves outside an allowed public asset root");
        const info = await stat(file);
        if (!info.isFile() || info.size <= 0 || info.size > 100 * 1024 * 1024) error = "The deployed file is missing or exceeds 100 MB.";
        else if (!await matchesFileType(file, mimeType)) error = "The file content does not match its image/PDF extension.";
        else await db.mediaAsset.create({ data: {
          storageKey: input.storageKey, sourcePath: `public/${editorialAsset ? "assets" : "media"}/${relativeKey}`,
          originalFilename: basename(file), mimeType, byteSize: BigInt(info.size), alt: input.alt,
          approved: input.approved,
        } });
      }
    }
  } catch (cause) { console.error("Media save failed", cause); error = process.env.MEDIA_BASE_URL && !input.id && !input.storageKey.startsWith("assets/") && !input.storageKey.startsWith("media/")
    ? "CDN media registration needs a verified persistent storage workflow. Existing assets can still be edited."
    : "Media could not be saved. Confirm the file exists under public/media or public/assets and the key is unique."; }
  if (error) redirect(back(error, input.id));
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/products/[slug]", "page");
  revalidatePath("/admin/media");
  redirect(back(null));
}
