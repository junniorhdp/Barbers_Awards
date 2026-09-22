import { agruparHorarios, type Horarios } from "@/lib/horarios";

export function HorarioList({ horarios }: { horarios: Horarios }) {
  const filas = agruparHorarios(horarios);

  return (
    <>
      {filas.map((fila) => (
        <div key={fila.etiqueta} className="schedule-row">
          <span>{fila.etiqueta}</span>
          <span>{fila.texto}</span>
        </div>
      ))}
    </>
  );
}
