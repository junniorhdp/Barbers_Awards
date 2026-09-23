"use client";

import { useEffect, useState } from "react";
import { LogoMark } from "./LogoMark";
import { BotonReservar } from "./BotonReservar";
import type { LogoPreset } from "@/lib/logo-presets";

const ENLACES = [
  { href: "#inicio", label: "Inicio" },
  { href: "#nosotros", label: "Nosotros" },
  { href: "#servicios", label: "Servicios" },
  { href: "#equipo", label: "Equipo" },
  { href: "#galeria", label: "Galería" },
  { href: "#contacto", label: "Contacto" },
];

// JS de la plantilla (sombra al hacer scroll + menú móvil) convertido a
// client component, per ARCHITECTURE.md 3.7.
export function PerfilHeader({
  nombre,
  logoPreset,
  subtitulo,
  puedeReservar,
}: {
  nombre: string;
  logoPreset: LogoPreset;
  subtitulo: string;
  puedeReservar: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [menuAbierto, setMenuAbierto] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={scrolled ? "scrolled" : ""}>
      <div className="navbar">
        <div className="logo">
          <LogoMark preset={logoPreset} />
          <div className="logo-text">
            {nombre}
            <span>{subtitulo}</span>
          </div>
        </div>

        <ul className="nav-links">
          {ENLACES.map((enlace) => (
            <li key={enlace.href}>
              <a href={enlace.href}>{enlace.label}</a>
            </li>
          ))}
        </ul>

        <div className="nav-cta">
          {puedeReservar ? (
            <BotonReservar className="btn btn-gold">Reservar por WhatsApp</BotonReservar>
          ) : (
            <button type="button" className="btn btn-gold" disabled aria-disabled title="Sin WhatsApp configurado">
              Reservas por WhatsApp — no disponible
            </button>
          )}
          <button
            className="burger"
            aria-label="Abrir menú"
            onClick={() => setMenuAbierto((v) => !v)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      <div className={`mobile-menu ${menuAbierto ? "open" : ""}`}>
        {ENLACES.map((enlace) => (
          <a key={enlace.href} href={enlace.href} onClick={() => setMenuAbierto(false)}>
            {enlace.label}
          </a>
        ))}
      </div>
    </header>
  );
}
