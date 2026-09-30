import "server-only";

import { mkdir, readFile, stat } from "node:fs/promises";
import { isAbsolute, join, resolve, sep } from "node:path";

const uploadKeyPrefix = "media/uploads/";
const uploadScopes = new Set(["products", "catalogues", "site"]);

function configuredUploadRoot() {
  const configured = process.env.MEDIA_UPLOAD_DIR?.trim();
  if (!configured) return join(process.cwd(), "storage", "media", "uploads");
  if (!isAbsolute(configured)) throw new Error("MEDIA_UPLOAD_DIR must be an absolute path.");
  return resolve(configured);
}

function safePath(root: string, ...parts: string[]) {
  const target = resolve(root, ...parts);
  const prefix = root.endsWith(sep) ? root : `${root}${sep}`;
  if (target !== root && !target.startsWith(prefix)) throw new Error("Invalid media storage path.");
  return target;
}

export async function createUploadDestination(scope: string, filename: string) {
  if (!uploadScopes.has(scope) || !/^[a-zA-Z0-9._-]+$/.test(filename)) throw new Error("Invalid media upload destination.");
  const root = configuredUploadRoot();
  const directory = safePath(root, scope);
  await mkdir(directory, { recursive: true });
  return {
    destination: safePath(directory, filename),
    storageKey: `${uploadKeyPrefix}${scope}/${filename}`,
  };
}

function relativeUploadPath(storageKey: string) {
  if (!storageKey.startsWith(uploadKeyPrefix)) throw new Error("This is not an uploaded media key.");
  const relative = storageKey.slice(uploadKeyPrefix.length);
  if (!/^[a-zA-Z0-9/_\-.]+$/.test(relative) || relative.includes("..") || relative.startsWith("/")) {
    throw new Error("Invalid uploaded media key.");
  }
  return relative;
}

export async function readUploadedMedia(storageKey: string) {
  const relative = relativeUploadPath(storageKey);
  const roots = [
    configuredUploadRoot(),
    // Backward compatibility for files uploaded before persistent storage was introduced.
    join(process.cwd(), "public", "media", "uploads"),
  ];

  for (const root of [...new Set(roots.map((item) => resolve(item)))]) {
    const path = safePath(root, relative);
    try {
      const [contents, details] = await Promise.all([readFile(path), stat(path)]);
      if (details.isFile()) return { contents, size: details.size };
    } catch (cause) {
      if (typeof cause === "object" && cause !== null && "code" in cause && cause.code === "ENOENT") continue;
      throw cause;
    }
  }
  return null;
}

export function uploadedMediaContentType(storageKey: string) {
  const extension = storageKey.toLowerCase().split(".").pop();
  return ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf" } as Record<string, string>)[extension ?? ""] ?? "application/octet-stream";
}
