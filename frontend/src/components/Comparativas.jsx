/** Comparativas — Análisis histórico (barras semanales, insights, tabla).
 *  Datos leídos de Supabase (agregados_diarios + metricas_globales),
 *  que PySpark rellena en la Capa 2 (opción B). */
import { fmt, adcAVoltaje } from "../lib/helpers.js";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function fechaCorta(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MESES[m - 1]}`;
}

function badgeEstado(estado) {
  const map = {
    Óptimo: "bg-secondary/15 text-secondary",
    Excelente: "bg-secondary/15 text-secondary",
    Moderado: "bg-tertiary/15 text-tertiary",
    Alerta: "bg-error-container text-on-error-container",
  };
  return map[estado] || "bg-surface-container text-on-surface-variant";
}

export default function Comparativas({ dias, metricas, error }) {
  // Estado vacío / sin tablas
  if (error || dias.length === 0) {
    return (
      <div className="w-full bg-surface-container rounded-xl p-space-xl text-center space-y-2">
        <span className="material-symbols-outlined text-tertiary text-[32px]">database</span>
        <h3 className="font-headline-md text-headline-md text-on-surface">Sin comparativas todavía</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl mx-auto">
          Ejecuta la Capa 2 en el backend para poblar las tablas de agregados:
          <br />
          <code className="text-primary">python -m procesamiento.analisis_spark</code>
          {error && (
            <>
              <br />
              <span className="text-error">Detalle: {error}</span>
              <br />
              (Si dice que la tabla no existe, corre primero <code>Backend/sql/esquema_supabase.sql</code>.)
            </>
          )}
        </p>
      </div>
    );
  }

  // Escalas para las barras
  const maxTemp = Math.max(...dias.map((d) => d.temp_max || 0), 1);
  const maxGas = Math.max(...dias.map((d) => d.gas_max || 0), 1);
  const diaPicoGas = dias.reduce((a, b) => ((b.gas_max || 0) > (a.gas_max || 0) ? b : a), dias[0]);
  const diaMaxTemp = dias.reduce((a, b) => ((b.temp_max || 0) > (a.temp_max || 0) ? b : a), dias[0]);
  const totalRegistros = dias.reduce((s, d) => s + (d.n_lecturas || 0), 0);
  const corr = metricas["temperatura_vs_humedad"] || metricas["temperatura_vs_gas"];

  // Solo mostramos los últimos 7 días en las barras (para no saturar)
  const semana = dias.slice(-7);

  return (
    <div className="w-full space-y-space-md">
      {/* Barra de filtros */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md bg-surface-container-low rounded-xl p-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[22px]">cloud_upload</span>
          <div>
            <h3 className="font-headline-md text-headline-md text-on-surface">Análisis Histórico Comparativo &amp; Big Data</h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Agregaciones calculadas con PySpark y persistidas en Supabase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-surface-container font-code-sm text-code-sm text-on-surface">
          <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
          <span>
            {dias.length} días:{" "}
            <strong className="text-primary-fixed-dim">
              {fechaCorta(dias[0].fecha)} – {fechaCorta(dias[dias.length - 1].fecha)}
            </strong>
          </span>
        </div>
      </div>

      {/* Grid: barras + insights */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-gutter">
        {/* Barras semanales */}
        <div className="xl:col-span-7 bg-surface-container rounded-xl p-space-md flex flex-col justify-between space-y-space-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">DISTRIBUCIÓN AGREGADA</span>
              <h4 className="font-headline-md text-headline-md text-on-surface">Comportamiento Térmico &amp; Picos de Gas MQ-135</h4>
            </div>
            <div className="flex items-center gap-3 font-code-sm text-code-sm">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary-container" /> Temp Prom</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-tertiary" /> Pico Gas</span>
            </div>
          </div>

          <div className="w-full grid gap-2 pt-4 items-end min-h-[220px]" style={{ gridTemplateColumns: `repeat(${semana.length}, minmax(0, 1fr))` }}>
            {semana.map((d) => {
              const esPicoGas = d.fecha === diaPicoGas.fecha;
              const esMaxTemp = d.fecha === diaMaxTemp.fecha;
              const hTemp = Math.round(((d.temp_prom || 0) / maxTemp) * 96);
              const hGas = Math.round(((d.gas_max || 0) / maxGas) * 96);
              const gasCritico = d.estado === "Alerta";
              return (
                <div key={d.fecha} className="flex flex-col items-center gap-2 group relative">
                  <span className={`font-code-sm text-code-sm ${gasCritico ? "text-error font-semibold" : "text-tertiary opacity-0 group-hover:opacity-100 transition-opacity"}`}>
                    {gasCritico ? `${Math.round(d.gas_max)} ⚠` : Math.round(d.gas_max)}
                  </span>
                  <div className={`w-full flex items-end justify-center gap-1 h-36 rounded p-1 ${esPicoGas ? "bg-surface-container-high border-t-2 border-tertiary" : "bg-surface-container-low"}`}>
                    <div
                      className={`w-1/2 rounded-t transition-all ${esMaxTemp ? "bg-primary" : "bg-primary-container group-hover:bg-primary"}`}
                      style={{ height: `${hTemp}%` }}
                      title={`Temp prom: ${fmt(d.temp_prom, 1)}°C`}
                    />
                    <div
                      className={`w-1/2 rounded-t transition-all ${gasCritico ? "bg-error" : "bg-tertiary/70 group-hover:bg-tertiary"}`}
                      style={{ height: `${hGas}%` }}
                      title={`MQ-135 máx: ${Math.round(d.gas_max)} ADC`}
                    />
                  </div>
                  <span className={`font-code-sm text-code-sm ${esPicoGas ? "text-tertiary font-semibold" : "text-outline"}`}>
                    {(d.dia_semana || "").slice(0, 3)} {d.fecha.split("-")[2]}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-outline-variant/30 font-code-sm text-code-sm text-outline">
            <span>* Agregados vía PySpark (Structured / batch)</span>
            <span className="text-primary">Registros en ventana: {totalRegistros.toLocaleString("es")}</span>
          </div>
        </div>

        {/* Insights */}
        <div className="xl:col-span-5 flex flex-col justify-between space-y-space-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="font-label-caps text-label-caps text-primary uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              INSIGHTS CALCULADOS CON PYSPARK
            </span>
          </div>

          {/* Insight pico gas */}
          <div className="bg-surface-container rounded-xl p-space-md border-l-4 border-l-tertiary transition-all hover:bg-surface-container-high">
            <div className="flex items-start gap-space-sm">
              <div className="p-2 rounded bg-tertiary/10 text-tertiary flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">warning</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-headline-md text-headline-md text-on-surface">Pico de Gas MQ-135</h5>
                  <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-tertiary/20 text-tertiary font-semibold">
                    {diaPicoGas.estado === "Alerta" ? "ANOMALÍA" : "MÁXIMO"}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  El <strong className="text-on-surface">{diaPicoGas.dia_semana} {fechaCorta(diaPicoGas.fecha)}</strong> registró
                  la mayor concentración (<span className="font-mono text-tertiary font-semibold">{Math.round(diaPicoGas.gas_max)} ADC</span>,{" "}
                  {fmt(adcAVoltaje(diaPicoGas.gas_max), 2)} V), estado <strong>{diaPicoGas.estado}</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Insight máxima térmica */}
          <div className="bg-surface-container rounded-xl p-space-md border-l-4 border-l-primary transition-all hover:bg-surface-container-high">
            <div className="flex items-start gap-space-sm">
              <div className="p-2 rounded bg-primary/10 text-primary flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">thermostat</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-headline-md text-headline-md text-on-surface">Máxima Térmica</h5>
                  <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-primary/20 text-primary font-semibold">ISLA CALOR</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  El <strong className="text-on-surface">{diaMaxTemp.dia_semana} {fechaCorta(diaMaxTemp.fecha)}</strong> alcanzó{" "}
                  <span className="font-mono text-primary font-semibold">{fmt(diaMaxTemp.temp_max, 1)}°C</span> (promedio{" "}
                  {fmt(diaMaxTemp.temp_prom, 1)}°C, humedad {fmt(diaMaxTemp.hum_prom, 0)}%).
                </p>
              </div>
            </div>
          </div>

          {/* Insight correlación */}
          <div className="bg-surface-container rounded-xl p-space-md border-l-4 border-l-secondary transition-all hover:bg-surface-container-high">
            <div className="flex items-start gap-space-sm">
              <div className="p-2 rounded bg-secondary/10 text-secondary flex-shrink-0">
                <span className="material-symbols-outlined text-[20px]">insights</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h5 className="font-headline-md text-headline-md text-on-surface">Correlación Estadística</h5>
                  <span className="font-code-sm text-code-sm px-1.5 py-0.5 rounded bg-secondary/20 text-secondary font-semibold">
                    r = {corr ? fmt(corr.valor, 2) : "—"}
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant leading-snug">
                  {corr
                    ? `${corr.texto}: coeficiente de Pearson ${fmt(corr.valor, 2)} calculado por PySpark sobre el histórico.`
                    : "Aún no hay correlaciones. Ejecuta el análisis de PySpark para generarlas."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla diaria */}
      <div className="w-full bg-surface-container rounded-xl overflow-hidden">
        <div className="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between">
          <span className="font-label-caps text-label-caps text-outline uppercase tracking-wider">
            DESGLOSE DIARIO DE TELEMETRÍA AMBIENTAL CONSOLIDADA
          </span>
          <span className="font-code-sm text-code-sm text-on-surface-variant">Origen: agregados_diarios (Supabase)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-highest/50 font-label-caps text-label-caps text-outline uppercase border-b border-outline-variant/30">
                <th className="py-2.5 px-space-md">Día</th>
                <th className="py-2.5 px-space-md">Fecha</th>
                <th className="py-2.5 px-space-md">Temp Mín / Máx</th>
                <th className="py-2.5 px-space-md">Humedad Prom.</th>
                <th className="py-2.5 px-space-md">Nivel MQ-135 Pico</th>
                <th className="py-2.5 px-space-md">Estado Ambiental</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 font-code-sm text-code-sm text-on-surface">
              {dias.map((d) => {
                const alerta = d.estado === "Alerta";
                return (
                  <tr key={d.fecha} className={alerta ? "bg-error-container/10 hover:bg-error-container/20 transition-colors" : "hover:bg-surface-container-high/40 transition-colors"}>
                    <td className={`py-2.5 px-space-md font-medium ${alerta ? "text-error font-semibold" : "text-on-surface"}`}>{d.dia_semana}</td>
                    <td className="py-2.5 px-space-md text-on-surface-variant">{fechaCorta(d.fecha)}</td>
                    <td className="py-2.5 px-space-md">
                      <span className="text-primary">{fmt(d.temp_min, 1)}°C</span> / <span className="text-tertiary">{fmt(d.temp_max, 1)}°C</span>
                    </td>
                    <td className="py-2.5 px-space-md font-mono text-secondary">{fmt(d.hum_prom, 1)} %</td>
                    <td className={`py-2.5 px-space-md font-mono ${alerta ? "text-error font-bold" : ""}`}>
                      {Math.round(d.gas_max)} ADC ({fmt(adcAVoltaje(d.gas_max), 2)}V)
                    </td>
                    <td className="py-2.5 px-space-md">
                      <span className={`px-2 py-0.5 rounded font-medium ${badgeEstado(d.estado)}`}>{d.estado}</span>
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
