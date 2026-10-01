/** Vista: Alertas por Umbral — lecturas que superaron el umbral de gas. */
import { useConfig } from "../context/ConfigContext.jsx";
import { adcAVoltaje, haceSegundos } from "../lib/helpers.js";

export default function AlertasUmbral({ alertas, conteo, error }) {
  const { umbralModerado } = useConfig();

  return (
    <div className="space-y-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-error text-[22px]">warning</span>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Alertas por Umbral</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Lecturas con gas ≥ {umbralModerado} ADC en las últimas 24 h
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full font-code-sm text-code-sm font-semibold ${conteo > 0 ? "bg-error-container text-on-error-container" : "bg-secondary/15 text-secondary"}`}>
          <span className="material-symbols-outlined text-[16px]">{conteo > 0 ? "notification_important" : "check_circle"}</span>
          {conteo} alerta{conteo === 1 ? "" : "s"}
        </span>
      </div>

      {error && (
        <div className="p-space-md rounded-xl bg-error-container/20 border border-error/40 text-on-surface">
          <strong className="text-error">Error:</strong> {error}
        </div>
      )}

      {conteo === 0 && !error && (
        <div className="bg-surface-container rounded-xl p-space-xl text-center space-y-2">
          <span className="material-symbols-outlined text-secondary text-[32px]">check_circle</span>
          <h3 className="font-headline-md text-headline-md text-on-surface">Sin alertas</h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            No hay lecturas por encima del umbral en las últimas 24 horas. Aire dentro de rango.
          </p>
        </div>
      )}

      {conteo > 0 && (
        <div className="space-y-2">
          {alertas.map((a) => (
            <div
              key={a.id ?? a.created_at}
              className="bg-surface-container rounded-xl p-space-md border-l-4 border-l-error flex items-center justify-between gap-space-md"
            >
              <div className="flex items-center gap-space-md">
                <div className="p-2 rounded bg-error/10 text-error">
                  <span className="material-symbols-outlined text-[20px]">air</span>
                </div>
                <div>
                  <div className="font-code-sm text-code-sm text-on-surface font-semibold">
                    Gas {Math.round(a.gas)} ADC ({adcAVoltaje(a.gas).toFixed(2)} V)
                  </div>
                  <div className="font-code-sm text-code-sm text-on-surface-variant">
                    {new Date(a.created_at).toLocaleString("es")} · {haceSegundos(a.created_at)}
                  </div>
                </div>
              </div>
              <div className="text-right font-code-sm text-code-sm text-on-surface-variant">
                <div>Temp: <span className="text-primary">{Number(a.temperatura).toFixed(1)}°C</span></div>
                <div>Humedad: <span className="text-secondary">{Number(a.humedad).toFixed(1)}%</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
