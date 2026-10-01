/** App — Enrutador del dashboard: coordina estado y muestra la vista activa. */
import { useEffect, useMemo, useState } from "react";
import Sidebar from "./components/Sidebar.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import TelemetriaEnVivo from "./views/TelemetriaEnVivo.jsx";
import MatrizSensores from "./views/MatrizSensores.jsx";
import TopologiaNodos from "./views/TopologiaNodos.jsx";
import RegistrosTransmision from "./views/RegistrosTransmision.jsx";
import AnaliticaHistorica from "./views/AnaliticaHistorica.jsx";
import AlertasUmbral from "./views/AlertasUmbral.jsx";
import GestorCalibracion from "./views/GestorCalibracion.jsx";
import { useLiveReadings } from "./hooks/useLiveReadings.js";
import { useComparativas } from "./hooks/useComparativas.js";
import { useAlertas } from "./hooks/useAlertas.js";
import { useConfig } from "./context/ConfigContext.jsx";
import { credencialesOk } from "./lib/supabaseClient.js";
import { VENTANAS } from "./lib/config.js";

const VISTAS_VALIDAS = [
  "live-telemetry",
  "sensor-matrix",
  "node-topology",
  "raw-stream-logs",
  "historical-analytics",
  "threshold-alerts",
  "calibration-manager",
];

function descargarCSV(lecturas) {
  if (!lecturas.length) {
    window.alert("No hay lecturas para exportar todavía. Espera a que el ESP32 envíe datos.");
    return;
  }
  const cabecera = "id,created_at,temperatura,humedad,gas";
  const filas = lecturas.map(
    (l) => `${l.id ?? ""},${l.created_at},${l.temperatura},${l.humedad},${l.gas}`
  );
  // BOM (﻿) para que Excel reconozca UTF-8; \r\n para compatibilidad amplia.
  const contenido = "﻿" + [cabecera, ...filas].join("\r\n");
  const blob = new Blob([contenido], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  a.href = url;
  a.download = `lecturas_esp32_${sello}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function leerRuta() {
  const p = window.location.pathname.replace(/^\/+/, "");
  return VISTAS_VALIDAS.includes(p) ? p : "live-telemetry";
}

export default function App() {
  const { umbralModerado } = useConfig();

  // --- Navegación por rutas limpias (History API, sin # en la URL) ---
  const [vista, setVista] = useState(leerRuta);
  // Menú lateral: en móvil/tablet se abre/cierra; en escritorio siempre visible.
  const [menuAbierto, setMenuAbierto] = useState(false);
  const cerrarMenu = () => setMenuAbierto(false);
  useEffect(() => {
    // Responder a los botones atrás/adelante del navegador.
    const onPop = () => setVista(leerRuta());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navegar = (p) => {
    window.history.pushState(null, "", "/" + p);
    setVista(p);
    setMenuAbierto(false); // al elegir una vista en móvil, cierra el menú
  };

  // --- Estado de la vista en vivo ---
  const [ventana, setVentana] = useState("1h");
  const [capas, setCapas] = useState({ temp: true, hum: true, gas: true });
  const [streamActivo, setStreamActivo] = useState(true);
  const [congeladas, setCongeladas] = useState(null);

  const horas = useMemo(() => VENTANAS.find((v) => v.clave === ventana)?.horas ?? 1, [ventana]);
  const { lecturas, error, conexion, recargar } = useLiveReadings(horas);
  const { dias, metricas, error: errorComp } = useComparativas();
  const { alertas, conteo } = useAlertas(24, umbralModerado);

  useEffect(() => {
    if (!streamActivo && congeladas === null) setCongeladas(lecturas);
    if (streamActivo && congeladas !== null) setCongeladas(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamActivo]);
  const mostradas = streamActivo ? lecturas : congeladas || lecturas;

  const toggleCapa = (c) => setCapas((prev) => ({ ...prev, [c]: !prev[c] }));

  const tasaPorMin = useMemo(() => {
    if (lecturas.length < 2) return "—";
    const ultimos = lecturas.slice(-10);
    const t0 = new Date(ultimos[0].created_at).getTime();
    const t1 = new Date(ultimos[ultimos.length - 1].created_at).getTime();
    const segTot = (t1 - t0) / 1000;
    if (segTot <= 0) return "—";
    return ((ultimos.length - 1) / (segTot / 60)).toFixed(1);
  }, [lecturas]);

  const ultimaLectura = lecturas[lecturas.length - 1]?.created_at;

  const renderVista = () => {
    switch (vista) {
      case "sensor-matrix":
        return <MatrizSensores mostradas={mostradas} />;
      case "node-topology":
        return (
          <TopologiaNodos
            conexion={conexion}
            ultimaLectura={ultimaLectura}
            totalMuestras={lecturas.length}
            diasAgregados={dias.length}
          />
        );
      case "raw-stream-logs":
        return <RegistrosTransmision mostradas={mostradas} />;
      case "historical-analytics":
        return <AnaliticaHistorica dias={dias} metricas={metricas} error={errorComp} />;
      case "threshold-alerts":
        return <AlertasUmbral alertas={alertas} conteo={conteo} />;
      case "calibration-manager":
        return <GestorCalibracion />;
      case "live-telemetry":
      default:
        return (
          <TelemetriaEnVivo
            mostradas={mostradas}
            conexion={conexion}
            tasaPorMin={tasaPorMin}
            streamActivo={streamActivo}
            onToggleStream={() => setStreamActivo((s) => !s)}
            onSync={recargar}
            capas={capas}
            onToggleCapa={toggleCapa}
            ventana={ventana}
            onVentana={setVentana}
          />
        );
    }
  };

  return (
    <>
      <Sidebar
        vistaActiva={vista}
        onNavegar={navegar}
        alertasConteo={conteo}
        abierto={menuAbierto}
        onCerrar={cerrarMenu}
      />
      {/* Fondo oscuro al abrir el menú en móvil (toca para cerrar) */}
      {menuAbierto && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={cerrarMenu}
          aria-hidden="true"
        />
      )}
      <div className="lg:pl-64">
        <Header
          conexion={conexion}
          ultimaLectura={ultimaLectura}
          onExport={() => descargarCSV(mostradas)}
          numExportables={mostradas.length}
          onAbrirMenu={() => setMenuAbierto(true)}
        />
        <main className="relative pt-16 w-full px-margin min-h-screen bg-surface">
          <div className="flex flex-col w-full pb-space-xl space-y-space-lg pt-space-md">
            {!credencialesOk && (
              <div className="p-space-md rounded-xl bg-error-container/20 border border-error/40 text-on-surface">
                <strong className="text-error">Faltan credenciales de Supabase.</strong> Copia{" "}
                <code>.env.example</code> a <code>.env.local</code> y rellena{" "}
                <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.
              </div>
            )}
            {error && credencialesOk && (
              <div className="p-space-md rounded-xl bg-error-container/20 border border-error/40 text-on-surface">
                <strong className="text-error">Error leyendo lecturas:</strong> {error}
              </div>
            )}

            {renderVista()}

            <Footer />
          </div>
        </main>
      </div>
    </>
  );
}
