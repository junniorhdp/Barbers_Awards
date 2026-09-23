"use client";

import { useReserva } from "./ReservaContext";

// Disparador compartido del selector de reserva (CU-06): el encabezado, el
// bloque de contacto y el botón flotante abren el mismo WhatsAppBookingSheet
// (ARCHITECTURE.md 3.7, fila "Botones de reserva").
export function BotonReservar({
  className,
  children,
  ...props
}: React.ComponentPropsWithoutRef<"button">) {
  const { abrir } = useReserva();
  return (
    <button type="button" className={className} onClick={abrir} {...props}>
      {children}
    </button>
  );
}
