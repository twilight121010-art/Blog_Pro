import type { FileUploadResponse } from "@blog/shared";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../lib/http-error.js";
import { uploadsRoot } from "../../lib/workspace.js";

const MAX_UPLOAD_SIZE = 5 * 1024 * 1024;
const ALLOWED_CATEGORIES = ["avatars", "covers", "posts"] as const;

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-");
}

function extensionFromMimeType(mimeType: string) {
  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
  };

  return map[mimeType] ?? "";
}

function parseDataUrl(dataUrl: string) {
  const matched = dataUrl.match(/^data:([^;]+);base64,(.+)$/);

  if (!matched) {
    throw new HttpError(400, "Invalid data URL");
  }

  return {
    mimeType: matched[1],
    buffer: Buffer.from(matched[2], "base64"),
  };
}

function ensureCategory(category: string) {
  if (!ALLOWED_CATEGORIES.includes(category as (typeof ALLOWED_CATEGORIES)[number])) {
    throw new HttpError(400, `Unsupported upload category: ${category}`);
  }

  return category;
}

function resolveUploadPath(relativePath: string) {
  const absolutePath = resolve(uploadsRoot, relativePath);

  if (!absolutePath.startsWith(resolve(uploadsRoot))) {
    throw new HttpError(400, "Invalid upload path");
  }

  return absolutePath;
}

export async function saveUpload(
  ownerId: string,
  input: {
    filename?: string;
    category?: string;
    dataUrl?: string;
  },
): Promise<FileUploadResponse["item"]> {
  const filename = sanitizeFilename((input.filename ?? "upload").trim());
  const category = ensureCategory((input.category ?? "posts").trim());
  const dataUrl = input.dataUrl?.trim() ?? "";

  if (!dataUrl) {
    throw new HttpError(400, "Upload data is required");
  }

  const { mimeType, buffer } = parseDataUrl(dataUrl);

  if (!mimeType.startsWith("image/")) {
    throw new HttpError(400, "Only image uploads are supported");
  }

  if (buffer.byteLength > MAX_UPLOAD_SIZE) {
    throw new HttpError(400, "Upload exceeds the 5MB size limit");
  }

  const extension = extname(filename) || extensionFromMimeType(mimeType);
  const relativePath = join(
    category,
    `${Date.now()}-${randomBytes(4).toString("hex")}${extension}`,
  );
  const publicUrl = `/${join("uploads", relativePath).replace(/\\/g, "/")}`;
  const absolutePath = resolveUploadPath(relativePath);

  await mkdir(resolve(uploadsRoot, category), { recursive: true });
  await writeFile(absolutePath, buffer);

  const file = await prisma.fileAsset.create({
    data: {
      ownerId,
      category,
      originalName: filename,
      mimeType,
      relativePath: relativePath.replace(/\\/g, "/"),
      publicUrl,
      size: buffer.byteLength,
    },
  });

  return {
    id: file.id,
    publicUrl: file.publicUrl,
    category: file.category,
    originalName: file.originalName,
    mimeType: file.mimeType,
    size: file.size,
  };
}

export async function readUpload(publicUrl: string) {
  const asset = await prisma.fileAsset.findUnique({
    where: {
      publicUrl,
    },
  });

  if (!asset) {
    throw new HttpError(404, "Upload not found");
  }

  const buffer = await readFile(resolveUploadPath(asset.relativePath));

  return {
    buffer,
    mimeType: asset.mimeType,
  };
}
