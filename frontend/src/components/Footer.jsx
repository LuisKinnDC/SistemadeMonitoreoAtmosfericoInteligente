/** Footer — Pie técnico. */
export default function Footer() {
  return (
    <footer className="w-full pt-space-md border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-sm font-code-sm text-code-sm text-outline">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-secondary" />
        <span>Sistema de Monitoreo Atmosférico Inteligente</span>
        <span>•</span>
        <span className="text-on-surface-variant">Analítica con Big Data</span>
      </div>
      <div className="flex flex-wrap items-center gap-space-md text-on-surface-variant">
        <span>Sensores: <strong className="text-on-surface font-mono">DHT22 + MQ-135</strong></span>
        <span>Protocolo: <strong className="text-on-surface font-mono">Supabase Realtime</strong></span>
        <span>Pipeline: <strong className="text-secondary font-mono">Python → PySpark → React</strong></span>
      </div>
    </footer>
  );
}
