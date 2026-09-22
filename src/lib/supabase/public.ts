import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// ARCHITECTURE.md 3.4: páginas públicas estáticas (ISR) usan un cliente
// supabase-js plano, sin sesión ni cookies — leer cookies() volvería la
// página dinámica y anularía el ISR (ver 3.5). RLS sigue aplicando con el
// rol `anon`.
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}
