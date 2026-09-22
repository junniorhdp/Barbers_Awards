import Link from "next/link";
import { createClient } from "@/lib/supabase/public";

// CU-04: sin caché — un sello revocado debe verse inactivo de inmediato.
export const dynamic = "force-dynamic";

const FORMATO_FOLIO = /^BA-\d{4}-[A-Z0-9]{4,8}$/;

const FORMATTER_FECHA = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeZone: "America/Bogota",
});

type EstadoBadge = "activo" | "pendiente" | "inactivo" | "vencido";

const ESTADO_LABEL: Record<EstadoBadge, string> = {
  activo: "Verificado / Activo",
  pendiente: "En proceso",
  inactivo: "Inactivo",
  vencido: "Vencido",
};

const ESTADO_CLASE: Record<EstadoBadge, string> = {
  activo: "border-gold text-gold",
  pendiente: "border-violet-neon text-violet-neon",
  inactivo: "border-muted text-muted",
  vencido: "border-muted text-muted",
};

export default async function VerificarFolioPage({
  params,
}: {
  params: Promise<{ folio: string }>;
}) {
  const { folio: folioParam } = await params;
  const folio = decodeURIComponent(folioParam).trim().toUpperCase();

  if (!FORMATO_FOLIO.test(folio)) {
    return <NoEncontrado folio={folio} />;
  }

  const supabase = createClient();
  const { data: certificacion } = await supabase
    .from("certificaciones")
    .select(
      `
      folio_verificacion, estado, fecha_emision, fecha_vencimiento,
      catalogo_sellos ( nombre_sello, nivel, entidad_emisora ),
      barberias ( nombre, slug )
    `,
    )
    .eq("folio_verificacion", folio)
    .maybeSingle();

  if (!certificacion) {
    return <NoEncontrado folio={folio} />;
  }

  const vencida = Boolean(
    certificacion.estado === "activo" &&
      certificacion.fecha_vencimiento &&
      new Date(certificacion.fecha_vencimiento) < new Date(),
  );

  const estado: EstadoBadge = vencida
    ? "vencido"
    : certificacion.estado === "revocado"
      ? "inactivo"
      : (certificacion.estado as EstadoBadge);

  const sello = certificacion.catalogo_sellos as unknown as {
    nombre_sello: string;
    nivel: string;
    entidad_emisora: string;
  } | null;
  const barberia = certificacion.barberias as unknown as { nombre: string; slug: string } | null;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-6 p-8 text-center">
      <span className={`rounded-full border px-4 py-1 text-sm font-semibold ${ESTADO_CLASE[estado]}`}>
        {ESTADO_LABEL[estado]}
      </span>

      <h1 className="text-2xl font-semibold text-ink">
        {sello?.nombre_sello ? `Sello Barbers Awards ${sello.nivel}` : "Certificación Barbers Awards"}
      </h1>

      {barberia ? (
        <p className="text-muted">
          Otorgado a{" "}
          <Link href={`/barberia/${barberia.slug}`} className="text-violet-neon underline">
            {barberia.nombre}
          </Link>
        </p>
      ) : null}

      <dl className="grid w-full grid-cols-2 gap-3 rounded border border-line bg-night p-6 text-left text-sm">
        <dt className="text-muted">Folio</dt>
        <dd className="text-ink">{certificacion.folio_verificacion}</dd>

        <dt className="text-muted">Entidad emisora</dt>
        <dd className="text-ink">{sello?.entidad_emisora ?? "Barbers Awards Official"}</dd>

        <dt className="text-muted">Fecha de emisión</dt>
        <dd className="text-ink">{FORMATTER_FECHA.format(new Date(certificacion.fecha_emision))}</dd>

        <dt className="text-muted">Vigencia</dt>
        <dd className="text-ink">
          {certificacion.fecha_vencimiento
            ? FORMATTER_FECHA.format(new Date(certificacion.fecha_vencimiento))
            : "Sin fecha de vencimiento"}
        </dd>
      </dl>
    </main>
  );
}

function NoEncontrado({ folio }: { folio: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold text-ink">Folio no encontrado</h1>
      <p className="text-muted">
        No encontramos ninguna certificación con el folio <span className="text-ink">{folio}</span>.
      </p>
      <Link href="/directorio" className="text-violet-neon underline">
        Ir al directorio
      </Link>
    </main>
  );
}
