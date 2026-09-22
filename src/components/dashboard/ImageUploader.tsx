"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressToWebp } from "@/lib/image-compression";
import { publicStorageUrl } from "@/lib/storage";

const BUCKET = "barberias-storage";

type Props = {
  barberiaId: string;
  carpeta: string; // p. ej. "fotos" o "barberos/<barberoId>"
  accept?: string;
  multiple?: boolean;
  etiqueta: string;
  onSubido: (rutas: string[]) => void;
};

// ARCHITECTURE.md 2.5 y 3.4: comprime en el navegador (salvo PDF) y sube con
// la sesión del dueño; las políticas RLS del bucket validan que el primer
// segmento de la ruta sea una barbería suya.
export function ImageUploader({ barberiaId, carpeta, accept, multiple, etiqueta, onSubido }: Props) {
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function manejarArchivos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);
    setError(null);

    try {
      const supabase = createClient();
      const rutas: string[] = [];

      for (const archivo of Array.from(archivos)) {
        const listo = await compressToWebp(archivo);
        const extension = listo.type === "application/pdf" ? "pdf" : "webp";
        const ruta = `${barberiaId}/${carpeta}/${crypto.randomUUID()}.${extension}`;

        const { error: subidaError } = await supabase.storage
          .from(BUCKET)
          .upload(ruta, listo, { contentType: listo.type, cacheControl: "31536000", upsert: false });

        if (subidaError) throw subidaError;
        rutas.push(ruta);
      }

      onSubido(rutas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm text-muted">{etiqueta}</label>
      <input
        type="file"
        accept={accept ?? "image/*"}
        multiple={multiple}
        disabled={subiendo}
        onChange={(e) => manejarArchivos(e.target.files)}
        className="text-sm text-ink file:mr-3 file:rounded file:border-0 file:bg-violet file:px-3 file:py-1.5 file:text-white"
      />
      {subiendo ? <p className="text-sm text-muted">Subiendo…</p> : null}
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
    </div>
  );
}

export const urlPublicaStorage = publicStorageUrl;
