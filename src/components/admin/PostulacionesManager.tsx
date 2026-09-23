"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { publicStorageUrl } from "@/lib/storage";
import { aprobarPostulacion, rechazarPostulacion, type FormState } from "@/app/admin/(protected)/actions";

const estadoInicial: FormState = {};

type Postulacion = {
  id: string;
  nombre: string;
  direccion: string | null;
  ciudad: string;
  zona: string | null;
  fotos: string[];
  created_at: string;
  estado_postulacion: string;
  motivo_rechazo: string | null;
};

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

function FormularioRechazo({ barberiaId, onListo }: { barberiaId: string; onListo: () => void }) {
  const [state, formAction, pending] = useActionState(rechazarPostulacion, estadoInicial);

  useEffect(() => {
    if (state.success) onListo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded border border-red-400/40 bg-carbon p-3">
      <input type="hidden" name="barberiaId" value={barberiaId} />
      <label htmlFor={`motivo-${barberiaId}`} className="text-sm text-muted">
        Motivo del rechazo (opcional, se le puede comunicar al dueño)
      </label>
      <input
        id={`motivo-${barberiaId}`}
        name="motivoRechazo"
        maxLength={300}
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-red-500 px-3 py-1 text-sm text-white disabled:opacity-50"
        >
          {pending ? "Rechazando..." : "Confirmar rechazo"}
        </button>
        <button type="button" onClick={onListo} className="text-sm text-muted">
          Cancelar
        </button>
      </div>
    </form>
  );
}

export function PostulacionesManager({ postulaciones }: { postulaciones: Postulacion[] }) {
  const router = useRouter();
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [errorAprobar, setErrorAprobar] = useState<string | null>(null);

  async function aprobar(barberiaId: string) {
    const resultado = await aprobarPostulacion(barberiaId);
    if (resultado.error) {
      setErrorAprobar(resultado.error);
      return;
    }
    setErrorAprobar(null);
    router.refresh();
  }

  if (postulaciones.length === 0) {
    return <p className="text-sm text-muted">No hay postulaciones en este filtro.</p>;
  }

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      {errorAprobar ? <p className="text-sm text-red-400">{errorAprobar}</p> : null}
      {postulaciones.map((barberia) => (
        <div key={barberia.id} className="flex flex-col gap-3 rounded border border-line bg-night p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-ink">{barberia.nombre}</p>
              <p className="text-sm text-muted">
                {barberia.direccion ? `${barberia.direccion} · ` : ""}
                {barberia.zona ? `${barberia.zona}, ` : ""}
                {barberia.ciudad}
              </p>
              <p className="text-xs text-muted">Registrada el {FORMATTER_FECHA.format(new Date(barberia.created_at))}</p>
              {barberia.estado_postulacion === "rechazada" && barberia.motivo_rechazo ? (
                <p className="mt-1 text-xs text-red-400">Motivo del rechazo: {barberia.motivo_rechazo}</p>
              ) : null}
            </div>
            {barberia.estado_postulacion === "pendiente" ? (
              <div className="flex shrink-0 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => aprobar(barberia.id)}
                  className="rounded bg-violet px-3 py-1 text-white"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  onClick={() => setRechazandoId(barberia.id)}
                  className="rounded border border-red-400 px-3 py-1 text-red-400"
                >
                  Rechazar
                </button>
              </div>
            ) : (
              <span className="shrink-0 text-xs uppercase tracking-wide text-muted">
                {barberia.estado_postulacion}
              </span>
            )}
          </div>

          {barberia.fotos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {barberia.fotos.map((foto) => (
                <div key={foto} className="relative h-20 w-28 shrink-0 overflow-hidden rounded border border-line">
                  <Image src={publicStorageUrl(foto)} alt="" fill sizes="112px" style={{ objectFit: "cover" }} />
                </div>
              ))}
            </div>
          ) : null}

          {rechazandoId === barberia.id ? (
            <FormularioRechazo barberiaId={barberia.id} onListo={() => {
              setRechazandoId(null);
              router.refresh();
            }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}
