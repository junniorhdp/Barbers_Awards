// Normalización de número y construcción de la URL wa.me (CU-06,
// ARCHITECTURE.md 4.2.2 y 4.2.3).
const CC = process.env.NEXT_PUBLIC_WHATSAPP_COUNTRY_CODE ?? "57";

export function normalizeWhatsappNumber(raw: string): string | null {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `${CC}${d}`; // celular local
  if (d.startsWith(CC) && d.length === CC.length + 10) return d; // ya trae el código
  return d.length >= 11 && d.length <= 15 ? d : null; // otro país
}

type Reserva = {
  telefono: string;
  barberia: string;
  servicio: string;
  barbero?: string | null;
  cupon?: string | null;
};

export function buildWhatsappUrl({ telefono, barberia, servicio, barbero, cupon }: Reserva) {
  const numero = normalizeWhatsappNumber(telefono);
  if (!numero) return null;

  const mensaje =
    `¡Hola ${barberia}! Vengo desde Barbers Awards. Quiero agendar el servicio: ${servicio}` +
    (barbero ? ` con el barbero: ${barbero}` : "") +
    "." +
    (cupon ? ` Mi código de descuento es: ${cupon}.` : "");

  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
