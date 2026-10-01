/** Vista: Registros de Transmisión — log en vivo de las lecturas crudas. */
import { useConfig } from "../context/ConfigContext.jsx";
import { estadoAire, adcAVoltaje } from "../lib/helpers.js";

export default function RegistrosTransmision({ mostradas }) {
  const { umbrales } = useConfig();
  // Más recientes primero
  const filas = [...mostradas].reverse();

  return (
    <div className="space-y-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[22px]">terminal</span>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-surface">Registros de Transmisión</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Flujo crudo de paquetes recibidos del ESP32 (más recientes primero)
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/10 font-code-sm text-code-sm text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping" />
          {filas.length} paquetes
        </span>
      </div>

      <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/30">
        <div className="max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[640px] text-left border-collapse font-code-sm text-code-sm">
            <thead className="sticky top-0 bg-surface-container-highest/90 backdrop-blur">
              <tr className="text-outline uppercase font-label-caps text-label-caps border-b border-outline-variant/30">
                <th className="py-2 px-space-md">#</th>
                <th className="py-2 px-space-md">Timestamp</th>
                <th className="py-2 px-space-md text-right">Temp (°C)</th>
                <th className="py-2 px-space-md text-right">Humedad (%)</th>
                <th className="py-2 px-space-md text-right">Gas (ADC)</th>
                <th className="py-2 px-space-md text-right">Voltaje</th>
                <th className="py-2 px-space-md">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/15">
              {filas.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-outline">Esperando paquetes del ESP32…</td>
                </tr>
              )}
              {filas.map((l) => {
                const aire = estadoAire(Number(l.gas), umbrales);
                return (
                  <tr key={l.id ?? l.created_at} className={`hover:bg-surface-container-high/40 ${aire.nivel === "malo" ? "bg-error-container/10" : ""}`}>
                    <td className="py-1.5 px-space-md text-outline">{l.id ?? "—"}</td>
                    <td className="py-1.5 px-space-md text-on-surface-variant">
                      {new Date(l.created_at).toLocaleString("es")}
                    </td>
                    <td className="py-1.5 px-space-md text-right text-primary">{Number(l.temperatura).toFixed(1)}</td>
                    <td className="py-1.5 px-space-md text-right text-secondary">{Number(l.humedad).toFixed(1)}</td>
                    <td className="py-1.5 px-space-md text-right text-tertiary font-semibold">{Math.round(l.gas)}</td>
                    <td className="py-1.5 px-space-md text-right text-on-surface-variant">{adcAVoltaje(l.gas).toFixed(2)} V</td>
                    <td className="py-1.5 px-space-md">
                      <span className={`inline-flex items-center gap-1 ${aire.clase}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${aire.nivel === "bueno" ? "bg-secondary" : aire.nivel === "moderado" ? "bg-tertiary" : "bg-error"}`} />
                        {aire.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
