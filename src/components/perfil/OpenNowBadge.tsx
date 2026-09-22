"use client";

import { useEffect, useState } from "react";
import { estaAbiertoAhora, type Horarios } from "@/lib/horarios";

// Se calcula en el navegador (zona America/Bogota): como /barberia/[id] usa
// ISR, calcularlo en el servidor quedaría "congelado" en la caché (3.7).
export function OpenNowBadge({ horarios }: { horarios: Horarios }) {
  const [abierto, setAbierto] = useState<boolean | null>(null);

  useEffect(() => {
    // Debe diferir de lo renderizado en el servidor (null) para no romper la
    // hidratación: se calcula después de montar a propósito, no es un efecto
    // evitable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAbierto(estaAbiertoAhora(horarios));
  }, [horarios]);

  if (abierto === null) return null;

  return (
    <div className="float-badge b1">
      <span className="dot" style={{ background: abierto ? "#4ade80" : "#a1a1aa" }} />
      {abierto ? "Abierto ahora" : "Cerrado ahora"}
    </div>
  );
}
