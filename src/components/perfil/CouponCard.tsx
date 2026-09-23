"use client";

import { useState } from "react";
import { useReserva } from "./ReservaContext";

type Cupon = {
  id: string;
  codigo: string;
  descripcion: string | null;
  tipo_descuento: string;
  valor_descuento: number;
  veces_redimido: number;
  limite_usos: number | null;
};

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

function formatoDescuento(cupon: Cupon) {
  return cupon.tipo_descuento === "porcentaje"
    ? `${cupon.valor_descuento}% de descuento`
    : `${formatoCOP.format(cupon.valor_descuento)} de descuento`;
}

// CU-05: copia el código al portapapeles y lo deja seleccionado en el
// contexto de reserva para que WhatsAppBookingSheet lo precargue (CU-06).
// Un cupón que ya alcanzó su limite_usos se muestra "Agotado" y no se puede
// seleccionar (ARCHITECTURE.md 3.7, cuponDisponible()).
export function CouponCard({ cupon }: { cupon: Cupon }) {
  const { cupon: seleccionado, seleccionarCupon } = useReserva();
  const [copiado, setCopiado] = useState(false);

  const agotado = cupon.limite_usos !== null && cupon.veces_redimido >= cupon.limite_usos;
  const estaSeleccionado = seleccionado?.id === cupon.id;

  async function copiar() {
    if (agotado) return;
    try {
      await navigator.clipboard.writeText(cupon.codigo);
    } catch {
      // El portapapeles puede fallar sin HTTPS o permisos; el cupón igual queda seleccionado.
    }
    seleccionarCupon({ id: cupon.id, codigo: cupon.codigo });
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className={`coupon-card reveal ${agotado ? "agotado" : ""}`}>
      <span className="coupon-code">{cupon.codigo}</span>
      <p>{formatoDescuento(cupon)}</p>
      {cupon.descripcion ? <p>{cupon.descripcion}</p> : null}
      {agotado ? (
        <span className="coupon-status">Agotado</span>
      ) : (
        <button type="button" className={`btn btn-outline-dark ${copiado ? "copiado" : ""}`} onClick={copiar}>
          {copiado ? "¡Copiado!" : estaSeleccionado ? "Cupón seleccionado" : "Copiar Cupón"}
        </button>
      )}
    </div>
  );
}
