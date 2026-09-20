import "server-only";

import { readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";
import { mediaUrl } from "@/lib/media";
import type { AdminSelectableMedia } from "@/components/admin/admin-media-picker";

const supported: Record<string, string> = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".avif": "image/avif", ".pdf": "application/pdf",
};

async function filesUnder(root: string): Promise<string[]> {
  const output: string[] = [];
  async function visit(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  try { await visit(root); } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return output;
}

/** Read-only inventory of files already deployed with the app; nothing is imported into PostgreSQL automatically. */
export async function getDeployedMediaCandidates(registeredKeys: ReadonlySet<string>): Promise<AdminSelectableMedia[]> {
  const publicRoot = resolve(process.cwd(), "public");
  const roots = [resolve(publicRoot, "media"), resolve(publicRoot, "assets")];
  const files = (await Promise.all(roots.map(filesUnder))).flat();
  return files.flatMap((file) => {
    if (!file.startsWith(`${publicRoot}${sep}`)) return [];
    const path = relative(publicRoot, file).replaceAll("\\", "/");
    const key = path;
    const extension = `.${file.split(".").pop()?.toLowerCase() ?? ""}`;
    const mimeType = supported[extension];
    if (!mimeType || registeredKeys.has(key) || (key.startsWith("media/") && registeredKeys.has(key.slice("media/".length)))) return [];
    try { return [{ id: key, filename: file.split(/[\\/]/).pop() ?? key, alt: "", src: mediaUrl(key), mimeType }]; }
    catch { return []; }
  }).sort((a, b) => a.filename.localeCompare(b.filename));
}
