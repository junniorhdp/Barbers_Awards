const BUCKET = "barberias-storage";

// URL pública de un objeto del bucket (es público, ver SCHEMA.sql sección 7):
// no hace falta ningún cliente de Supabase para construirla, es solo texto.
// Sirve igual en Server Components (perfil público) y en componentes de
// cliente (dashboard).
export function publicStorageUrl(ruta: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ruta}`;
}
