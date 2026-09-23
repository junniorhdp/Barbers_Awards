"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { crearSello, actualizarSello, eliminarSello, type FormState } from "@/app/admin/(protected)/actions";
import { NIVELES_SELLO } from "@/lib/validators";

const estadoInicial: FormState = {};

type Sello = {
  id: string;
  nombre_sello: string;
  nivel: string;
  requisitos: string | null;
  entidad_emisora: string;
  color_hex: string | null;
};

function FormularioSello({ sello, onGuardado }: { sello?: Sello; onGuardado: () => void }) {
  const accion = sello ? actualizarSello : crearSello;
  const [state, formAction, pending] = useActionState(accion, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onGuardado();
      if (!sello) formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-line bg-night p-4"
    >
      {sello ? <input type="hidden" name="selloId" value={sello.id} /> : null}

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="nombreSello" className="text-sm text-muted">
            Nombre del sello
          </label>
          <input
            id="nombreSello"
            name="nombreSello"
            defaultValue={sello?.nombre_sello ?? ""}
            required
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="nivel" className="text-sm text-muted">
            Nivel
          </label>
          <select
            id="nivel"
            name="nivel"
            defaultValue={sello?.nivel ?? NIVELES_SELLO[0]}
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          >
            {NIVELES_SELLO.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="requisitos" className="text-sm text-muted">
          Requisitos del estándar (opcional)
        </label>
        <textarea
          id="requisitos"
          name="requisitos"
          defaultValue={sello?.requisitos ?? ""}
          rows={3}
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="entidadEmisora" className="text-sm text-muted">
            Entidad emisora
          </label>
          <input
            id="entidadEmisora"
            name="entidadEmisora"
            defaultValue={sello?.entidad_emisora ?? "Barbers Awards Official"}
            required
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="colorHex" className="text-sm text-muted">
            Color (hex, opcional)
          </label>
          <input
            id="colorHex"
            name="colorHex"
            placeholder="#D4AF37"
            defaultValue={sello?.color_hex ?? ""}
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
      </div>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando..." : sello ? "Guardar cambios" : "Crear sello"}
      </button>
    </form>
  );
}

export function SellosManager({ sellosIniciales }: { sellosIniciales: Sello[] }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  async function confirmarEliminar(selloId: string) {
    const resultado = await eliminarSello(selloId);
    if (resultado.error) {
      setErrorEliminar(resultado.error);
      return;
    }
    setConfirmandoId(null);
    setErrorEliminar(null);
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Crear sello</h2>
        <FormularioSello onGuardado={() => router.refresh()} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Catálogo</h2>
        {sellosIniciales.length === 0 ? (
          <p className="text-sm text-muted">Todavía no hay sellos en el catálogo.</p>
        ) : null}
        {sellosIniciales.map((sello) => (
          <div key={sello.id} className="flex flex-col gap-3 rounded border border-line bg-night p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {sello.color_hex ? (
                  <span
                    className="h-4 w-4 shrink-0 rounded-full border border-line"
                    style={{ background: sello.color_hex }}
                  />
                ) : null}
                <div>
                  <p className="font-medium text-ink">
                    {sello.nombre_sello} <span className="text-xs text-muted">· {sello.nivel}</span>
                  </p>
                  <p className="text-sm text-muted">{sello.entidad_emisora}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setEditandoId(editandoId === sello.id ? null : sello.id)}
                  className="text-violet-neon underline"
                >
                  {editandoId === sello.id ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmandoId(sello.id);
                    setErrorEliminar(null);
                  }}
                  className="text-red-400 underline"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {confirmandoId === sello.id ? (
              <div className="flex flex-col gap-2 rounded border border-red-400/40 bg-carbon p-3 text-sm">
                <div className="flex items-center gap-3">
                  <span>¿Eliminar &quot;{sello.nombre_sello}&quot;?</span>
                  <button
                    type="button"
                    onClick={() => confirmarEliminar(sello.id)}
                    className="rounded bg-red-500 px-3 py-1 text-white"
                  >
                    Sí, eliminar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmandoId(null);
                      setErrorEliminar(null);
                    }}
                    className="text-muted"
                  >
                    Cancelar
                  </button>
                </div>
                {errorEliminar ? <p className="text-red-400">{errorEliminar}</p> : null}
              </div>
            ) : null}

            {editandoId === sello.id ? (
              <FormularioSello sello={sello} onGuardado={() => router.refresh()} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
