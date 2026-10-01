/**
 * ConfigContext — Configuración de calibración editable en runtime.
 *
 * Los umbrales del semáforo y la escala del gráfico se pueden ajustar desde
 * la vista "Gestor de Calibración" y se persisten en localStorage. Todas las
 * vistas leen estos valores con el hook useConfig().
 */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  GAS_UMBRAL_BUENO,
  GAS_UMBRAL_MODERADO,
  GAS_ESCALA_GRAFICO,
} from "../lib/config.js";

const CLAVE_LS = "calibracion-monitoreo";

const DEFECTOS = {
  umbralBueno: GAS_UMBRAL_BUENO,
  umbralModerado: GAS_UMBRAL_MODERADO,
  escalaGas: GAS_ESCALA_GRAFICO,
};

const ConfigContext = createContext(null);

function leerLS() {
  try {
    const raw = localStorage.getItem(CLAVE_LS);
    if (!raw) return DEFECTOS;
    return { ...DEFECTOS, ...JSON.parse(raw) };
  } catch {
    return DEFECTOS;
  }
}

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(leerLS);

  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_LS, JSON.stringify(config));
    } catch {
      /* almacenamiento no disponible: seguimos en memoria */
    }
  }, [config]);

  const valor = useMemo(
    () => ({
      ...config,
      // Umbrales listos para pasar a los helpers
      umbrales: { bueno: config.umbralBueno, moderado: config.umbralModerado },
      actualizar: (parcial) => setConfig((c) => ({ ...c, ...parcial })),
      restablecer: () => setConfig(DEFECTOS),
    }),
    [config]
  );

  return <ConfigContext.Provider value={valor}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig debe usarse dentro de <ConfigProvider>");
  return ctx;
}
