import Link from "next/link";
import type { ReactNode } from "react";
import { oscurecer, colorTextoLegible } from "@/lib/color";
import { playfair } from "@/lib/fonts";
import { SelloMarca, type GlifoSello } from "./SelloMarca";
import { ListaReconocimientos, type ReconocimientoVisible } from "./ListaReconocimientos";

type Comun = { reconocimientos?: ReconocimientoVisible[] };

type Props = Comun &
  (
    | { estado: "en-verificacion" }
    | { estado: "no-vigente" }
    | { estado: "sello"; nombreSello: string; folio: string; colorHex: string | null; vencido: boolean }
  );

const COLOR_POR_DEFECTO = "#D4AF37"; // gold, si catalogo_sellos.color_hex es nulo (2.4)
const GRIS = "#A1A1AA"; // estados apagados: nunca usan el color del sello
const VIOLETA = "#A855F7"; // "En verificación", igual que en el directorio

// Tarjeta oscura con esquina de 2px y borde superior en el color del estado
// (DESIGN.md 6.1, 13.1): la píldora con degradado y sombra de color era el
// acabado que D2 quitó de los botones. Solo presentación: qué estado llega lo
// decide situacionSello() en quien llama.
// Clases literales: Tailwind no genera clases armadas con variables.
const TARJETA = "rounded-[2px] border border-white/10 border-t-2 bg-[#141416] px-4 py-3 text-left";
const BASE = `inline-flex items-center gap-3 ${TARJETA}`;
// Con reconocimientos, el bloque del sello pasa a ser el encabezado de una
// tarjeta que los lista debajo. Ancho acotado para que la lista envuelva en
// vez de estirar la tarjeta sobre la foto.
const CON_LISTA = `flex w-full max-w-[340px] flex-col gap-3 ${TARJETA}`;
const ENCABEZADO = "flex items-center gap-3";

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

// Arma la tarjeta: sin reconocimientos, exactamente como antes (el bloque es
// la tarjeta entera); con ellos, el bloque es el encabezado y la lista va
// debajo, dentro de la misma tarjeta. El enlace al folio queda solo en el
// encabezado: un enlace no puede contener los de la lista.
function Tarjeta({
  borde,
  href,
  destello = false,
  reconocimientos,
  children,
}: {
  borde: string;
  href?: string;
  destello?: boolean;
  reconocimientos?: ReconocimientoVisible[];
  children: ReactNode;
}) {
  const conLista = reconocimientos && reconocimientos.length > 0;
  const claseDestello = destello ? "seal-reveal " : "";

  if (!conLista) {
    return href ? (
      <Link href={href} className={`${claseDestello}${BASE}`} style={{ borderTopColor: borde }}>
        {children}
      </Link>
    ) : (
      <span className={BASE} style={{ borderTopColor: borde }}>
        {children}
      </span>
    );
  }

  return (
    <div className={CON_LISTA} style={{ borderTopColor: borde }}>
      {href ? (
        <Link href={href} className={`${claseDestello}${ENCABEZADO}`}>
          {children}
        </Link>
      ) : (
        <span className={ENCABEZADO}>{children}</span>
      )}
      <div className="border-t border-white/10 pt-3">
        <ListaReconocimientos reconocimientos={reconocimientos} />
      </div>
    </div>
  );
}

// Reconocimientos sin nivel de calidad que mostrar: la misma tarjeta, con
// "Reconocimientos" como encabezado. Sin color de sello en el borde, porque
// no hay un nivel de calidad que lo respalde.
export function TarjetaReconocimientos({ reconocimientos }: { reconocimientos: ReconocimientoVisible[] }) {
  if (reconocimientos.length === 0) return null;
  return (
    <div className={CON_LISTA} style={{ borderTopColor: "rgba(255, 255, 255, .3)" }}>
      <span className={`${playfair.className} text-lg font-bold leading-tight text-ink`}>Reconocimientos</span>
      <ListaReconocimientos reconocimientos={reconocimientos} />
    </div>
  );
}

// El color de acento de la barbería (2.6) nunca toca este badge: el color
// del sello es siempre el de catalogo_sellos, o el default, sin importar
// color_acento (regla de negocio de CU-03, DESIGN.md 2 regla 1).
export function SealBadge(props: Props) {
  const { reconocimientos } = props;

  if (props.estado === "en-verificacion") {
    return (
      <Tarjeta borde={VIOLETA} reconocimientos={reconocimientos}>
        <MarcaApagada color={VIOLETA} glifo="en-proceso" />
        <Cuerpo titulo="En verificación" />
      </Tarjeta>
    );
  }

  // ARCHITECTURE.md, decisión 8: si la suscripción no está vigente, el
  // perfil sigue visible pero el sello de calidad deja de mostrarse como
  // Gold/Silver/En Verificación — sin relación con el estado real del
  // sello (CU-18), que el staff no toca por un pago vencido.
  if (props.estado === "no-vigente") {
    return (
      <Tarjeta borde={GRIS} reconocimientos={reconocimientos}>
        <MarcaApagada color={GRIS} glifo="pausado" />
        <Cuerpo titulo="Sello no vigente" contexto="Suscripción no vigente" />
      </Tarjeta>
    );
  }

  if (props.vencido) {
    return (
      <Tarjeta borde={GRIS} href={`/verificar/${props.folio}`} reconocimientos={reconocimientos}>
        <MarcaApagada color={GRIS} glifo="ninguno" />
        <Cuerpo titulo="Sello vencido" contexto={`${props.nombreSello} · Verificar folio →`} />
      </Tarjeta>
    );
  }

  // color_hex lo elige el staff y puede ser cualquier cosa: la marca va
  // sobre un bloque del color del sello y su trazo usa colorTextoLegible(),
  // así el glifo se lee aunque el color sea muy claro o muy oscuro.
  const color = props.colorHex ?? COLOR_POR_DEFECTO;
  return (
    <Tarjeta borde={color} href={`/verificar/${props.folio}`} destello reconocimientos={reconocimientos}>
      <span
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[2px]"
        style={{ background: color, border: `1px solid ${oscurecer(color)}` }}
      >
        <SelloMarca color={colorTextoLegible(color)} tamano={36} glifo="vigente" />
      </span>
      <Cuerpo titulo={props.nombreSello} contexto="Verificar folio →" />
    </Tarjeta>
  );
}
