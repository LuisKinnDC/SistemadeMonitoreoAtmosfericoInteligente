/** LiveChart — Gráfico multivariable en vivo (SVG dinámico, ejes duales). */
import { aPuntos, pathLinea, pathArea, horaCorta, fmt } from "../lib/helpers.js";
import { TEMP_ESCALA, HUM_ESCALA, VENTANAS } from "../lib/config.js";
import { useConfig } from "../context/ConfigContext.jsx";

const ANCHO = 900;
const ALTO = 260;
const BASE = 240; // línea base (eje X)

// Colores exactos usados en el SVG del diseño original
const C_TEMP = "#0ea5e9";
const C_HUM = "#10b981";
const C_GAS = "#f59e0b";

function Serie({ valores, escala, color, gradId }) {
  if (valores.length < 2) return null;
  const puntos = aPuntos(valores, { ancho: ANCHO, alto: BASE, min: 0, max: escala, padTop: 10, padBottom: 0 });
  const ultimo = puntos[puntos.length - 1];
  return (
    <>
      <path d={pathArea(puntos, BASE)} fill={`url(#${gradId})`} />
      <path d={pathLinea(puntos)} fill="none" stroke={color} strokeWidth="2.2" />
      <circle className="animate-ping" cx={ultimo.x} cy={ultimo.y} r="4.5" fill={color} opacity="0.7" />
      <circle cx={ultimo.x} cy={ultimo.y} r="4" fill={color} />
    </>
  );
}

function CapaCheck({ id, color, label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-surface-container cursor-pointer select-none text-on-surface hover:bg-surface-container-high transition-colors">
      <input checked={checked} onChange={onChange} className="rounded focus:ring-0" type="checkbox" />
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-code-sm text-code-sm">{label}</span>
    </label>
  );
}

export default function LiveChart({ lecturas, capas, onToggleCapa, ventana, onVentana }) {
  const { escalaGas } = useConfig();
  const temps = lecturas.map((l) => Number(l.temperatura));
  const hums = lecturas.map((l) => Number(l.humedad));
  const gases = lecturas.map((l) => Number(l.gas));
  const ultima = lecturas[lecturas.length - 1];

  // Etiquetas del eje X (6 marcas repartidas en la ventana)
  const nEtiquetas = 6;
  const etiquetas = [];
  if (lecturas.length > 0) {
    for (let i = 0; i < nEtiquetas; i++) {
      const idx = Math.round((i / (nEtiquetas - 1)) * (lecturas.length - 1));
      etiquetas.push(horaCorta(lecturas[idx].created_at));
    }
  }

  return (
    <div className="w-full bg-surface-container rounded-xl p-space-md flex flex-col space-y-space-md">
      {/* Encabezado */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md pb-space-sm bg-surface-container-low/50 p-space-sm rounded-lg">
        <div className="flex flex-wrap items-center gap-space-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">show_chart</span>
            <h2 className="font-headline-md text-headline-md text-on-surface">Telemetría Multi-Variable en Vivo</h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-high font-code-sm text-code-sm text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
            EN VIVO
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="font-label-caps text-label-caps text-outline uppercase mr-1">Capas Activas:</span>
          <CapaCheck id="temp" color="#0ea5e9" label="Temp (°C)" checked={capas.temp} onChange={() => onToggleCapa("temp")} />
          <CapaCheck id="hum" color="#10b981" label="Humedad (%)" checked={capas.hum} onChange={() => onToggleCapa("hum")} />
          <CapaCheck id="gas" color="#f59e0b" label="MQ-135 (ADC)" checked={capas.gas} onChange={() => onToggleCapa("gas")} />
          <div className="flex items-center bg-surface-container-high rounded p-0.5 ml-2">
            {VENTANAS.map((v) => (
              <button
                key={v.clave}
                onClick={() => onVentana(v.clave)}
                className={`px-2.5 py-1 rounded font-code-sm text-code-sm transition-colors ${
                  ventana === v.clave
                    ? "bg-primary-container text-on-primary font-medium"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
                type="button"
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Canvas del gráfico */}
      <div className="relative w-full bg-surface-container-lowest rounded-lg p-space-md min-h-[360px] flex flex-col justify-between select-none overflow-hidden">
        <div className="relative w-full h-[280px]">
          {lecturas.length < 2 ? (
            <div className="w-full h-full flex items-center justify-center text-outline font-code-sm text-code-sm">
              Esperando lecturas del ESP32…
            </div>
          ) : (
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox={`0 0 ${ANCHO} ${ALTO}`}>
              <defs>
                <linearGradient id="gradTemp" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={C_TEMP} stopOpacity="0.22" />
                  <stop offset="100%" stopColor={C_TEMP} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradHum" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={C_HUM} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={C_HUM} stopOpacity="0" />
                </linearGradient>
                <linearGradient id="gradGas" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={C_GAS} stopOpacity="0.15" />
                  <stop offset="100%" stopColor={C_GAS} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Cuadrícula horizontal */}
              {[20, 75, 130, 185, 240].map((y) => (
                <line key={y} className="text-surface-variant/40" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1" x1="0" x2={ANCHO} y1={y} y2={y} />
              ))}
              {/* Cuadrícula vertical */}
              {[150, 375, 600, 825].map((x) => (
                <line key={x} className="text-surface-variant/30" stroke="currentColor" strokeDasharray="2 4" strokeWidth="1" x1={x} x2={x} y1="0" y2="240" />
              ))}

              {capas.hum && <Serie valores={hums} escala={HUM_ESCALA} color={C_HUM} gradId="gradHum" />}
              {capas.gas && <Serie valores={gases} escala={escalaGas} color={C_GAS} gradId="gradGas" />}
              {capas.temp && <Serie valores={temps} escala={TEMP_ESCALA} color={C_TEMP} gradId="gradTemp" />}
            </svg>
          )}

          {/* Tooltip con la última muestra */}
          {ultima && (
            <div className="absolute right-2 top-2 bg-surface-container-high/95 backdrop-blur-sm border border-outline-variant/60 rounded-lg p-2.5 shadow-xl pointer-events-none z-20 min-w-[210px]">
              <div className="flex items-center justify-between font-label-caps text-label-caps text-outline pb-1 mb-1 border-b border-outline-variant/40">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">schedule</span>
                  {horaCorta(ultima.created_at)}
                </span>
                <span className="text-secondary font-code-sm text-code-sm">ÚLTIMA</span>
              </div>
              <div className="space-y-1 font-code-sm text-code-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_TEMP }} /> Temp:
                  </span>
                  <span className="font-semibold text-primary">{fmt(ultima.temperatura, 1)} °C</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_HUM }} /> Humedad:
                  </span>
                  <span className="font-semibold text-secondary">{fmt(ultima.humedad, 1)} %</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: C_GAS }} /> Gas MQ-135:
                  </span>
                  <span className="font-semibold text-tertiary">{Math.round(ultima.gas)} ADC</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Eje X */}
        <div className="w-full flex justify-between font-code-sm text-code-sm text-outline pt-2 px-1">
          {etiquetas.map((e, i) => (
            <span key={i} className={i === etiquetas.length - 1 ? "text-secondary font-semibold" : ""}>
              {e}
              {i === etiquetas.length - 1 ? " (Ahora)" : ""}
            </span>
          ))}
        </div>

        {/* Leyenda de ejes */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 border-t border-outline-variant/30 font-code-sm text-code-sm text-on-surface-variant">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1">
              <span className="text-primary font-semibold">Eje Y1:</span> 0°C a {TEMP_ESCALA}°C / 0% a {HUM_ESCALA}% RH
            </span>
            <span className="text-outline">|</span>
            <span className="flex items-center gap-1">
              <span className="text-tertiary font-semibold">Eje Y2:</span> 0 a {escalaGas} ADC MQ-135
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
