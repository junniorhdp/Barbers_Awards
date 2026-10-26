// Estado del sello derivado de `certificaciones`, la fuente de verdad
// (DESIGN.md 13.1). Lo usan el perfil público, la tarjeta del directorio,
// /verificar y el panel de admin, para que ninguna pantalla pueda discrepar.

type CertificacionBase = {
  estado: string;
  categoria: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
};

type ConVencimiento = { estado: string; fecha_vencimiento: string | null };

function fechaPasada(fechaVencimiento: string | null | undefined): boolean {
  return Boolean(fechaVencimiento && new Date(fechaVencimiento) < new Date());
}

// Vencida si el cron ya la marcó ('vencido', SCHEMA.sql v1.9) O si sigue en
// 'activo' con la fecha ya pasada. Las dos condiciones, no una: el cron corre
// una vez al día, así que durante hasta 24 horas una certificación vencida
// sigue en 'activo'. El estado es una conveniencia; la garantía es la fecha.
export function certificacionVencida(c: ConVencimiento): boolean {
  return c.estado === "vencido" || (c.estado === "activo" && fechaPasada(c.fecha_vencimiento));
}

// Vigente: 'activo' y con la fecha sin pasar. 'activo' nunca basta solo.
export function certificacionVigente(c: ConVencimiento): boolean {
  return c.estado === "activo" && !fechaPasada(c.fecha_vencimiento);
}

// La certificación de calidad actual: la activa si existe (el índice único
// garantiza que hay a lo sumo una, vencida o no), y si no, la más reciente
// por fecha_emision. Las demás son historial: una pausada hace un mes y nunca
// reanudada no debe decidir lo que se muestra hoy. Preferir la activa evita
// que una fecha_emision editada a mano esconda la certificación real.
export function certificacionCalidadActual<T extends CertificacionBase>(certificaciones: T[]): T | null {
  const activa = certificaciones.find((c) => c.categoria === "calidad" && c.estado === "activo");
  if (activa) return activa;
  let actual: T | null = null;
  for (const c of certificaciones) {
    if (c.categoria !== "calidad") continue;
    if (!actual || new Date(c.fecha_emision).getTime() > new Date(actual.fecha_emision).getTime()) actual = c;
  }
  return actual;
}

export type SituacionSello = "sin-certificacion" | "en-verificacion" | "vigente" | "vencida" | "revocada";

// La etiqueta describe la situación actual, no el historial: se deriva solo
// de la certificación de calidad actual.
export function situacionSello(actual: CertificacionBase | null): SituacionSello {
  if (!actual) return "sin-certificacion";
  if (actual.estado === "pendiente") return "en-verificacion";
  if (certificacionVencida(actual)) return "vencida";
  if (certificacionVigente(actual)) return "vigente";
  return "revocada";
}
