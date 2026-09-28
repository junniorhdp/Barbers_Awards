"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { marcarConversionLead } from "@/app/dashboard/actions";

export type Lead = {
  id: string;
  nombre_cliente: string;
  telefono_cliente: string;
  creado_en: string;
  conversion_exitosa: boolean;
  cupon_id: string | null;
  servicios: { nombre: string } | null;
  barberos: { nombre: string } | null;
  cupones_descuento: { codigo: string; veces_redimido: number; limite_usos: number | null } | null;
};

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Bogota" });

const LIMITE_LEADS = 50;

// CU-14 / ARCHITECTURE.md 4.2.6: el código del cupón es público y
// compartido, así que redimir es encontrar el lead específico del cliente
// (por nombre o teléfono) entre sus reservas recientes, no buscar el código.
export function RedimirLeadManager({ leadsIniciales }: { leadsIniciales: Lead[] }) {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [deshaciendoId, setDeshaciendoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const leadsFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return leadsIniciales;
    return leadsIniciales.filter(
      (lead) =>
        lead.nombre_cliente.toLowerCase().includes(q) || lead.telefono_cliente.includes(busqueda.trim()),
    );
  }, [leadsIniciales, busqueda]);

  async function confirmar(leadId: string) {
    setProcesandoId(leadId);
    setError(null);
    const resultado = await marcarConversionLead(leadId, true);
    setProcesandoId(null);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    router.refresh();
  }

  async function confirmarDeshacer(leadId: string) {
    setProcesandoId(leadId);
    setError(null);
    const resultado = await marcarConversionLead(leadId, false);
    setProcesandoId(null);
    setDeshaciendoId(null);
    if (resultado.error) {
      setError(resultado.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <input
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o teléfono…"
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
      <p className="text-xs text-muted">
        Mostrando los últimos {LIMITE_LEADS} clics a WhatsApp. Si la reserva del cliente es más antigua, todavía
        no hay forma de buscarla más atrás.
      </p>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      {leadsFiltrados.length === 0 ? (
        <p className="text-sm text-muted">
          {busqueda ? "Ningún lead reciente coincide con esa búsqueda." : "Todavía no hay leads registrados."}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {leadsFiltrados.map((lead) => {
          const cupon = lead.cupones_descuento;
          const agotado = Boolean(cupon && cupon.limite_usos !== null && cupon.veces_redimido >= cupon.limite_usos);
          const procesando = procesandoId === lead.id;

          return (
            <div key={lead.id} className="flex flex-col gap-2 rounded border border-line bg-night p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">
                    {lead.nombre_cliente} <span className="text-sm text-muted">· {lead.telefono_cliente}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {lead.servicios?.nombre ?? "Servicio no indicado"}
                    {lead.barberos?.nombre ? ` · ${lead.barberos.nombre}` : ""}
                  </p>
                  <p className="text-xs text-muted">{FORMATTER_FECHA.format(new Date(lead.creado_en))}</p>
                </div>

                <div className="flex flex-col items-end gap-1 text-sm">
                  {!cupon ? (
                    <span className="text-xs text-muted">Sin cupón</span>
                  ) : lead.conversion_exitosa ? (
                    <>
                      <span className="font-mono text-xs text-gold">{cupon.codigo} · Redimido</span>
                      {deshaciendoId === lead.id ? null : (
                        <button
                          type="button"
                          onClick={() => setDeshaciendoId(lead.id)}
                          className="text-xs text-muted underline"
                        >
                          Deshacer
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-mono text-xs text-muted">
                        {cupon.codigo}
                        {agotado ? " · agotado" : ""}
                      </span>
                      <button
                        type="button"
                        onClick={() => confirmar(lead.id)}
                        disabled={procesando}
                        className="rounded bg-violet px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
                      >
                        {procesando ? "Confirmando..." : "Confirmar redención"}
                      </button>
                      {agotado ? (
                        <span className="text-xs text-red-400">Este cupón ya alcanzó su límite de usos.</span>
                      ) : null}
                    </>
                  )}
                </div>
              </div>

              {deshaciendoId === lead.id ? (
                <div className="flex items-center gap-3 rounded border border-red-400/40 bg-carbon p-3 text-sm">
                  <span>¿Deshacer la redención de &quot;{cupon?.codigo}&quot;? Resta un uso del cupón.</span>
                  <button
                    type="button"
                    onClick={() => confirmarDeshacer(lead.id)}
                    disabled={procesando}
                    className="rounded bg-red-500 px-3 py-1 text-white disabled:opacity-50"
                  >
                    {procesando ? "Deshaciendo..." : "Sí, deshacer"}
                  </button>
                  <button type="button" onClick={() => setDeshaciendoId(null)} className="text-muted">
                    Cancelar
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
