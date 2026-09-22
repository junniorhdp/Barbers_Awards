"use client";

import { useEffect } from "react";

// ARCHITECTURE.md 3.7: las animaciones "reveal" se activan solo después de
// hidratar (si no, un buscador o un usuario sin JS vería el contenido
// invisible) y se desactivan con prefers-reduced-motion.
export function RevealInitializer() {
  useEffect(() => {
    const prefiereMenosMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elementos = document.querySelectorAll<HTMLElement>(".perfil .reveal");

    if (prefiereMenosMovimiento) {
      elementos.forEach((el) => el.classList.add("in"));
      return;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("in");
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.15 },
    );
    elementos.forEach((el) => observador.observe(el));
    return () => observador.disconnect();
  }, []);

  return null;
}
