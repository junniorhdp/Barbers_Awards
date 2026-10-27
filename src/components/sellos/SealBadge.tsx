import Link from "next/link";
import { oscurecer, colorTextoLegible } from "@/lib/color";
import { playfair } from "@/lib/fonts";
import { SelloMarca, type GlifoSello } from "./SelloMarca";

type Props =
  | { estado: "en-verificacion" }
  | { estado: "no-vigente" }
  | { estado: "sello"; nombreSello: string; folio: string; colorHex: string | null; vencido: boolean };

const COLOR_POR_DEFECTO = "#D4AF37"; // gold, si catalogo_sellos.color_hex es nulo (2.4)
const GRIS = "#A1A1AA"; // estados apagados: nunca usan el color del sello
const VIOLETA = "#A855F7"; // "En verificación", igual que en el directorio

// Tarjeta oscura con esquina de 2px y borde superior en el color del estado
// (DESIGN.md 6.1, 13.1): la píldora con degradado y sombra de color era el
// acabado que D2 quitó de los botones. Solo presentación: qué estado llega lo
// decide situacionSello() en quien llama.
const BASE = "inline-flex items-center gap-3 rounded-[2px] border border-white/10 border-t-2 bg-[#141416] px-4 py-3 text-left";

function Cuerpo({ titulo, contexto }: { titulo: string; contexto?: string }) {
  return (
    <span className="flex min-w-0 flex-col">
      <span className={`${playfair.className} text-lg font-bold leading-tight text-ink`}>{titulo}</span>
      {contexto ? <span className="text-[11px] text-muted">{contexto}</span> : null}
    </span>
  );
}

function MarcaApagada({ color, glifo }: { color: string; glifo: GlifoSello }) {
  return (
    <span className="flex h-11 w-11 shrink-0 items-center justify-center">
      <SelloMarca color={color} tamano={40} glifo={glifo} apagado />
    </span>
  );
}

// El color de acento de la barbería (2.6) nunca toca este badge: el color
// del sello es siempre el de catalogo_sellos, o el default, sin importar
// color_acento (regla de negocio de CU-03, DESIGN.md 2 regla 1).
export function SealBadge(props: Props) {
  if (props.estado === "en-verificacion") {
    return (
      <span className={BASE} style={{ borderTopColor: VIOLETA }}>
        <MarcaApagada color={VIOLETA} glifo="en-proceso" />
        <Cuerpo titulo="En verificación" />
      </span>
    );
  }

  // ARCHITECTURE.md, decisión 8: si la suscripción no está vigente, el
  // perfil sigue visible pero el sello de calidad deja de mostrarse como
  // Gold/Silver/En Verificación — sin relación con el estado real del
  // sello (CU-18), que el staff no toca por un pago vencido.
  if (props.estado === "no-vigente") {
    return (
      <span className={BASE} style={{ borderTopColor: GRIS }}>
        <MarcaApagada color={GRIS} glifo="pausado" />
        <Cuerpo titulo="Sello no vigente" contexto="Suscripción no vigente" />
      </span>
    );
  }

  if (props.vencido) {
    return (
      <Link href={`/verificar/${props.folio}`} className={BASE} style={{ borderTopColor: GRIS }}>
        <MarcaApagada color={GRIS} glifo="ninguno" />
        <Cuerpo titulo="Sello vencido" contexto={`${props.nombreSello} · Verificar folio →`} />
      </Link>
    );
  }

  // color_hex lo elige el staff y puede ser cualquier cosa: la marca va
  // sobre un bloque del color del sello y su trazo usa colorTextoLegible(),
  // así el glifo se lee aunque el color sea muy claro o muy oscuro.
  const color = props.colorHex ?? COLOR_POR_DEFECTO;
  return (
    <Link href={`/verificar/${props.folio}`} className={`seal-reveal ${BASE}`} style={{ borderTopColor: color }}>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px]"
        style={{ background: color, border: `1px solid ${oscurecer(color)}` }}
      >
        <SelloMarca color={colorTextoLegible(color)} tamano={36} glifo="vigente" />
      </span>
      <Cuerpo titulo={props.nombreSello} contexto="Verificar folio →" />
    </Link>
  );
}
