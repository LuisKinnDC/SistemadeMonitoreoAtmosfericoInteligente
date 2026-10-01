/** Header — Barra superior con estado de conexión y última lectura. */
import { haceSegundos } from "../lib/helpers.js";

export default function Header({ conexion, ultimaLectura, onExport, numExportables = 0, onAbrirMenu }) {
  const hayDatos = numExportables > 0;
  const online = conexion === "realtime" || conexion === "polling";
  const etiquetaConexion =
    conexion === "realtime" ? "Supabase Realtime" : conexion === "polling" ? "Sondeo cada 15s" : "Conectando…";

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface-container-lowest/95 backdrop-blur-md border-b border-outline-variant/40 z-40">
      <div className="h-16 w-full px-margin flex items-center justify-between gap-space-sm">
        <div className="flex items-center gap-space-sm min-w-0">
          {/* Botón menú (solo móvil/tablet) */}
          <button
            onClick={onAbrirMenu}
            className="lg:hidden p-1.5 -ml-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors flex-shrink-0"
            aria-label="Abrir menú"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">menu</span>
          </button>
          <div className="flex flex-col min-w-0">
            <span className="font-headline-md text-headline-md font-semibold text-on-surface tracking-tight truncate">
              Monitor de Telemetría ESP32
            </span>
            <span className="font-label-caps text-label-caps text-outline tracking-wider uppercase truncate">
              Sistema de Monitoreo Atmosférico Inteligente
            </span>
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-space-sm">
          <div className="flex items-center gap-2 px-space-sm py-1 rounded bg-surface-container-low border border-outline-variant/40">
            <span className="relative flex h-2 w-2">
              {online && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              )}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${online ? "bg-secondary" : "bg-outline"}`} />
            </span>
            <span className={`font-code-sm text-code-sm font-medium ${online ? "text-secondary" : "text-outline"}`}>
              {online ? "EN LÍNEA" : "DESCONECTADO"}
            </span>
            <span className="text-outline-variant">|</span>
            <span className="font-code-sm text-code-sm text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-primary">bolt</span>
              {etiquetaConexion}
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-surface-container-low border border-outline-variant/40">
            <span className="material-symbols-outlined text-[14px] text-outline">schedule</span>
            <span className="font-code-sm text-code-sm text-on-surface-variant">
              Última lectura: <span className="text-primary font-medium">{haceSegundos(ultimaLectura)}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={onExport}
            disabled={!hayDatos}
            title={hayDatos ? `Descargar ${numExportables} lecturas en CSV` : "Sin lecturas para exportar todavía"}
            className="flex items-center gap-1.5 px-space-sm py-1.5 rounded bg-surface-container-low border border-outline-variant/60 hover:bg-surface-container-high hover:text-on-surface text-on-surface-variant transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-surface-container-low"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">file_download</span>
            <span className="font-code-sm text-code-sm font-medium hidden sm:inline">
              Exportar CSV{hayDatos ? ` (${numExportables})` : ""}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
