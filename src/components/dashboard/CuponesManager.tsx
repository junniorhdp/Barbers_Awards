"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  crearCupon,
  actualizarCupon,
  alternarActivoCupon,
  eliminarCupon,
  type FormState,
} from "@/app/dashboard/actions";

const estadoInicial: FormState = {};

type Cupon = {
  id: string;
  codigo: string;
  descripcion: string | null;
  tipo_descuento: string;
  valor_descuento: number;
  fecha_fin: string | null;
  veces_redimido: number;
  limite_usos: number | null;
  es_activo: boolean;
};

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatoValor(cupon: Pick<Cupon, "tipo_descuento" | "valor_descuento">) {
  return cupon.tipo_descuento === "porcentaje"
    ? `${cupon.valor_descuento}%`
    : formatoCOP.format(cupon.valor_descuento);
}

// datetime-local exige "YYYY-MM-DDTHH:mm"; fecha_fin llega como ISO con zona.
function isoAFechaLocal(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 16);
}

function FormularioCupon({ cupon, onGuardado }: { cupon?: Cupon; onGuardado: () => void }) {
  const accion = cupon ? actualizarCupon : crearCupon;
  const [state, formAction, pending] = useActionState(accion, estadoInicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      onGuardado();
      if (!cupon) formRef.current?.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="flex flex-col gap-3 rounded border border-line bg-night p-4"
    >
      {cupon ? <input type="hidden" name="cuponId" value={cupon.id} /> : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="codigo" className="text-sm text-muted">
          Código
        </label>
        <input
          id="codigo"
          name="codigo"
          defaultValue={cupon?.codigo ?? ""}
          required
          className="rounded border border-line bg-carbon px-3 py-2 text-ink uppercase"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="descripcion" className="text-sm text-muted">
          Descripción corta
        </label>
        <input
          id="descripcion"
          name="descripcion"
          defaultValue={cupon?.descripcion ?? ""}
          maxLength={200}
          className="rounded border border-line bg-carbon px-3 py-2 text-ink"
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="tipoDescuento" className="text-sm text-muted">
            Tipo de descuento
          </label>
          <select
            id="tipoDescuento"
            name="tipoDescuento"
            defaultValue={cupon?.tipo_descuento ?? "porcentaje"}
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          >
            <option value="porcentaje">Porcentaje</option>
            <option value="monto_fijo">Monto fijo (COP)</option>
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="valorDescuento" className="text-sm text-muted">
            Valor
          </label>
          <input
            id="valorDescuento"
            name="valorDescuento"
            type="number"
            min={1}
            step={cupon?.tipo_descuento === "monto_fijo" ? 100 : 1}
            defaultValue={cupon?.valor_descuento ?? ""}
            required
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="fechaFin" className="text-sm text-muted">
            Vence el (opcional)
          </label>
          <input
            id="fechaFin"
            name="fechaFin"
            type="datetime-local"
            defaultValue={isoAFechaLocal(cupon?.fecha_fin ?? null)}
            className="rounded border border-line bg-carbon px-3 py-2 text-ink"
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="limiteUsos" className="text-sm text-muted">
            Límite de usos (opcional)
          </label>
          <input
            id="limiteUsos"
            name="limiteUsos"
            type="number"
            min={1}
            defaultValue={cupon?.limite_usos ?? ""}
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
        {pending ? "Guardando..." : cupon ? "Guardar cambios" : "Crear cupón"}
      </button>
    </form>
  );
}

export function CuponesManager({ cuponesIniciales }: { cuponesIniciales: Cupon[] }) {
  const router = useRouter();
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  async function alternarActivo(cupon: Cupon) {
    await alternarActivoCupon(cupon.id, !cupon.es_activo);
    router.refresh();
  }

  async function confirmarEliminar(cuponId: string) {
    await eliminarCupon(cuponId);
    setConfirmandoId(null);
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Crear cupón</h2>
        <FormularioCupon onGuardado={() => router.refresh()} />
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-gold">Cupones</h2>
        {cuponesIniciales.length === 0 ? (
          <p className="text-sm text-muted">Todavía no has creado cupones.</p>
        ) : null}
        {cuponesIniciales.map((cupon) => (
          <div key={cupon.id} className="flex flex-col gap-3 rounded border border-line bg-night p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-mono font-medium text-ink">
                  {cupon.codigo}{" "}
                  {!cupon.es_activo ? <span className="font-sans text-xs text-muted"> · Pausado</span> : null}
                </p>
                <p className="text-sm text-muted">
                  {formatoValor(cupon)} de descuento
                  {" · "}
                  {cupon.veces_redimido} usad{cupon.veces_redimido === 1 ? "o" : "os"}
                  {cupon.limite_usos ? ` de ${cupon.limite_usos}` : ""}
                  {cupon.fecha_fin ? ` · vence ${new Date(cupon.fecha_fin).toLocaleDateString("es-CO")}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => alternarActivo(cupon)}
                  className="text-violet-neon underline"
                >
                  {cupon.es_activo ? "Pausar" : "Activar"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditandoId(editandoId === cupon.id ? null : cupon.id)}
                  className="text-violet-neon underline"
                >
                  {editandoId === cupon.id ? "Cerrar" : "Editar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmandoId(cupon.id)}
                  className="text-red-400 underline"
                >
                  Eliminar
                </button>
              </div>
            </div>

            {confirmandoId === cupon.id ? (
              <div className="flex items-center gap-3 rounded border border-red-400/40 bg-carbon p-3 text-sm">
                <span>¿Eliminar &quot;{cupon.codigo}&quot;? Esta acción no se puede deshacer.</span>
                <button
                  type="button"
                  onClick={() => confirmarEliminar(cupon.id)}
                  className="rounded bg-red-500 px-3 py-1 text-white"
                >
                  Sí, eliminar
                </button>
                <button type="button" onClick={() => setConfirmandoId(null)} className="text-muted">
                  Cancelar
                </button>
              </div>
            ) : null}

            {editandoId === cupon.id ? (
              <FormularioCupon cupon={cupon} onGuardado={() => router.refresh()} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
