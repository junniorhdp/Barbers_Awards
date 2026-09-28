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
  categoria: string;
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

type Sello = { id: string; nombre_sello: string; nivel: string | null };

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

function FormularioAsignar({
  barberiaId,
  sellos,
  onListo,
  textoBoton,
  sinSellosTexto,
}: {
  barberiaId: string;
  sellos: Sello[];
  onListo: () => void;
  textoBoton: string;
  sinSellosTexto: string;
}) {
  const [state, formAction, pending] = useActionState(emitirCertificacion, estadoInicial);

  useEffect(() => {
    if (state.success) onListo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (sellos.length === 0) {
    return (
      <p className="text-sm text-muted">
        {sinSellosTexto}{" "}
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
        <label htmlFor={`sello-${barberiaId}-${sellos[0]?.id}`} className="text-sm text-muted">
          Sello
        </label>
        <select
          id={`sello-${barberiaId}-${sellos[0]?.id}`}
          name="selloId"
          required
          className="rounded border border-line bg-night px-3 py-2 text-ink"
        >
          {sellos.map((sello) => (
            <option key={sello.id} value={sello.id}>
              {sello.nombre_sello}
              {sello.nivel ? ` (${sello.nivel})` : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={`vence-${barberiaId}-${sellos[0]?.id}`} className="text-sm text-muted">
          Vigente hasta (opcional)
        </label>
        <input
          id={`vence-${barberiaId}-${sellos[0]?.id}`}
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
        {pending ? "Emitiendo..." : textoBoton}
      </button>
    </form>
  );
}

export function CertificacionesManager({
  barberias,
  sellosCalidad,
  sellosReconocimiento,
}: {
  barberias: Barberia[];
  sellosCalidad: Sello[];
  sellosReconocimiento: Sello[];
}) {
  const router = useRouter();
  const [asignandoCalidadId, setAsignandoCalidadId] = useState<string | null>(null);
  const [agregandoReconocimientoId, setAgregandoReconocimientoId] = useState<string | null>(null);
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
        const calidadActiva =
          barberia.certificaciones.find((c) => c.categoria === "calidad" && c.estado === "activo") ?? null;
        const reconocimientosActivos = barberia.certificaciones.filter(
          (c) => c.categoria === "reconocimiento" && c.estado === "activo",
        );

        return (
          <div key={barberia.id} className="flex flex-col gap-4 rounded border border-line bg-night p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">{barberia.nombre}</p>
                <p className="text-xs uppercase tracking-wide text-muted">Sello actual: {barberia.estado_sello}</p>
              </div>
              <Link href={`/barberia/${barberia.slug}`} target="_blank" className="text-sm text-violet-neon underline">
                Ver perfil
              </Link>
            </div>

            {/* --- Nivel de calidad: excluyente, un slot --- */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">Nivel de calidad</p>
              {calidadActiva ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-carbon p-3 text-sm">
                  <div>
                    <p className="text-ink">
                      Folio <span className="font-mono">{calidadActiva.folio_verificacion}</span>
                    </p>
                    <p className="text-muted">
                      Emitido el {FORMATTER_FECHA.format(new Date(calidadActiva.fecha_emision))}
                      {calidadActiva.fecha_vencimiento
                        ? ` · vence ${FORMATTER_FECHA.format(new Date(calidadActiva.fecha_vencimiento))}`
                        : " · sin vencimiento"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => pausar(calidadActiva.id)} className="text-violet-neon underline">
                      Pausar
                    </button>
                    <button type="button" onClick={() => revocar(calidadActiva.id)} className="text-red-400 underline">
                      Revocar
                    </button>
                  </div>
                </div>
              ) : asignandoCalidadId === barberia.id ? (
                <FormularioAsignar
                  barberiaId={barberia.id}
                  sellos={sellosCalidad}
                  textoBoton="Emitir certificación"
                  sinSellosTexto="No hay sellos de calidad en el catálogo todavía. Crea uno en"
                  onListo={() => {
                    setAsignandoCalidadId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAsignandoCalidadId(barberia.id)}
                  className="w-fit rounded bg-violet px-4 py-2 text-sm font-medium text-white"
                >
                  Asignar sello
                </button>
              )}
            </div>

            {/* --- Reconocimientos adicionales: se acumulan sin límite --- */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gold">Reconocimientos adicionales</p>
              {reconocimientosActivos.length === 0 ? (
                <p className="text-sm text-muted">Ninguno todavía.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {reconocimientosActivos.map((reco) => (
                    <div
                      key={reco.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded border border-line bg-carbon p-3 text-sm"
                    >
                      <div>
                        <p className="text-ink">
                          Folio <span className="font-mono">{reco.folio_verificacion}</span>
                        </p>
                        <p className="text-muted">
                          Emitido el {FORMATTER_FECHA.format(new Date(reco.fecha_emision))}
                          {reco.fecha_vencimiento
                            ? ` · vence ${FORMATTER_FECHA.format(new Date(reco.fecha_vencimiento))}`
                            : " · sin vencimiento"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => pausar(reco.id)} className="text-violet-neon underline">
                          Pausar
                        </button>
                        <button type="button" onClick={() => revocar(reco.id)} className="text-red-400 underline">
                          Revocar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {agregandoReconocimientoId === barberia.id ? (
                <FormularioAsignar
                  barberiaId={barberia.id}
                  sellos={sellosReconocimiento}
                  textoBoton="Agregar reconocimiento"
                  sinSellosTexto="No hay reconocimientos en el catálogo todavía. Crea uno en"
                  onListo={() => {
                    setAgregandoReconocimientoId(null);
                    router.refresh();
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setAgregandoReconocimientoId(barberia.id)}
                  className="w-fit rounded border border-violet-neon px-4 py-2 text-sm font-medium text-violet-neon"
                >
                  Agregar reconocimiento
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
