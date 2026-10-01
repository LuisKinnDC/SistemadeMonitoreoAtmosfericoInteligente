/** Vista: Analítica Histórica — comparativas agregadas por PySpark. */
import Comparativas from "../components/Comparativas.jsx";

export default function AnaliticaHistorica({ dias, metricas, error }) {
  return (
    <div className="space-y-space-md">
      <div className="flex items-center gap-space-sm">
        <span className="material-symbols-outlined text-primary text-[22px]">timeline</span>
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface">Analítica Histórica</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Agregaciones y comparativas calculadas con PySpark y persistidas en Supabase
          </p>
        </div>
      </div>
      <Comparativas dias={dias} metricas={metricas} error={error} />
    </div>
  );
}
