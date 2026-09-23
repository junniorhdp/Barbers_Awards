"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildWhatsappUrl, normalizeWhatsappNumber } from "@/lib/whatsapp";
import { useReserva } from "./ReservaContext";

type Servicio = { id: string; nombre: string };
type Barbero = { id: string; nombre: string };

// Selector de reserva (CU-06). Un solo <dialog> montado una vez en la página
// y controlado por ReservaContext, para que el encabezado, el bloque de
// contacto y el botón flotante abran la misma instancia (ARCHITECTURE.md 2.4
// y 3.7).
export function WhatsAppBookingSheet({
  barberiaId,
  nombreBarberia,
  telefonoBarberia,
  servicios,
  barberos,
}: {
  barberiaId: string;
  nombreBarberia: string;
  telefonoBarberia: string;
  servicios: Servicio[];
  barberos: Barbero[];
}) {
  const { cupon, ultimoCupon, seleccionarCupon, abierto, cerrar } = useReserva();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [nombreCliente, setNombreCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [barberoId, setBarberoId] = useState("");
  const [avisoCupon, setAvisoCupon] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (abierto) dialog.showModal();
    else if (dialog.open) dialog.close();
  }, [abierto]);

  // Verifica cupon_ya_usado() ANTES de que el visitante confirme la reserva
  // (ARCHITECTURE.md 4.2.1, paso 3), no después de abrir WhatsApp. Limpiar el
  // aviso al cambiar cupón/teléfono es una reacción a un sistema externo (la
  // llamada RPC que sigue), no una derivación de render: mismo criterio que
  // OpenNowBadge para este lint.
  useEffect(() => {
    if (!cupon) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAvisoCupon(null);
      return;
    }
    const numero = normalizeWhatsappNumber(telefonoCliente);
    if (!numero) {
      setAvisoCupon(null);
      return;
    }
    const espera = setTimeout(async () => {
      const supabase = createClient();
      const { data: yaUsado } = await supabase.rpc("cupon_ya_usado", {
        p_telefono: numero,
        p_cupon_id: cupon.id,
      });
      if (yaUsado) {
        setAvisoCupon(`Ya usaste el cupón ${cupon.codigo} con este teléfono.`);
        seleccionarCupon(null);
      }
    }, 400);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telefonoCliente, cupon?.id]);

  function cerrarYLimpiar() {
    cerrar();
    setNombreCliente("");
    setTelefonoCliente("");
    setServicioId("");
    setBarberoId("");
    setError(null);
    setAvisoCupon(null);
  }

  function onReservar() {
    setError(null);

    if (!nombreCliente.trim()) return setError("Ingresa tu nombre.");
    if (!servicioId) return setError("Elige un servicio.");

    const servicio = servicios.find((s) => s.id === servicioId);
    const barbero = barberos.find((b) => b.id === barberoId) ?? null;

    const url = buildWhatsappUrl({
      telefono: telefonoBarberia,
      barberia: nombreBarberia,
      servicio: servicio?.nombre ?? "",
      barbero: barbero?.nombre,
      cupon: cupon?.codigo,
    });
    const numeroCliente = normalizeWhatsappNumber(telefonoCliente);
    if (!url || !numeroCliente) return setError("Ingresa un teléfono válido (10 dígitos o con código de país).");

    fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        barberia_id: barberiaId,
        nombre_cliente: nombreCliente.trim(),
        telefono_cliente: numeroCliente,
        servicio_id: servicioId,
        barbero_id: barberoId || null,
        cupon_id: cupon?.id ?? null,
      }),
      keepalive: true,
    }).catch(() => {});

    window.open(url, "_blank", "noopener");
    cerrarYLimpiar();
  }

  return (
    <dialog ref={dialogRef} onClose={cerrar} className="booking-modal">
      <div className="booking-header">
        <h3>Reservar por WhatsApp</h3>
        <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Cerrar">
          &times;
        </button>
      </div>
      <div className="booking-body">
        <div className="booking-field">
          <label htmlFor="reserva-nombre">Nombre</label>
          <input
            id="reserva-nombre"
            value={nombreCliente}
            onChange={(e) => setNombreCliente(e.target.value)}
            maxLength={120}
          />
        </div>
        <div className="booking-field">
          <label htmlFor="reserva-telefono">Teléfono</label>
          <input
            id="reserva-telefono"
            value={telefonoCliente}
            onChange={(e) => setTelefonoCliente(e.target.value)}
            inputMode="tel"
            placeholder="300 123 4567"
          />
          {avisoCupon ? <span className="booking-aviso">{avisoCupon}</span> : null}
        </div>
        <div className="booking-field">
          <label htmlFor="reserva-servicio">Servicio</label>
          <select id="reserva-servicio" value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
            <option value="">Elige un servicio</option>
            {servicios.map((servicio) => (
              <option key={servicio.id} value={servicio.id}>
                {servicio.nombre}
              </option>
            ))}
          </select>
        </div>
        {barberos.length > 0 ? (
          <div className="booking-field">
            <label htmlFor="reserva-barbero">Barbero de preferencia (opcional)</label>
            <select id="reserva-barbero" value={barberoId} onChange={(e) => setBarberoId(e.target.value)}>
              <option value="">Sin preferencia</option>
              {barberos.map((barbero) => (
                <option key={barbero.id} value={barbero.id}>
                  {barbero.nombre}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {cupon ? (
          <div className="coupon-chip">
            <span>{cupon.codigo}</span>
            <button type="button" onClick={() => seleccionarCupon(null)}>
              Quitar
            </button>
          </div>
        ) : ultimoCupon ? (
          <button
            type="button"
            className="btn btn-outline-dark"
            onClick={() => seleccionarCupon(ultimoCupon)}
          >
            Aplicar cupón {ultimoCupon.codigo}
          </button>
        ) : null}

        {error ? <p className="booking-aviso">{error}</p> : null}
      </div>
      <div className="booking-footer">
        <button type="button" className="btn btn-gold" onClick={onReservar}>
          Reservar por WhatsApp
        </button>
      </div>
    </dialog>
  );
}
