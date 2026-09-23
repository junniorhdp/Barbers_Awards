import "server-only";

// Límite de frecuencia en memoria para /api/leads (ARCHITECTURE.md 4.2.5).
// Best-effort a propósito: sin credenciales de Upstash configuradas todavía
// (decisión de la Fase 5), este contador vive en la memoria de la instancia
// serverless y se reinicia en cada arranque en frío o si Vercel enruta a otra
// instancia — no es una barrera dura, solo amortigua ráfagas mientras el
// piloto no justifica una dependencia externa. Reemplazar por Upstash
// Ratelimit si el tráfico real lo exige.
const intentos = new Map<string, { conteo: number; reinicioEn: number }>();

const VENTANA_MS = 60_000;
const MAX_INTENTOS = 10;

export function excedeLimiteFrecuencia(llave: string): boolean {
  const ahora = Date.now();
  const registro = intentos.get(llave);

  if (!registro || ahora > registro.reinicioEn) {
    intentos.set(llave, { conteo: 1, reinicioEn: ahora + VENTANA_MS });
    return false;
  }

  registro.conteo += 1;
  return registro.conteo > MAX_INTENTOS;
}
