"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";

type PlanTipo = "mensual" | "anual";

type Suscripcion = {
  estado_suscripcion: string;
  plan_tipo: string | null;
  fecha_vencimiento_suscripcion: string | null;
};

type WidgetCheckoutOptions = {
  currency: string;
  amountInCents: number;
  reference: string;
  publicKey: string;
  signature: { integrity: string };
  redirectUrl?: string;
};
type WidgetCheckoutInstance = { open: (callback: () => void) => void };
declare global {
  interface Window {
    WidgetCheckout?: new (options: WidgetCheckoutOptions) => WidgetCheckoutInstance;
  }
}

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" });

const CLAVE_SESSION_STORAGE = "ba_checkout_pendiente";
const INTERVALO_MS = 3000;
const INTENTOS_MAXIMOS = 20; // ~60s (ARCHITECTURE.md 4.1.1, paso 7)

// El WAF de Wompi (CloudFront) responde 403 a cualquier checkout cuyo
// redirect-url apunte a localhost. Sin túnel HTTPS se omite el parámetro
// (es opcional): el widget carga, pero no hay retorno automático para
// Nequi/PSE (ARCHITECTURE.md 4.1.6).
function redirectUrlPublica(): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) return undefined;
  try {
    const { hostname } = new URL(base);
    if (hostname === "localhost" || hostname === "127.0.0.1") return undefined;
  } catch {
    return undefined;
  }
  return `${base}/dashboard/checkout`;
}

function ESTADO_LABEL(s: string) {
  if (s === "activa") return "Activa";
  if (s === "prueba") return "En período de prueba";
  if (s === "vencida") return "Vencida";
  if (s === "cancelada") return "Cancelada";
  return s;
}

export function CheckoutManager({
  barberiaId,
  suscripcionInicial,
  precios,
}: {
  barberiaId: string;
  suscripcionInicial: Suscripcion;
  precios: Record<PlanTipo, number>;
}) {
  const [suscripcion, setSuscripcion] = useState(suscripcionInicial);
  const [plan, setPlan] = useState<PlanTipo>("mensual");
  const [estado, setEstado] = useState<"idle" | "abriendo" | "esperando" | "tiempo_agotado">("idle");
  const [error, setError] = useState<string | null>(null);
  const intentosRef = useRef(0);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function detenerSondeo() {
    if (intervaloRef.current) clearInterval(intervaloRef.current);
    intervaloRef.current = null;
  }

  function iniciarSondeo() {
    intentosRef.current = 0;
    setEstado("esperando");
    try {
      sessionStorage.setItem(CLAVE_SESSION_STORAGE, "1");
    } catch {
      // no persistir el sondeo entre recargas no es crítico, solo cómodo
    }

    const supabase = createClient();
    detenerSondeo();
    intervaloRef.current = setInterval(async () => {
      intentosRef.current += 1;
      const { data } = await supabase
        .from("barberias")
        .select("estado_suscripcion, plan_tipo, fecha_vencimiento_suscripcion")
        .eq("id", barberiaId)
        .maybeSingle();

      if (data && data.estado_suscripcion === "activa") {
        setSuscripcion(data);
        setEstado("idle");
        detenerSondeo();
        try {
          sessionStorage.removeItem(CLAVE_SESSION_STORAGE);
        } catch {
          // ver comentario de arriba
        }
        return;
      }

      if (intentosRef.current >= INTENTOS_MAXIMOS) {
        setEstado("tiempo_agotado");
        detenerSondeo();
      }
    }, INTERVALO_MS);
  }

  // Si volvemos de un redirect de Wompi (Nequi/PSE), retoma el sondeo en
  // vez de confiar en los parámetros de la URL (ARCHITECTURE.md 4.1.1).
  useEffect(() => {
    let habiaCheckoutPendiente = false;
    try {
      habiaCheckoutPendiente = sessionStorage.getItem(CLAVE_SESSION_STORAGE) === "1";
    } catch {
      // sin sessionStorage, simplemente no se retoma el sondeo automático
    }
    // Debe leerse después de montar (sessionStorage no existe en el
    // servidor): mismo patrón que ReservaContext, no es un efecto evitable.
    if (habiaCheckoutPendiente) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      iniciarSondeo();
    }
    return () => detenerSondeo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function activar() {
    setError(null);
    setEstado("abriendo");
    try {
      const res = await fetch("/api/wompi/signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo iniciar el pago.");

      if (!window.WidgetCheckout) {
        setError("El widget de pago todavía no cargó. Intenta de nuevo en unos segundos.");
        setEstado("idle");
        return;
      }

      const redirectUrl = redirectUrlPublica();
      const checkout = new window.WidgetCheckout({
        currency: "COP",
        amountInCents: data.amountInCents,
        reference: data.reference,
        publicKey: process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ?? "",
        signature: { integrity: data.signature },
        ...(redirectUrl ? { redirectUrl } : {}),
      });
      checkout.open(() => {
        // Solo experiencia de usuario: la verdad la fija el webhook.
        iniciarSondeo();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
      setEstado("idle");
    }
  }

  const vigente = suscripcion.estado_suscripcion === "activa" || suscripcion.estado_suscripcion === "prueba";

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <Script src="https://checkout.wompi.co/widget.js" strategy="afterInteractive" />

      <div className="rounded border border-line bg-night p-4">
        <p className="text-sm text-muted">Estado actual</p>
        <p className={`text-lg font-semibold ${vigente ? "text-gold" : "text-red-400"}`}>
          {ESTADO_LABEL(suscripcion.estado_suscripcion)}
        </p>
        {suscripcion.fecha_vencimiento_suscripcion ? (
          <p className="text-sm text-muted">
            {suscripcion.estado_suscripcion === "activa" ? "Vence" : "Venció"} el{" "}
            {FORMATTER_FECHA.format(new Date(suscripcion.fecha_vencimiento_suscripcion))}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex items-center gap-3 rounded border border-line bg-night p-4">
          <input type="radio" name="plan" checked={plan === "mensual"} onChange={() => setPlan("mensual")} />
          <span className="flex-1">
            <span className="block font-medium text-ink">Mensual</span>
            <span className="block text-sm text-muted">{formatoCOP.format(precios.mensual)} / mes</span>
          </span>
        </label>
        <label className="flex items-center gap-3 rounded border border-line bg-night p-4">
          <input type="radio" name="plan" checked={plan === "anual"} onChange={() => setPlan("anual")} />
          <span className="flex-1">
            <span className="block font-medium text-ink">Anual</span>
            <span className="block text-sm text-muted">
              {formatoCOP.format(precios.anual)} / año · equivale a 10 meses
            </span>
          </span>
        </label>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <button
        type="button"
        onClick={activar}
        disabled={estado === "abriendo" || estado === "esperando"}
        className="w-fit rounded bg-violet px-6 py-3 font-medium text-white disabled:opacity-50"
      >
        {estado === "abriendo" ? "Abriendo pago..." : "Activar Sello Verificado"}
      </button>

      {estado === "esperando" ? (
        <p className="text-sm text-muted">Confirmando tu pago con Wompi… esto puede tardar hasta un minuto.</p>
      ) : null}
      {estado === "tiempo_agotado" ? (
        <div className="flex flex-col gap-2 text-sm text-muted">
          <p>Todavía no vemos la confirmación. Si ya pagaste, puede tardar unos minutos más en procesarse.</p>
          <button type="button" onClick={iniciarSondeo} className="w-fit text-violet-neon underline">
            Verificar de nuevo
          </button>
        </div>
      ) : null}
    </div>
  );
}
