/** Sidebar — Navegación lateral funcional (cambia la vista activa). */
const NAV_OBS = [
  { path: "live-telemetry", icon: "monitoring", label: "Telemetría en Vivo" },
  { path: "sensor-matrix", icon: "grid_view", label: "Matriz de Sensores" },
  { path: "node-topology", icon: "hub", label: "Topología de Nodos" },
  { path: "raw-stream-logs", icon: "terminal", label: "Registros de Transmisión" },
];
const NAV_DATA = [
  { path: "historical-analytics", icon: "timeline", label: "Analítica Histórica" },
  { path: "threshold-alerts", icon: "warning", label: "Alertas por Umbral", badgeKey: "alertas" },
  { path: "calibration-manager", icon: "tune", label: "Gestor de Calibración" },
];

function NavLink({ item, activo, onNavegar, badge }) {
  return (
    <button
      onClick={() => onNavegar(item.path)}
      aria-current={activo ? "page" : undefined}
      className={`w-full flex items-center gap-space-sm px-space-sm py-2 rounded transition-colors text-left ${
        activo
          ? "bg-surface-container-high text-primary border-l-2 border-primary font-medium"
          : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
      <span className="font-body-sm text-body-sm">{item.label}</span>
      {badge > 0 && (
        <span className="ml-auto font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-error-container text-on-error-container">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ vistaActiva, onNavegar, alertasConteo = 0, abierto = false, onCerrar }) {
  const badgeDe = (item) => (item.badgeKey === "alertas" ? alertasConteo : 0);
  return (
    <aside
      className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest z-50 flex flex-col border-r border-outline-variant/40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        abierto ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="h-16 px-space-md border-b border-outline-variant/40 flex items-center gap-space-sm">
        <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center flex-shrink-0">
          <span className="material-symbols-outlined text-on-primary-container text-[20px]">sensors</span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-label-caps text-label-caps text-primary tracking-widest uppercase truncate">
            MONITOREO ATMOSFÉRICO
          </span>
          <span className="font-code-sm text-code-sm text-on-surface-variant">ESP32 + Supabase</span>
        </div>
        {/* Cerrar (solo móvil) */}
        <button
          onClick={onCerrar}
          className="ml-auto lg:hidden p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          aria-label="Cerrar menú"
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>
      </div>

      <nav className="flex-1 px-space-xs py-space-md space-y-1 overflow-y-auto">
        <div className="px-space-sm py-space-xs font-label-caps text-label-caps text-outline uppercase tracking-wider">
          OBSERVABILIDAD
        </div>
        {NAV_OBS.map((it) => (
          <NavLink key={it.path} item={it} activo={vistaActiva === it.path} onNavegar={onNavegar} badge={badgeDe(it)} />
        ))}
        <div className="pt-space-md px-space-sm py-space-xs font-label-caps text-label-caps text-outline uppercase tracking-wider">
          ANÁLISIS Y DATOS
        </div>
        {NAV_DATA.map((it) => (
          <NavLink key={it.path} item={it} activo={vistaActiva === it.path} onNavegar={onNavegar} badge={badgeDe(it)} />
        ))}
      </nav>

      <div className="p-space-md border-t border-outline-variant/40 bg-surface-container-lowest font-code-sm text-code-sm text-outline text-center">
        Pipeline: ESP32 → Supabase → PySpark → React
      </div>
    </aside>
  );
}
