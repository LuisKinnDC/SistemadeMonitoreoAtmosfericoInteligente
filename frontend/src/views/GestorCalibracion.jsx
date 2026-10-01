/** Vista: Gestor de Calibración — ajusta umbrales y escala en runtime.
 *  Los cambios se guardan en localStorage y afectan a todo el dashboard. */
import { useConfig } from "../context/ConfigContext.jsx";
import { estadoAire } from "../lib/helpers.js";

function CampoNumero({ label, descripcion, valor, onChange, min, max, step = 1 }) {
  return (
    <div className="bg-surface-container rounded-xl p-space-md space-y-space-sm">
      <div>
        <label className="font-code-sm text-code-sm font-semibold text-on-surface">{label}</label>
        <p className="font-body-sm text-body-sm text-on-surface-variant">{descripcion}</p>
      </div>
      <div className="flex items-center gap-space-md">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-primary"
        />
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={valor}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 bg-surface-container-highest rounded px-2 py-1 font-code-sm text-code-sm text-on-surface text-right focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
    </div>
  );
}

export default function GestorCalibracion() {
  const { umbralBueno, umbralModerado, escalaGas, umbrales, actualizar, restablecer } = useConfig();
  const invalido = umbralBueno >= umbralModerado;

  // Vista previa del semáforo con valores de ejemplo
  const ejemplos = [
    Math.round(umbralBueno / 2),
    Math.round((umbralBueno + umbralModerado) / 2),
    Math.round(umbralModerado + 400),
  ];

  return (
    <div className="space-y-space-md max-w-3xl">
      <div className="flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-primary text-[22px]">tune</span>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Gestor de Calibración</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Ajusta los umbrales del semáforo MQ-135 y la escala del gráfico. Se guardan en este navegador.
          </p>
        </div>
      </div>

      <CampoNumero
        label="Umbral BUENO (verde)"
        descripcion="Por debajo de este valor ADC el aire se considera óptimo."
        valor={umbralBueno}
        onChange={(v) => actualizar({ umbralBueno: v })}
        min={100}
        max={4000}
        step={50}
      />
      <CampoNumero
        label="Umbral MODERADO (ámbar)"
        descripcion="Entre BUENO y este valor es moderado; por encima, crítico (alerta)."
        valor={umbralModerado}
        onChange={(v) => actualizar({ umbralModerado: v })}
        min={200}
        max={4095}
        step={50}
      />
      <CampoNumero
        label="Escala del gráfico (eje Y2 del gas)"
        descripcion="Valor ADC máximo que se dibuja en el gráfico en vivo."
        valor={escalaGas}
        onChange={(v) => actualizar({ escalaGas: v })}
        min={512}
        max={4095}
        step={64}
      />

      {invalido && (
        <div className="p-space-md rounded-xl bg-error-container/20 border border-error/40 text-on-surface font-code-sm text-code-sm">
          <strong className="text-error">Configuración inválida:</strong> el umbral BUENO debe ser menor que el MODERADO.
        </div>
      )}

      {/* Vista previa del semáforo */}
      <div className="bg-surface-container rounded-xl p-space-md">
        <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">Vista previa del semáforo</span>
        <div className="grid grid-cols-3 gap-space-md mt-space-sm">
          {ejemplos.map((g) => {
            const e = estadoAire(g, umbrales);
            return (
              <div key={g} className="text-center bg-surface-container-low rounded-lg p-space-md">
                <div className="font-metric-lg text-metric-lg text-on-surface">{g}</div>
                <div className="font-code-sm text-code-sm text-outline mb-2">ADC</div>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-code-sm text-code-sm font-semibold ${e.bg} ${e.clase}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${e.nivel === "bueno" ? "bg-secondary" : e.nivel === "moderado" ? "bg-tertiary" : "bg-error"}`} />
                  {e.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-space-sm">
        <button
          onClick={restablecer}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-code-sm text-code-sm transition-colors"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          Restablecer valores por defecto
        </button>
        <span className="font-code-sm text-code-sm text-secondary flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">check</span>
          Los cambios se aplican y guardan automáticamente
        </span>
      </div>

      <p className="font-body-sm text-body-sm text-outline">
        Nota: estos umbrales afectan la clasificación EN VIVO del dashboard. El estado histórico de la
        tabla de comparativas lo calcula PySpark con los umbrales de <code>Backend/config.py</code>;
        mantén ambos sincronizados si quieres coherencia total.
      </p>
    </div>
  );
}
