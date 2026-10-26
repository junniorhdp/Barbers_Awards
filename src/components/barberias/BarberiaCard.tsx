import Link from "next/link";
import Image from "next/image";
import { publicStorageUrl } from "@/lib/storage";
import { certificacionVencida } from "@/lib/certificaciones";

type CertificacionResumen = { estado: string; categoria: string; fecha_vencimiento: string | null };

type BarberiaResumen = {
  slug: string;
  nombre: string;
  ciudad: string;
  zona: string | null;
  fotos: string[];
  // SCHEMA.sql v1.8. Sin portada, la tarjeta usa la primera foto de la galería.
  foto_portada: string | null;
  estado_sello: string;
  // Obligatoria: sin ella la etiqueta no puede distinguir "En verificación"
  // de "Sin certificación". Si una consulta nueva olvida pedirla, el build
  // falla en vez de mostrar la etiqueta equivocada.
  certificaciones: CertificacionResumen[];
  // Opcional: no todas las consultas la traen todavía (solo el directorio).
  // Sin ella se asume vigente, para no cambiar el comportamiento donde no
  // se pidió (ARCHITECTURE.md, decisión 8).
  estado_suscripcion?: string;
  // Opcional: solo el directorio la calcula hoy (CU-18/CU-19). Indicador
  // discreto, sin listar cuáles ni competir con el badge de estado_sello.
  tieneReconocimientos?: boolean;
};

// El estado del sello se deriva de certificaciones, no de estado_sello: ese
// campo no se actualiza al vencer una certificación y vuelve a 'pendiente'
// tanto al pausar como al revocar (DESIGN.md 13.1). El caso por defecto es el
// más conservador: revocada, vencida o nunca auditada dice "Sin certificación".
function EstadoSelloTag({
  estadoSello,
  certificaciones,
  suscripcionVigente,
}: {
  estadoSello: string;
  certificaciones: CertificacionResumen[];
  suscripcionVigente: boolean;
}) {
  if (!suscripcionVigente) {
    return (
      <span className="rounded-full border border-muted px-2 py-0.5 text-xs font-medium text-muted">
        No vigente
      </span>
    );
  }
  const calidadVigente = certificaciones.some(
    (c) => c.categoria === "calidad" && c.estado === "activo" && !certificacionVencida(c.fecha_vencimiento),
  );
  if (calidadVigente && estadoSello === "gold") {
    return <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-medium text-gold">Sello Gold</span>;
  }
  if (calidadVigente && estadoSello === "silver") {
    return <span className="rounded-full bg-silver/15 px-2 py-0.5 text-xs font-medium text-silver">Sello Silver</span>;
  }
  if (certificaciones.some((c) => c.categoria === "calidad" && c.estado === "pendiente")) {
    return (
      <span className="rounded-full border border-violet-neon px-2 py-0.5 text-xs font-medium text-violet-neon">
        En verificación
      </span>
    );
  }
  return (
    <span className="rounded-full border border-line px-2 py-0.5 text-xs font-medium text-muted">
      Sin certificación
    </span>
  );
}

// ARCHITECTURE.md 2.4: fondo night, borde dorado, destello violeta al pasar
// el cursor.
export function BarberiaCard({ barberia }: { barberia: BarberiaResumen }) {
  const suscripcionVigente =
    barberia.estado_suscripcion === undefined ||
    barberia.estado_suscripcion === "activa" ||
    barberia.estado_suscripcion === "prueba";

  return (
    <Link
      href={`/barberia/${barberia.slug}`}
      className="group block overflow-hidden rounded-xl border border-gold/40 bg-night transition hover:border-gold hover:shadow-glow-violet"
    >
      <div className="relative aspect-video bg-carbon">
        {(barberia.foto_portada ?? barberia.fotos[0]) ? (
          <Image
            src={publicStorageUrl(barberia.foto_portada ?? barberia.fotos[0])}
            alt={barberia.nombre}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            style={{ objectFit: "cover" }}
          />
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-medium text-ink">{barberia.nombre}</p>
          <p className="text-sm text-muted">
            {barberia.zona ? `${barberia.zona}, ` : ""}
            {barberia.ciudad}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <EstadoSelloTag
            estadoSello={barberia.estado_sello}
            certificaciones={barberia.certificaciones}
            suscripcionVigente={suscripcionVigente}
          />
          {barberia.tieneReconocimientos ? (
            <span className="text-[11px] text-muted">+ reconocimientos</span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
