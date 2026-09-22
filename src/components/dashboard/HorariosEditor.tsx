"use client";

import { useState } from "react";
import { DIAS, DIA_LABELS, type Horarios } from "@/lib/horarios";

export function HorariosEditor({ valorInicial }: { valorInicial: Horarios }) {
  const [horarios, setHorarios] = useState<Horarios>(valorInicial);

  function alternarAbierto(dia: (typeof DIAS)[number]) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], abierto: !prev[dia].abierto },
    }));
  }

  function agregarFranja(dia: (typeof DIAS)[number]) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], franjas: [...prev[dia].franjas, ["09:00", "18:00"]] },
    }));
  }

  function quitarFranja(dia: (typeof DIAS)[number], indice: number) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: { ...prev[dia], franjas: prev[dia].franjas.filter((_, i) => i !== indice) },
    }));
  }

  function cambiarFranja(
    dia: (typeof DIAS)[number],
    indice: number,
    posicion: 0 | 1,
    valor: string,
  ) {
    setHorarios((prev) => ({
      ...prev,
      [dia]: {
        ...prev[dia],
        franjas: prev[dia].franjas.map((franja, i) => {
          if (i !== indice) return franja;
          const copia: [string, string] = [...franja];
          copia[posicion] = valor;
          return copia;
        }),
      },
    }));
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-sm text-muted">Horarios de atención</legend>
      <input type="hidden" name="horarios" value={JSON.stringify(horarios)} />

      {DIAS.map((dia) => (
        <div key={dia} className="flex flex-col gap-2 rounded border border-line bg-night p-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={horarios[dia].abierto}
              onChange={() => alternarAbierto(dia)}
              className="accent-violet"
            />
            {DIA_LABELS[dia]}
          </label>

          {horarios[dia].abierto ? (
            <div className="flex flex-col gap-2 pl-6">
              {horarios[dia].franjas.map((franja, indice) => (
                <div key={indice} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={franja[0]}
                    onChange={(e) => cambiarFranja(dia, indice, 0, e.target.value)}
                    className="rounded border border-line bg-carbon px-2 py-1 text-sm text-ink"
                  />
                  <span className="text-muted">a</span>
                  <input
                    type="time"
                    value={franja[1]}
                    onChange={(e) => cambiarFranja(dia, indice, 1, e.target.value)}
                    className="rounded border border-line bg-carbon px-2 py-1 text-sm text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => quitarFranja(dia, indice)}
                    className="text-sm text-red-400"
                  >
                    Quitar
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => agregarFranja(dia)}
                className="w-fit text-sm text-violet-neon underline"
              >
                + Agregar franja
              </button>
            </div>
          ) : null}
        </div>
      ))}
    </fieldset>
  );
}
