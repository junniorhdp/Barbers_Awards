"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CuponSeleccionado = { id: string; codigo: string } | null;

type ReservaContextValor = {
  cupon: CuponSeleccionado;
  // Último cupón no nulo conocido: permite que el selector ofrezca "volver a
  // aplicar" después de quitarlo, sin cerrar el modal (ver WhatsAppBookingSheet).
  ultimoCupon: CuponSeleccionado;
  seleccionarCupon: (cupon: CuponSeleccionado) => void;
  abierto: boolean;
  abrir: () => void;
  cerrar: () => void;
};

const ReservaContext = createContext<ReservaContextValor | null>(null);

const CLAVE_SESSION_STORAGE = "ba_cupon_seleccionado";

// Contexto de reserva (CU-05 + CU-06): el cupón copiado en CouponCard queda
// disponible aquí, respaldado por sessionStorage (ARCHITECTURE.md 4.2.1), para
// que WhatsAppBookingSheet lo muestre precargado sin importar desde qué botón
// se abrió el selector (encabezado, contacto o el flotante).
export function ReservaProvider({ children }: { children: React.ReactNode }) {
  const [cupon, setCupon] = useState<CuponSeleccionado>(null);
  const [ultimoCupon, setUltimoCupon] = useState<CuponSeleccionado>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    try {
      const guardado = sessionStorage.getItem(CLAVE_SESSION_STORAGE);
      // Debe leerse después de montar (sessionStorage no existe en el
      // servidor): mismo patrón que OpenNowBadge, no es un efecto evitable.
      if (guardado) {
        const parseado = JSON.parse(guardado);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCupon(parseado);
        setUltimoCupon(parseado);
      }
    } catch {
      // sessionStorage puede fallar en ventanas privadas; sin cupón precargado no rompe el flujo.
    }
  }, []);

  function seleccionarCupon(nuevo: CuponSeleccionado) {
    setCupon(nuevo);
    if (nuevo) setUltimoCupon(nuevo);
    try {
      if (nuevo) sessionStorage.setItem(CLAVE_SESSION_STORAGE, JSON.stringify(nuevo));
      else sessionStorage.removeItem(CLAVE_SESSION_STORAGE);
    } catch {
      // no persistir no es crítico: el cupón sigue seleccionado en memoria para esta sesión de React.
    }
  }

  return (
    <ReservaContext.Provider
      value={{
        cupon,
        ultimoCupon,
        seleccionarCupon,
        abierto,
        abrir: () => setAbierto(true),
        cerrar: () => setAbierto(false),
      }}
    >
      {children}
    </ReservaContext.Provider>
  );
}

export function useReserva() {
  const ctx = useContext(ReservaContext);
  if (!ctx) throw new Error("useReserva debe usarse dentro de ReservaProvider.");
  return ctx;
}
