/** Vista: Matriz de Sensores — detalle por canal/sensor con datos en vivo. */
import Sparkline from "../components/Sparkline.jsx";
import { useConfig } from "../context/ConfigContext.jsx";
import { fmt, delta, estadoAire, adcAVoltaje } from "../lib/helpers.js";

function TarjetaSensor({ titulo, modelo, canal, valor, unidad, deltaVal, serie, colorClase, extra, estado }) {
  return (
    <div className="bg-surface-container rounded-xl p-space-md flex flex-col gap-space-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${colorClase.replace("text-", "bg-")}`} />
          <div className="flex flex-col">
            <span className="font-code-sm text-code-sm font-semibold text-on-surface">{titulo}</span>
            <span className="font-label-caps text-label-caps text-outline uppercase">{modelo}</span>
          </div>
        </div>
        <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-surface-container-highest text-on-surface-variant">
          {canal}
        </span>
      </div>

      <div className="flex items-baseline gap-1">
        <span className="font-metric-display text-metric-display text-on-surface font-semibold">{valor}</span>
        <span className="font-metric-lg text-metric-lg text-on-surface-variant">{unidad}</span>
      </div>

      <Sparkline valores={serie} colorClase={colorClase} />

      <div className="grid grid-cols-2 gap-2 font-code-sm text-code-sm pt-2 border-t border-outline-variant/20">
        <div className="text-on-surface-variant">
          Δ última: <span className="text-on-surface">{deltaVal}</span>
        </div>
        <div className="text-right text-on-surface-variant">
          {extra}
        </div>
      </div>
      {estado && (
        <div className="mt-1">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-code-sm text-code-sm font-semibold ${estado.bg} ${estado.clase}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${estado.nivel === "bueno" ? "bg-secondary" : estado.nivel === "moderado" ? "bg-tertiary" : "bg-error"}`} />
            {estado.label}
          </span>
        </div>
      )}
    </div>
  );
}

export default function MatrizSensores({ mostradas }) {
  const { umbrales } = useConfig();
  const temps = mostradas.map((l) => Number(l.temperatura));
  const hums = mostradas.map((l) => Number(l.humedad));
  const gases = mostradas.map((l) => Number(l.gas));
  const n = mostradas.length;

  const t = temps.at(-1);
  const h = hums.at(-1);
  const g = gases.at(-1);
  const aire = estadoAire(g, umbrales);

  return (
    <div className="space-y-space-md">
      <div className="flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-primary text-[22px]">grid_view</span>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Matriz de Sensores</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Estado individual de cada canal del nodo ESP32-NODE-04 · {n} muestras en ventana
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
        <TarjetaSensor
          titulo="Temperatura"
          modelo="DHT22 · Digital 1-Wire"
          canal="CANAL 01"
          valor={fmt(t, 1)}
          unidad="°C"
          deltaVal={`${fmt(delta(temps), 1)} °C`}
          serie={temps}
          colorClase="text-primary"
          extra={<>Mín/Máx: {fmt(Math.min(...temps), 1)}° / {fmt(Math.max(...temps), 1)}°</>}
        />
        <TarjetaSensor
          titulo="Humedad Relativa"
          modelo="DHT22 · Digital 1-Wire"
          canal="CANAL 02"
          valor={fmt(h, 1)}
          unidad="%"
          deltaVal={`${fmt(delta(hums), 1)} %`}
          serie={hums}
          colorClase="text-secondary"
          extra={<>Mín/Máx: {fmt(Math.min(...hums), 0)}% / {fmt(Math.max(...hums), 0)}%</>}
        />
        <TarjetaSensor
          titulo="Calidad del Aire"
          modelo="MQ-135 · ADC 12-bit"
          canal="CANAL 03"
          valor={g != null ? Math.round(g) : "—"}
          unidad="ADC"
          deltaVal={`${fmt(delta(gases), 0)} ADC`}
          serie={gases}
          colorClase="text-tertiary"
          extra={<>Voltaje: {fmt(adcAVoltaje(g), 2)} V</>}
          estado={aire}
        />
      </div>

      {/* Info del nodo */}
      <div className="bg-surface-container rounded-xl p-space-md">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Ficha del nodo</span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md mt-space-sm font-code-sm text-code-sm">
          <div><span className="text-outline">Microcontrolador</span><br /><span className="text-on-surface">ESP32-WROOM-32D</span></div>
          <div><span className="text-outline">Sensores activos</span><br /><span className="text-on-surface">3 (2 físicos)</span></div>
          <div><span className="text-outline">Intervalo de envío</span><br /><span className="text-on-surface">15 s</span></div>
          <div><span className="text-outline">Transporte</span><br /><span className="text-on-surface">HTTP POST → Supabase</span></div>
        </div>
      </div>
    </div>
  );
}
