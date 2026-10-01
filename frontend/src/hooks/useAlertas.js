/**
 * useAlertas — Lecturas que superaron el umbral de gas (estado de alerta).
 * Alimenta el badge del menú y la vista "Alertas por Umbral".
 * Se recarga cada 20 s (independiente de la vista activa).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient.js";
import { TABLA_LECTURAS } from "../lib/config.js";

export function useAlertas(horas = 24, umbralModerado) {
  const [alertas, setAlertas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    if (umbralModerado == null) return;
    const desde = new Date(Date.now() - horas * 3600 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from(TABLA_LECTURAS)
      .select("id, temperatura, humedad, gas, created_at")
      .gte("gas", umbralModerado)
      .gt("created_at", desde)
      .order("created_at", { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    else {
      setError(null);
      setAlertas(data || []);
    }
    setCargando(false);
  }, [horas, umbralModerado]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 20000);
    return () => clearInterval(id);
  }, [cargar]);

  return { alertas, conteo: alertas.length, cargando, error, recargar: cargar };
}
