// Criterio único de vencimiento de una certificación: lo usan el perfil
// público (SealBadge) y la tarjeta del directorio (BarberiaCard), para que
// las dos pantallas no puedan discrepar. Sin fecha_vencimiento no vence.
export function certificacionVencida(fechaVencimiento: string | null | undefined): boolean {
  return Boolean(fechaVencimiento && new Date(fechaVencimiento) < new Date());
}
