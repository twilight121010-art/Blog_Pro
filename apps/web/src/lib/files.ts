import type { FileUploadResponse } from "@blog/shared";
import { API_ROUTES } from "@blog/shared";
import { apiFetch } from "./api";

export async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new Error("Failed to read the selected file"));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read the selected file"));
    };

    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(
  file: File,
  category: "avatars" | "covers" | "posts",
) {
  const dataUrl = await fileToDataUrl(file);

  const payload = await apiFetch<FileUploadResponse>(API_ROUTES.uploads, {
    method: "POST",
    body: JSON.stringify({
      filename: file.name,
      category,
      dataUrl,
    }),
  });

  return payload.item;
}
