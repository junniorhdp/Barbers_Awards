"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  crearServicio,
  actualizarServicio,
  alternarActivoServicio,
  eliminarServicio,
  moverServicio,
  type FormState,
} from "@/app/dashboard/actions";
import { SERVICIO_ICONOS_SUGERIDOS } from "@/lib/validators";

const estadoInicial: FormState = {};

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number | null;
  icono: string;
  destacado: boolean;
  es_activo: boolean;
  orden: number;
};

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function FormularioServicio({
  servicio,
  onGuardado,
}: {
  servicio?: Servicio;
  onGuardado: () => void;
}) {
  const accion = servicio ? actualizarServicio : crearServicio;
  const [state, formAction, pending] = useActionState(accion, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onGuardado();
      if (!servicio) formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-line bg-night p-4"
    >
      {servicio ? <input type="hidden" name="servicioId" value={servicio.id} /> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="nombre" className="text-sm text-muted">
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          defaultValue={servicio?.nombre ?? ""}
          required
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="descripcion" className="text-sm text-muted">
          Descripción corta
        </label>
        <input
          id="descripcion"
          name="descripcion"
          defaultValue={servicio?.descripcion ?? ""}
          maxLength={200}
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="precio" className="text-sm text-muted">
            Precio (COP)
          </label>
          <input
            id="precio"
            name="precio"
            type="number"
            min={0}
            step={100}
            defaultValue={servicio?.precio ?? ""}
            required
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="duracionMin" className="text-sm text-muted">
            Duración (min)
          </label>
          <input
            id="duracionMin"
            name="duracionMin"
            type="number"
            min={5}
            max={480}
            defaultValue={servicio?.duracion_min ?? ""}
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="icono" className="text-sm text-muted">
          Ícono
        </label>
        <input
          id="icono"
          name="icono"
          list="iconos-sugeridos"
          defaultValue={servicio?.icono ?? "tijeras"}
          required
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
        <datalist id="iconos-sugeridos">
          {SERVICIO_ICONOS_SUGERIDOS.map((icono) => (
            <option key={icono} value={icono} />
          ))}
        </datalist>
        <p className="text-xs text-muted">
          Sugeridos: {SERVICIO_ICONOS_SUGERIDOS.join(", ")}. También puedes escribir otra llave en
          minúsculas, números y guiones (2 a 30 caracteres); el selector visual del perfil público es de
          la Fase 4.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-ink">
        <input
          type="checkbox"
          name="destacado"
          defaultChecked={servicio?.destacado ?? false}
          className="accent-violet"
        />
        Destacado (cinta &quot;Popular&quot;)
      </label>

      {state.error ? <p className="text-sm text-red-400">{state.error}</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="w-fit rounded bg-violet px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {pending ? "Guardando..." : servicio ? "Guardar cambios" : "Agregar servicio"}
      </button>
    </form>
  );
}

export function ServiciosManager({ serviciosIniciales }: { serviciosIniciales: Servicio[] }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  async function mover(servicioId: string, direccion: "arriba" | "abajo") {
    await moverServicio(servicioId, direccion);
    router.refresh();
  }

  async function alternarActivo(servicio: Servicio) {
    await alternarActivoServicio(servicio.id, !servicio.es_activo);
    router.refresh();
  }

  async function confirmarEliminar(servicioId: string) {
    await eliminarServicio(servicioId);
    setConfirmandoId(null);
    router.refresh();
  }

  const ordenados = [...serviciosIniciales].sort((a, b) => a.orden - b.orden);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Agregar servicio</h2>
        <FormularioServicio onGuardado={() => router.refresh()} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Catálogo</h2>
        {ordenados.length === 0 ? (
          <p className="text-sm text-muted">Todavía no has agregado servicios.</p>
        ) : null}
        {ordenados.map((servicio, indice) => (
          <div key={servicio.id} className="flex flex-col gap-3 rounded border border-line bg-night p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-ink">
                  {servicio.nombre}{" "}
                  {servicio.destacado ? <span className="text-xs text-gold">· Popular</span> : null}
                  {!servicio.es_activo ? <span className="text-xs text-muted"> · Pausado</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {formatoCOP.format(servicio.precio)}
                  {servicio.duracion_min ? ` · ${servicio.duracion_min} min` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  disabled={indice === 0}
                  onClick={() => mover(servicio.id, "arriba")}
                  className="text-violet-neon disabled:opacity-30"
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={indice === ordenados.length - 1}
                  onClick={() => mover(servicio.id, "abajo")}
                  className="text-violet-neon disabled:opacity-30"
                  aria-label="Bajar"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => alternarActivo(servicio)}
                  className="text-violet-neon underline"
                >
                  {servicio.es_activo ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoId(editandoId === servicio.id ? null : servicio.id)}
                  className="text-violet-neon underline"
                >
                  {editandoId === servicio.id ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoId(servicio.id)}
                  className="text-red-400 underline"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {confirmandoId === servicio.id ? (
              <div className="flex items-center gap-3 rounded border border-red-400/40 bg-carbon p-3 text-sm">
                <span>¿Eliminar &quot;{servicio.nombre}&quot;? Esta acción no se puede deshacer.</span>
                <button
                  type="button"
                  onClick={() => confirmarEliminar(servicio.id)}
                  className="rounded bg-red-500 px-3 py-1 text-white"
                >
                  Sí, eliminar
                </button>
                <button type="button" onClick={() => setConfirmandoId(null)} className="text-muted">
                  Cancelar
                </button>
              </div>
            ) : null}

            {editandoId === servicio.id ? (
              <FormularioServicio servicio={servicio} onGuardado={() => router.refresh()} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
