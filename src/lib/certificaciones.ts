// Estado del sello derivado de `certificaciones`, la fuente de verdad
// (DESIGN.md 13.1). Lo usan el perfil público y la tarjeta del directorio,
// para que las dos pantallas no puedan discrepar.

type CertificacionBase = {
  estado: string;
  categoria: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
};

// Criterio único de vencimiento. Sin fecha_vencimiento no vence.
export function certificacionVencida(fechaVencimiento: string | null | undefined): boolean {
  return Boolean(fechaVencimiento && new Date(fechaVencimiento) < new Date());
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
// de la certificación de calidad más reciente.
export function situacionSello(actual: CertificacionBase | null): SituacionSello {
  if (!actual) return "sin-certificacion";
  if (actual.estado === "pendiente") return "en-verificacion";
  if (actual.estado === "activo") return certificacionVencida(actual.fecha_vencimiento) ? "vencida" : "vigente";
  return "revocada";
}
