/** ContextBar — Identificador del nodo, estado de conexión y controles de stream. */
export default function ContextBar({ conexion, tasaPorMin, streamActivo, onToggleStream, onSync }) {
  const realtime = conexion === "realtime";
  return (
    <div className="w-full bg-surface-container-low rounded-xl p-space-md flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
      {/* Identificador y estado */}
      <div className="flex flex-wrap items-center gap-space-md">
        <div className="flex items-center gap-space-sm">
          <div className="p-2 rounded bg-surface-container flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">router</span>
          </div>
          <div>
            <span className="font-code-sm text-code-sm font-semibold text-on-surface">Nodo ESP32 (DHT22 + MQ-135)</span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Telemetría atmosférica en tiempo real
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-code-sm text-code-sm ${
              realtime ? "bg-secondary/10 text-secondary" : "bg-tertiary/10 text-tertiary"
            }`}
          >
            <span className={`w-2 h-2 rounded-full animate-pulse ${realtime ? "bg-secondary" : "bg-tertiary"}`} />
            {realtime ? "Supabase Realtime WSS: CONECTADO" : "Modo Sondeo (Realtime desactivado)"}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container font-code-sm text-code-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-primary">data_saver_on</span>
            Búfer: <strong className="text-on-surface font-medium">15s</strong>
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-surface-container font-code-sm text-code-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px] text-tertiary">speed</span>
            Tasa: <strong className="text-on-surface font-medium">{tasaPorMin} pkts/min</strong>
          </span>
        </div>
      </div>

      {/* Controles */}
      <div className="flex items-center gap-space-sm self-start xl:self-auto">
        <button
          onClick={onToggleStream}
          className={`flex items-center gap-2 px-3 py-1.5 rounded font-code-sm text-code-sm font-medium transition-all shadow-sm ${
            streamActivo
              ? "bg-primary-container hover:bg-primary text-on-primary"
              : "bg-surface-container-high text-on-surface"
          }`}
          type="button"
        >
          <span className="relative flex h-2 w-2">
            {streamActivo && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-fixed opacity-75" />
            )}
            <span className={`relative inline-flex rounded-full h-2 w-2 ${streamActivo ? "bg-secondary-fixed" : "bg-outline"}`} />
          </span>
          <span>{streamActivo ? "TRANSMISIÓN ACTIVA" : "TRANSMISIÓN PAUSADA"}</span>
        </button>
        <button
          onClick={onSync}
          className="p-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
          title="Forzar sincronización inmediata"
          type="button"
        >
          <span className="material-symbols-outlined text-[18px]">sync</span>
        </button>
      </div>
    </div>
  );
}
