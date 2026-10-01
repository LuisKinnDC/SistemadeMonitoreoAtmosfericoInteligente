/** Sparkline — Mini gráfico SVG para las tarjetas KPI. Autoescala. */
import { aPuntos, pathLinea, pathArea } from "../lib/helpers.js";

export default function Sparkline({ valores, colorClase = "text-primary" }) {
  const ancho = 200;
  const alto = 40;

  if (!valores || valores.length < 2) {
    return <div className="w-full h-12 pt-2" />;
  }

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = aPuntos(valores, {
    ancho,
    alto,
    min: min - rango * 0.15,
    max: max + rango * 0.15,
    padTop: 4,
    padBottom: 4,
  });
  const ultimo = puntos[puntos.length - 1];

  return (
    <div className="w-full h-12 pt-2">
      <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${ancho} ${alto}`}>
        <path className={`${colorClase} opacity-10`} d={pathArea(puntos, alto)} fill="currentColor" />
        <path className={colorClase} d={pathLinea(puntos)} fill="none" stroke="currentColor" strokeWidth="2" />
        <circle className={`${colorClase} animate-pulse`} cx={ultimo.x} cy={ultimo.y} r="3.5" fill="currentColor" />
      </svg>
    </div>
  );
}
