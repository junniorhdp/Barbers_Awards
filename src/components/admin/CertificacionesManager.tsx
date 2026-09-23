"use client";

import { useState, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  emitirCertificacion,
  pausarCertificacion,
  revocarCertificacion,
  type FormState,
} from "@/app/admin/(protected)/actions";

const estadoInicial: FormState = {};

type Certificacion = {
  id: string;
  folio_verificacion: string;
  estado: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
};

type Barberia = {
  id: string;
  nombre: string;
  slug: string;
  estado_sello: string;
  certificaciones: Certificacion[];
};

type Sello = { id: string; nombre_sello: string; nivel: string };

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

function FormularioAsignar({ barberiaId, sellos, onListo }: { barberiaId: string; sellos: Sello[]; onListo: () => void }) {
  const [state, formAction, pending] = useActionState(emitirCertificacion, estadoInicial);

  useEffect(() => {
    if (state.success) onListo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (sellos.length === 0) {
    return (
      <p className="text-sm text-muted">
        No hay sellos en el catálogo todavía. Crea uno en{" "}
        <Link href="/admin/sellos" className="text-violet-neon underline">
          Catálogo de sellos
        </Link>
        .
      </p>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded border border-line bg-carbon p-4">
      <input type="hidden" name="barberiaId" value={barberiaId} />

      <div className="flex flex-col gap-1">
        <label htmlFor={`sello-${barberiaId}`} className="text-sm text-muted">
          Sello
        </label>
        <select
          id={`sello-${barberiaId}`}
          name="selloId"
          required
          className="rounded border border-line bg-night px-3 py-2 text-ink"
        >
          {sellos.map((sello) => (
            <option key={sello.id} value={sello.id}>
              {sello.nombre_sello} ({sello.nivel})
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`vence-${barberiaId}`} className="text-sm text-muted">
          Vigente hasta (opcional)
        </label>
        <input
          id={`vence-${barberiaId}`}
          name="fechaVencimiento"
          type="date"
          className="rounded border border-line bg-night px-3 py-2 text-ink"
        />
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Emitiendo..." : "Emitir certificación"}
      </button>
    </form>
  );
}

export function CertificacionesManager({ barberias, sellos }: { barberias: Barberia[]; sellos: Sello[] }) {
  const router = useRouter();
  const [asignandoId, setAsignandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pausar(certificacionId: string) {
    const resultado = await pausarCertificacion(certificacionId);
    setError(resultado.error ?? null);
    if (!resultado.error) router.refresh();
  }

  async function revocar(certificacionId: string) {
    const resultado = await revocarCertificacion(certificacionId);
    setError(resultado.error ?? null);
    if (!resultado.error) router.refresh();
  }

  if (barberias.length === 0) {
    return (
      <p className="text-sm text-muted">
        No hay barberías aprobadas todavía. Apruébalas primero en{" "}
        <Link href="/admin/postulaciones" className="text-violet-neon underline">
          Postulaciones
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {error ? <p className="text-sm text-red-400">{error}</p> : null}
      {barberias.map((barberia) => {
        const activa = barberia.certificaciones.find((c) => c.estado === "activo") ?? null;
        return (
          <div key={barberia.id} className="flex flex-col gap-3 rounded border border-line bg-night p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{barberia.nombre}</p>
                <p className="text-xs uppercase tracking-wide text-muted">Sello actual: {barberia.estado_sello}</p>
              </div>
              <Link href={`/barberia/${barberia.slug}`} target="_blank" className="text-sm text-violet-neon underline">
                Ver perfil
              </Link>
            </div>

            {activa ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-carbon p-3 text-sm">
                <div>
                  <p className="text-ink">
                    Folio <span className="font-mono">{activa.folio_verificacion}</span>
                  </p>
                  <p className="text-muted">
                    Emitido el {FORMATTER_FECHA.format(new Date(activa.fecha_emision))}
                    {activa.fecha_vencimiento
                      ? ` · vence ${FORMATTER_FECHA.format(new Date(activa.fecha_vencimiento))}`
                      : " · sin vencimiento"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => pausar(activa.id)} className="text-violet-neon underline">
                    Pausar
                  </button>
                  <button type="button" onClick={() => revocar(activa.id)} className="text-red-400 underline">
                    Revocar
                  </button>
                </div>
              </div>
            ) : asignandoId === barberia.id ? (
              <FormularioAsignar
                barberiaId={barberia.id}
                sellos={sellos}
                onListo={() => {
                  setAsignandoId(null);
                  router.refresh();
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAsignandoId(barberia.id)}
                className="w-fit rounded bg-violet px-4 py-2 text-sm font-medium text-white"
              >
                Asignar sello
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
