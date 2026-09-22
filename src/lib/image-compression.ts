"use client";
import imageCompression from "browser-image-compression";

const MAX_BYTES = 300 * 1024;

// ARCHITECTURE.md 2.5: toda imagen se convierte a WebP y pesa menos de 300 KB
// antes de subirse a Storage. Los PDF de diplomas no se comprimen.
export async function compressToWebp(file: File, maxDim = 1600): Promise<File> {
  if (file.type === "application/pdf") return file;

  let quality = 0.8;
  let out = file;
  for (let i = 0; i < 4; i++) {
    out = await imageCompression(file, {
      maxSizeMB: 0.29,
      maxWidthOrHeight: maxDim, // 1600 fotos del local, 512 avatares
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: quality,
    });
    if (out.size <= MAX_BYTES) break;
    quality -= 0.15;
  }
  if (out.size > MAX_BYTES) {
    throw new Error("La imagen no se pudo reducir a menos de 300 KB");
  }
  return out;
}
