import "server-only";

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ICON_PUBLIC_DIR = "/uploads/icons";
const ICON_STORAGE_DIR = path.join(process.cwd(), "public", "uploads", "icons");

function sanitizeExtension(extension: string) {
  const normalized = extension.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  return normalized || "bin";
}

export function getStoredIconPublicPath(filename: string) {
  return `${ICON_PUBLIC_DIR}/${filename}`;
}

export function buildIconFilename(input: { siteUrl: string; sourceUrl?: string; extension: string }) {
  const siteHash = createHash("sha256")
    .update(`${input.siteUrl}|${input.sourceUrl || ""}`)
    .digest("hex")
    .slice(0, 24);

  return `${siteHash}.${sanitizeExtension(input.extension)}`;
}

export async function saveIconBuffer(params: {
  siteUrl: string;
  sourceUrl?: string;
  buffer: Uint8Array;
  extension: string;
}) {
  await mkdir(ICON_STORAGE_DIR, { recursive: true });
  const filename = buildIconFilename({
    siteUrl: params.siteUrl,
    sourceUrl: params.sourceUrl,
    extension: params.extension,
  });
  const filePath = path.join(ICON_STORAGE_DIR, filename);

  await writeFile(filePath, params.buffer);

  return getStoredIconPublicPath(filename);
}
