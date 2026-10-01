/** Vista: Telemetría en Vivo — KPIs + gráfico multivariable en tiempo real. */
import ContextBar from "../components/ContextBar.jsx";
import KpiPanel from "../components/KpiPanel.jsx";
import LiveChart from "../components/LiveChart.jsx";

export default function TelemetriaEnVivo({
  mostradas,
  conexion,
  tasaPorMin,
  streamActivo,
  onToggleStream,
  onSync,
  capas,
  onToggleCapa,
  ventana,
  onVentana,
}) {
  return (
    <>
      <ContextBar
        conexion={conexion}
        tasaPorMin={tasaPorMin}
        streamActivo={streamActivo}
        onToggleStream={onToggleStream}
        onSync={onSync}
      />
      <KpiPanel lecturas={mostradas} />
      <LiveChart
        lecturas={mostradas}
        capas={capas}
        onToggleCapa={onToggleCapa}
        ventana={ventana}
        onVentana={onVentana}
      />
    </>
  );
}
