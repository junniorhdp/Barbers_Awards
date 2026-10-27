import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { createClient } from "@/lib/supabase/public";
import { certificacionVencida } from "@/lib/certificaciones";
import { playfair } from "@/lib/fonts";
import { PlatformHeader } from "@/components/ui/PlatformHeader";
import { SelloMarca, type GlifoSello } from "@/components/sellos/SelloMarca";

// CU-04: sin caché — un sello revocado debe verse inactivo de inmediato, y el
// momento de la consulta que se muestra al pie es el de esta visita.
export const dynamic = "force-dynamic";

// Esta página verifica UN folio y dice la verdad sobre ESE folio (DESIGN.md
// 13.2). Nunca consulta estado_suscripcion (decisión 8: el pago no invalida
// la auditoría) ni el nivel de calidad de la barbería cuando el folio es de
// un reconocimiento.

const FORMATO_FOLIO = /^BA-\d{4}-[A-Z0-9]{4,8}$/;
const ZONA = "America/Bogota";
const FECHA = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: ZONA });
const HORA = new Intl.DateTimeFormat("es-CO", { timeStyle: "short", timeZone: ZONA });

// Colores fijos de la plataforma (DESIGN.md 1.1), nunca catalogo_sellos.color_hex.
const COLOR_NIVEL: Record<string, string> = { gold: "#D4AF37", silver: "#D4D4D8" };
const NEUTRO = "#FAFAFA";
const GRIS = "#A1A1AA";
const ROJO = "#F87171";
const VIOLETA = "#A855F7";

type Sello = { nombre_sello: string; nivel: string | null; entidad_emisora: string; requisitos: string | null };
type Barberia = { nombre: string; slug: string; zona: string | null; ciudad: string };
type Certificacion = {
  folio_verificacion: string;
  estado: string;
  categoria: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  sello: Sello | null;
  barberia: Barberia | null;
};

type Caso = "calidad" | "reconocimiento" | "vencida" | "revocada" | "pausada" | "no-existe";

// Compartida entre generateMetadata y la página: una sola consulta por visita.
const cargar = cache(async (folioParam: string): Promise<{ folio: string; cert: Certificacion | null }> => {
  const folio = decodeURIComponent(folioParam).trim().toUpperCase();
  if (!FORMATO_FOLIO.test(folio)) return { folio, cert: null };

  const supabase = createClient();
  const { data } = await supabase
    .from("certificaciones")
    .select(
      `
      folio_verificacion, estado, categoria, fecha_emision, fecha_vencimiento,
      catalogo_sellos ( nombre_sello, nivel, entidad_emisora, requisitos ),
      barberias ( nombre, slug, zona, ciudad )
    `,
    )
    .eq("folio_verificacion", folio)
    .maybeSingle();
  if (!data) return { folio, cert: null };

  return {
    folio,
    cert: {
      folio_verificacion: data.folio_verificacion,
      estado: data.estado,
      categoria: data.categoria,
      fecha_emision: data.fecha_emision,
      fecha_vencimiento: data.fecha_vencimiento,
      sello: data.catalogo_sellos as unknown as Sello | null,
      // Puede venir null si la barbería ya no es pública (RLS).
      barberia: data.barberias as unknown as Barberia | null,
    },
  };
});

// El desenlace se decide una sola vez y solo con la certificación consultada.
// 'pendiente' es siempre una pausa: la aplicación emite en 'activo'.
function determinarCaso(cert: Certificacion | null): Caso {
  if (!cert) return "no-existe";
  if (certificacionVencida(cert)) return "vencida";
  if (cert.estado === "revocado") return "revocada";
  if (cert.estado === "pendiente") return "pausada";
  return cert.categoria === "calidad" ? "calidad" : "reconocimiento";
}

const VEREDICTO: Record<Caso, string> = {
  calidad: "Certificación vigente",
  reconocimiento: "Reconocimiento vigente",
  vencida: "Vencida",
  revocada: "Revocada",
  pausada: "Pausada",
  "no-existe": "Sin coincidencias",
};

export async function generateMetadata({ params }: { params: Promise<{ folio: string }> }): Promise<Metadata> {
  const { folio: folioParam } = await params;
  const { folio, cert } = await cargar(folioParam);
  const caso = determinarCaso(cert);
  const titulo =
    caso === "no-existe" ? "Folio no encontrado · Barbers Awards" : `Folio ${folio} · ${VEREDICTO[caso]} · Barbers Awards`;
  // Cualquier cadena genera una página: ninguna se indexa.
  return { title: titulo, robots: { index: false, follow: false } };
}

// Fuera del render a propósito: el momento de la consulta es un dato de esta
// visita, no algo que deba recalcularse en cada render.
function momentoDeLaConsulta(): string {
  const ahora = new Date();
  return `Verificado el ${FECHA.format(ahora)} a las ${HORA.format(ahora)}.`;
}

export default async function VerificarFolioPage({ params }: { params: Promise<{ folio: string }> }) {
  const { folio: folioParam } = await params;
  const { folio, cert } = await cargar(folioParam);
  const caso = determinarCaso(cert);
  const consultado = momentoDeLaConsulta();

  return (
    <>
      <PlatformHeader />
      <main className="mx-auto flex w-full max-w-[680px] flex-col items-center gap-8 px-4 py-12 sm:py-16">
        {cert && (caso === "calidad" || caso === "reconocimiento") ? (
          <Vigente cert={cert} caso={caso} />
        ) : (
          <Negativo cert={cert} caso={caso} folio={folio} />
        )}
        <p className="text-center text-xs text-muted">{consultado}</p>
      </main>
    </>
  );
}

function Pildora({ texto, color }: { texto: string; color: string }) {
  return (
    <span
      className="inline-flex rounded-full border px-4 py-1 text-sm font-semibold"
      style={{ borderColor: color, color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      {texto}
    </span>
  );
}

function Vigente({ cert, caso }: { cert: Certificacion; caso: "calidad" | "reconocimiento" }) {
  const esCalidad = caso === "calidad";
  const nivel = (cert.sello?.nivel ?? "").toLowerCase();
  const colorNivel = COLOR_NIVEL[nivel] ?? COLOR_NIVEL.gold;
  // Calidad: el nivel ("Gold"), igual que el directorio. Reconocimiento: su
  // nombre, y nada del nivel de calidad de la barbería (DESIGN.md 13.2).
  // Sin un nivel reconocible se muestra el nombre del sello, nunca un "Gold"
  // por defecto que esta página no acaba de verificar.
  const titulo = esCalidad
    ? nivel === "gold"
      ? "Gold"
      : nivel === "silver"
        ? "Silver"
        : (cert.sello?.nombre_sello ?? "Certificación")
    : (cert.sello?.nombre_sello ?? "Reconocimiento");
  const requisitos = cert.sello?.requisitos?.trim() || null;
  const entidad = cert.sello?.entidad_emisora ?? "Barbers Awards Official";
  const lugar = cert.barberia ? [cert.barberia.zona, cert.barberia.ciudad].filter(Boolean).join(" · ") : null;

  return (
    <>
      <span className="inline-flex rounded-full border border-emerald-400/60 bg-emerald-500/10 px-4 py-1 text-sm font-semibold text-emerald-100">
        {VEREDICTO[caso]}
      </span>

      {/* El diploma: un marco fino del color del nivel (neutro para un
          reconocimiento), la marca estampada con aire, y la entidad que firma. */}
      <section
        className="flex w-full flex-col items-center gap-6 rounded-[2px] border bg-night px-6 py-12 text-center sm:px-12"
        style={{ borderColor: esCalidad ? colorNivel : "rgba(250, 250, 250, .25)" }}
      >
        {esCalidad ? (
          <SelloMarca
            color={colorNivel}
            relleno={colorNivel}
            tamano={136}
            glifo="vigente"
            etiqueta={`Sello ${titulo} vigente`}
            dibujar
          />
        ) : (
          <SelloMarca color={NEUTRO} tamano={136} glifo="vigente" etiqueta="Reconocimiento vigente" dibujar />
        )}

        <div className="flex flex-col items-center gap-2">
          <p className={`${playfair.className} text-3xl font-bold leading-tight`} style={{ color: esCalidad ? colorNivel : NEUTRO }}>
            {titulo}
          </p>
          {/* Lo escribe quien audita en /admin/sellos. Entero o nada: vacío no
              se muestra ningún texto por defecto. */}
          {requisitos ? <p className="max-w-md whitespace-pre-line text-sm text-muted">{requisitos}</p> : null}
        </div>

        {cert.barberia ? (
          <div className="flex flex-col items-center gap-1">
            <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-muted">Otorgado a</p>
            <p className={`${playfair.className} text-4xl font-bold leading-tight text-ink sm:text-5xl`}>
              {cert.barberia.nombre}
            </p>
            {lugar ? <p className="text-sm text-muted">{lugar}</p> : null}
          </div>
        ) : null}

        <div className="flex w-full max-w-xs flex-col items-center gap-1 border-t border-line pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-[.25em] text-muted">Emitido por</p>
          <p className={`${playfair.className} text-xl font-semibold text-ink`}>{entidad}</p>
        </div>
      </section>

      {cert.barberia ? (
        <Link href={`/barberia/${cert.barberia.slug}`} className="rounded bg-violet px-6 py-3 font-medium text-white">
          Ver el perfil de la barbería
        </Link>
      ) : null}

      <dl className="w-full divide-y divide-line rounded-[2px] border border-line bg-night text-sm">
        <Fila etiqueta="Folio" valor={<span className="font-mono">{cert.folio_verificacion}</span>} />
        <Fila etiqueta="Entidad emisora" valor={entidad} />
        <Fila etiqueta="Fecha de emisión" valor={FECHA.format(new Date(cert.fecha_emision))} />
        <Fila
          etiqueta="Vigente hasta"
          valor={cert.fecha_vencimiento ? FECHA.format(new Date(cert.fecha_vencimiento)) : "Sin fecha de vencimiento"}
        />
      </dl>

      <aside className="w-full rounded-[2px] border-l-2 border-gold bg-gold/5 px-5 py-4 text-left text-sm leading-relaxed text-ink">
        <p className="mb-1 font-semibold">Qué acabas de verificar</p>
        {/* Distinta según el caso. No hay todavía un canal para reportar una
            barbería que no se parece a su sello (DESIGN.md 13.2): esa frase
            queda fuera hasta que exista, en vez de un "escríbenos" que no
            lleve a ninguna parte. */}
        {esCalidad ? (
          <div className="flex flex-col gap-2 text-muted">
            <p>
              Este folio corresponde a una auditoría que Barbers Awards hizo en persona, en el local de la barbería.
            </p>
            {cert.fecha_vencimiento ? (
              <p>
                La certificación vence el {FECHA.format(new Date(cert.fecha_vencimiento))}. Renovarla exige una nueva
                visita de auditoría: no basta con pagar.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-muted">
            <p>Es un reconocimiento adicional: acredita solo lo que nombra y no implica ningún nivel de calidad.</p>
            <p>También sale de una auditoría que Barbers Awards hizo en el local de la barbería.</p>
          </div>
        )}
      </aside>
    </>
  );
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-5 py-3">
      <dt className="text-muted">{etiqueta}</dt>
      <dd className="text-right text-ink">{valor}</dd>
    </div>
  );
}

const NEGATIVO: Record<
  Exclude<Caso, "calidad" | "reconocimiento">,
  { color: string; glifo: GlifoSello; titular: string }
> = {
  "no-existe": { color: GRIS, glifo: "ninguno", titular: "Este folio no existe" },
  revocada: { color: ROJO, glifo: "revocado", titular: "Esta certificación fue retirada" },
  vencida: { color: GRIS, glifo: "ninguno", titular: "Esta certificación venció" },
  pausada: { color: VIOLETA, glifo: "pausado", titular: "Esta certificación está suspendida temporalmente" },
};

function Negativo({ cert, caso, folio }: { cert: Certificacion | null; caso: Caso; folio: string }) {
  const clave = caso === "calidad" || caso === "reconocimiento" ? "no-existe" : caso;
  const { color, glifo, titular } = NEGATIVO[clave];
  const barberia = cert?.barberia ?? null;
  // De qué era el folio, sin afirmar nada sobre el estado actual de la barbería.
  const nombreSello = cert
    ? cert.categoria === "calidad"
      ? `Nivel ${(cert.sello?.nivel ?? "") || "de calidad"}`
      : (cert.sello?.nombre_sello ?? "Reconocimiento")
    : null;

  let explicacion: string;
  if (clave === "no-existe") {
    explicacion =
      "No encontramos ninguna certificación de Barbers Awards con este folio. Revisa que esté bien escrito: un folio tiene la forma BA-AAAA-XXXX. Si una barbería te mostró este código, no está certificada por nosotros.";
  } else if (clave === "revocada") {
    explicacion = `Barbers Awards retiró esta certificación${barberia ? ` a ${barberia.nombre}` : ""}. Este folio ya no la acredita.`;
  } else if (clave === "vencida") {
    explicacion = `${
      cert?.fecha_vencimiento ? `Estuvo vigente hasta el ${FECHA.format(new Date(cert.fecha_vencimiento))}. ` : ""
    }Para recuperarla, la barbería necesita una nueva visita de auditoría.`;
  } else {
    explicacion = "Barbers Awards suspendió esta certificación por ahora. Mientras dure la suspensión, este folio no acredita a la barbería.";
  }

  return (
    <section
      className="flex w-full flex-col gap-4 rounded-[2px] border border-line border-l-[3px] bg-night p-6 text-left sm:p-8"
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center gap-4">
        <SelloMarca color={color} tamano={64} glifo={glifo} apagado discontinuo={clave === "no-existe"} />
        <Pildora texto={VEREDICTO[clave]} color={color} />
      </div>

      <h1 className={`${playfair.className} text-3xl font-bold leading-tight text-ink`}>{titular}</h1>
      <p className="text-muted">{explicacion}</p>

      <dl className="flex flex-col gap-1 text-sm">
        <div className="flex gap-2">
          <dt className="text-muted">Folio consultado:</dt>
          <dd className="font-mono text-ink">{folio || "—"}</dd>
        </div>
        {nombreSello ? (
          <div className="flex gap-2">
            <dt className="text-muted">Certificación:</dt>
            <dd className="text-ink">{nombreSello}</dd>
          </div>
        ) : null}
      </dl>

      <div>
        {clave !== "no-existe" && barberia ? (
          <Link
            href={`/barberia/${barberia.slug}`}
            className="inline-flex rounded border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-gold"
          >
            Ver el perfil
          </Link>
        ) : (
          <Link
            href="/directorio"
            className="inline-flex rounded border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-gold"
          >
            Buscar en el directorio
          </Link>
        )}
      </div>
    </section>
  );
}
