"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// CU-02 y ARCHITECTURE.md 3.5: filtros sincronizados con la URL
// (?q=&ciudad=&zona=&sello=) con ~300 ms de retraso al escribir.
export function DirectorioFiltros() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") ?? "");
  const [ciudad, setCiudad] = useState(searchParams.get("ciudad") ?? "");
  const [zona, setZona] = useState(searchParams.get("zona") ?? "");
  const [sello, setSello] = useState(searchParams.get("sello") ?? "");

  const esPrimerRender = useRef(true);

  useEffect(() => {
    if (esPrimerRender.current) {
      esPrimerRender.current = false;
      return;
    }
    const espera = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (ciudad) params.set("ciudad", ciudad);
      if (zona) params.set("zona", zona);
      if (sello) params.set("sello", sello);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }, 300);
    return () => clearTimeout(espera);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ciudad, zona, sello]);

  return (
    <div className="flex flex-wrap gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar por nombre o servicio…"
        className="min-w-[220px] flex-1 rounded border border-line bg-night px-3 py-2 text-ink"
      />
      <input
        value={ciudad}
        onChange={(e) => setCiudad(e.target.value)}
        placeholder="Ciudad"
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
      <input
        value={zona}
        onChange={(e) => setZona(e.target.value)}
        placeholder="Zona / barrio"
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      />
      <select
        value={sello}
        onChange={(e) => setSello(e.target.value)}
        className="rounded border border-line bg-night px-3 py-2 text-ink"
      >
        <option value="">Todos los sellos</option>
        <option value="gold">Gold</option>
        <option value="silver">Silver</option>
        <option value="pendiente">En verificación</option>
      </select>
    </div>
  );
}
