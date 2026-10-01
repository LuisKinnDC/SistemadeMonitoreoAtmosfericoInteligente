/** Vista: Topología de Nodos — diagrama del pipeline con estado en vivo. */
import { haceSegundos } from "../lib/helpers.js";

function Nodo({ icon, titulo, subtitulo, estado, color }) {
  return (
    <div className="flex-1 min-w-[150px] bg-surface-container rounded-xl p-space-md flex flex-col items-center text-center gap-2 relative">
      <div className={`p-3 rounded-full ${color}/15`}>
        <span className={`material-symbols-outlined text-[26px] ${color}`}>{icon}</span>
      </div>
      <span className="font-code-sm text-code-sm font-semibold text-on-surface">{titulo}</span>
      <span className="font-label-caps text-label-caps text-outline uppercase leading-tight">{subtitulo}</span>
      {estado && (
        <span className="inline-flex items-center gap-1 font-code-sm text-code-sm text-secondary mt-1">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
          {estado}
        </span>
      )}
    </div>
  );
}

function Flecha() {
  return (
    <div className="flex items-center justify-center text-outline px-1">
      <span className="material-symbols-outlined text-[22px] rotate-90 md:rotate-0">arrow_forward</span>
    </div>
  );
}

export default function TopologiaNodos({ conexion, ultimaLectura, totalMuestras, diasAgregados }) {
  const online = conexion === "realtime" || conexion === "polling";
  return (
    <div className="space-y-space-md">
      <div className="flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-primary text-[22px]">hub</span>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Topología de Nodos</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Flujo de datos de extremo a extremo del sistema de monitoreo
          </p>
        </div>
      </div>

      {/* Diagrama del pipeline */}
      <div className="bg-surface-container-low rounded-xl p-space-lg">
        <div className="flex flex-col md:flex-row items-stretch gap-1">
          <Nodo icon="sensors" titulo="ESP32-NODE-04" subtitulo="DHT22 + MQ-135" color="text-primary" estado={online ? "Emitiendo" : "Sin datos"} />
          <Flecha />
          <Nodo icon="cloud" titulo="Supabase" subtitulo="PostgreSQL + Realtime" color="text-secondary" estado="Activo" />
          <Flecha />
          <Nodo icon="cleaning_services" titulo="Ingesta Python" subtitulo="Limpieza → Parquet" color="text-tertiary" />
          <Flecha />
          <Nodo icon="analytics" titulo="PySpark" subtitulo="Agregados + Streaming" color="text-primary" />
          <Flecha />
          <Nodo icon="monitor" titulo="Dashboard React" subtitulo="Esta app" color="text-secondary" estado="En línea" />
        </div>
      </div>

      {/* Métricas de estado en vivo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
        <div className="bg-surface-container rounded-xl p-space-md">
          <span className="font-label-caps text-label-caps text-outline uppercase">Conexión</span>
          <div className={`font-metric-lg text-metric-lg mt-1 ${online ? "text-secondary" : "text-error"}`}>
            {conexion === "realtime" ? "Realtime" : conexion === "polling" ? "Sondeo" : "—"}
          </div>
        </div>
        <div className="bg-surface-container rounded-xl p-space-md">
          <span className="font-label-caps text-label-caps text-outline uppercase">Última lectura</span>
          <div className="font-metric-lg text-metric-lg text-on-surface mt-1">{haceSegundos(ultimaLectura)}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-space-md">
          <span className="font-label-caps text-label-caps text-outline uppercase">Muestras en buffer</span>
          <div className="font-metric-lg text-metric-lg text-primary mt-1">{totalMuestras}</div>
        </div>
        <div className="bg-surface-container rounded-xl p-space-md">
          <span className="font-label-caps text-label-caps text-outline uppercase">Días agregados</span>
          <div className="font-metric-lg text-metric-lg text-tertiary mt-1">{diasAgregados}</div>
        </div>
      </div>
    </div>
  );
}
