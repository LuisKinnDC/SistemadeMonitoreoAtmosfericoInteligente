/** KpiPanel — Las 3 tarjetas de estado actual (Temp, Humedad, Gas MQ-135). */
import Sparkline from "./Sparkline.jsx";
import {
  fmt,
  delta,
  puntoRocio,
  adcAVoltaje,
  estadoAire,
} from "../lib/helpers.js";
import { useConfig } from "../context/ConfigContext.jsx";

function DeltaBadge({ valor, unidad, colorSube = "text-secondary", colorBaja = "text-tertiary" }) {
  const sube = valor >= 0;
  return (
    <span className={`inline-flex items-center font-code-sm text-code-sm ${sube ? colorSube : colorBaja}`}>
      <span className="material-symbols-outlined text-[14px]">{sube ? "arrow_drop_up" : "arrow_drop_down"}</span>
      {sube ? "+" : ""}
      {fmt(valor, unidad === "ADC" ? 0 : 1)}
      {unidad === "ADC" ? " ADC" : unidad}
    </span>
  );
}

export default function KpiPanel({ lecturas }) {
  const { umbrales, umbralBueno, umbralModerado } = useConfig();
  const temps = lecturas.map((l) => Number(l.temperatura));
  const hums = lecturas.map((l) => Number(l.humedad));
  const gases = lecturas.map((l) => Number(l.gas));

  const t = temps.length ? temps[temps.length - 1] : null;
  const h = hums.length ? hums[hums.length - 1] : null;
  const g = gases.length ? gases[gases.length - 1] : null;

  const tMin = temps.length ? Math.min(...temps) : null;
  const tMax = temps.length ? Math.max(...temps) : null;
  const rocio = puntoRocio(t, h);
  const aire = estadoAire(g, umbrales);
  const voltaje = adcAVoltaje(g);
  const pctGas = g != null ? (g / 4095) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
      {/* ---------- TARJETA TEMPERATURA ---------- */}
      <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between relative overflow-hidden transition-all group hover:bg-surface-container-high">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
            <span className="font-label-caps text-label-caps text-outline tracking-wider uppercase">
              TEMPERATURA AMBIENTE (DHT22)
            </span>
          </div>
          <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-primary">
            CANAL 01
          </span>
        </div>
        <div className="my-space-md flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-metric-display text-metric-display text-on-surface font-semibold tracking-tight">
                {fmt(t, 1)}
              </span>
              <span className="font-metric-lg text-metric-lg text-on-surface-variant">°C</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DeltaBadge valor={delta(temps)} unidad="°C" />
              <span className="font-code-sm text-code-sm text-outline">vs lectura previa</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-code-sm text-code-sm text-on-surface-variant">
              Rango: <span className="text-on-surface font-medium">10°C - 35°C</span>
            </div>
            <div className="font-code-sm text-code-sm text-outline flex items-center justify-end gap-1 mt-0.5">
              <span>Mín: <strong className="text-primary-fixed-dim">{fmt(tMin, 1)}°</strong></span>
              <span>|</span>
              <span>Máx: <strong className="text-tertiary">{fmt(tMax, 1)}°</strong></span>
            </div>
          </div>
        </div>
        <Sparkline valores={temps} colorClase="text-primary" />
      </div>

      {/* ---------- TARJETA HUMEDAD ---------- */}
      <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between relative overflow-hidden transition-all group hover:bg-surface-container-high">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <span className="font-label-caps text-label-caps text-outline tracking-wider uppercase">
              HUMEDAD RELATIVA AMBIENTAL
            </span>
          </div>
          <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary">
            CANAL 02
          </span>
        </div>
        <div className="my-space-md flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-metric-display text-metric-display text-on-surface font-semibold tracking-tight">
                {fmt(h, 1)}
              </span>
              <span className="font-metric-lg text-metric-lg text-on-surface-variant">%</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DeltaBadge valor={delta(hums)} unidad="%" colorSube="text-primary-fixed-dim" colorBaja="text-tertiary" />
              <span className="font-code-sm text-code-sm text-outline">vs lectura previa</span>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-secondary/10 font-code-sm text-code-sm text-secondary">
              {h >= 30 && h <= 70 ? "Confort Urbano Óptimo" : "Fuera de confort"}
            </span>
            <div className="font-code-sm text-code-sm text-outline mt-1.5">
              Punto de Rocío: <strong className="text-on-surface">{fmt(rocio, 1)}°C</strong>
            </div>
          </div>
        </div>
        <Sparkline valores={hums} colorClase="text-secondary" />
      </div>

      {/* ---------- TARJETA GAS MQ-135 ---------- */}
      <div className="bg-surface-container rounded-xl p-space-md flex flex-col justify-between relative overflow-hidden transition-all group hover:bg-surface-container-high md:col-span-2 xl:col-span-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary" />
            <span className="font-label-caps text-label-caps text-outline tracking-wider uppercase">
              CALIDAD DEL AIRE (MQ-135 ADC RAW)
            </span>
          </div>
          <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-tertiary">
            CANAL 03
          </span>
        </div>
        <div className="my-space-md flex items-baseline justify-between">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-metric-display text-metric-display text-on-surface font-semibold tracking-tight">
                {g != null ? Math.round(g) : "—"}
              </span>
              <span className="font-metric-lg text-metric-lg text-on-surface-variant">ADC</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <DeltaBadge valor={delta(gases)} unidad="ADC" colorSube="text-tertiary" colorBaja="text-secondary" />
              <span className="font-code-sm text-code-sm text-outline">Escala 12-bit (0-4095)</span>
            </div>
          </div>
          <div className="text-right">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded font-code-sm text-code-sm font-semibold ${aire.bg} ${aire.clase}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${aire.nivel === "bueno" ? "bg-secondary" : aire.nivel === "moderado" ? "bg-tertiary" : "bg-error"}`} />
              {aire.label}
            </span>
            <div className="font-code-sm text-code-sm text-on-surface-variant mt-1.5">
              Voltaje Pin A0: <strong className="text-on-surface font-mono">{fmt(voltaje, 2)} V</strong>
            </div>
          </div>
        </div>
        {/* Barra de umbrales */}
        <div className="space-y-1">
          <div className="flex justify-between font-code-sm text-code-sm text-outline">
            <span>Umbral: {g != null ? Math.round(g) : "—"}/4095 ADC</span>
            <span className="text-on-surface-variant">{fmt(pctGas, 1)}% Capacidad</span>
          </div>
          <div className="w-full h-2 bg-surface-container-highest rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all ${aire.nivel === "bueno" ? "bg-secondary" : aire.nivel === "moderado" ? "bg-tertiary" : "bg-error"}`}
              style={{ width: `${Math.min(100, pctGas)}%` }}
            />
          </div>
        </div>
        <div className="mt-space-sm p-2 rounded bg-surface-container-low text-body-sm font-code-sm text-on-surface-variant leading-tight flex items-start gap-1.5">
          <span className="material-symbols-outlined text-[16px] text-tertiary flex-shrink-0 mt-0.5">info</span>
          <span>
            <strong className="text-secondary">0-{umbralBueno} Óptima</strong> |{" "}
            <strong className="text-tertiary">{umbralBueno}-{umbralModerado} Moderada</strong> |{" "}
            <strong className="text-error">&gt;{umbralModerado} Crítica</strong> (CO, NH3, benceno)
          </span>
        </div>
      </div>
    </div>
  );
}
