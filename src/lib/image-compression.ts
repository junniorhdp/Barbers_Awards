"use client";
import imageCompression from "browser-image-compression";

// ARCHITECTURE.md 2.5: dos techos de peso. Las fotos de galería y los
// avatares quedan bajo 300 KB; la foto de portada, que se ve en grande,
// tiene un techo propio de 600 KB.
export const MAX_BYTES_ESTANDAR = 300 * 1024;
export const MAX_BYTES_PORTADA = 600 * 1024;

// Toda imagen se convierte a WebP antes de subirse a Storage. Los PDF de
// diplomas no se comprimen.
export async function compressToWebp(
  file: File,
  maxDim = 1600,
  maxBytes = MAX_BYTES_ESTANDAR,
): Promise<File> {
  if (file.type === "application/pdf") return file;

  // maxSizeMB es un objetivo aproximado de la librería: se apunta un poco
  // por debajo del techo y se verifica el tamaño final abajo.
  const maxSizeMB = (maxBytes / (1024 * 1024)) * 0.97;

  let quality = 0.8;
  let out = file;
  for (let i = 0; i < 4; i++) {
    out = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight: maxDim, // 2000 portada, 1600 fotos del local, 512 avatares
      useWebWorker: true,
      fileType: "image/webp",
      initialQuality: quality,
    });
    if (out.size <= maxBytes) break;
    quality -= 0.15;
  }
  if (out.size > maxBytes) {
    throw new Error(`La imagen no se pudo reducir a menos de ${Math.round(maxBytes / 1024)} KB`);
  }
  return out;
}
