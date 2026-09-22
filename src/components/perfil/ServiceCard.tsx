import { ICONOS_SERVICIO, ICONO_SERVICIO_DEFECTO } from "@/lib/servicio-iconos";

const formatoCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

type Servicio = {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  duracion_min: number | null;
  icono: string;
  destacado: boolean;
};

export function ServiceCard({ servicio }: { servicio: Servicio }) {
  const Icono = ICONOS_SERVICIO[servicio.icono] ?? ICONO_SERVICIO_DEFECTO;

  return (
    <div className={`service-card reveal ${servicio.destacado ? "featured" : ""}`}>
      {servicio.destacado ? <div className="ribbon">Popular</div> : null}
      <div className="icon-wrap">
        <Icono size={26} />
      </div>
      <h3>{servicio.nombre}</h3>
      {servicio.descripcion ? <p>{servicio.descripcion}</p> : null}
      <div className="price">
        {formatoCOP.format(servicio.precio)}
        {servicio.duracion_min ? <span> / {servicio.duracion_min} min</span> : null}
      </div>
    </div>
  );
}
