/**
 * useComparativas — Datos históricos AGREGADOS (opción B).
 *
 * Lee las tablas que PySpark rellena en Supabase:
 *   - agregados_diarios : una fila por día (temp, humedad, gas, estado)
 *   - metricas_globales : correlaciones e insights (clave/valor)
 *
 * Se recarga al montar y cada 60s (por si el batch de Spark corre de nuevo).
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";

export function useComparativas() {
  const [dias, setDias] = useState([]);
  const [metricas, setMetricas] = useState({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    const [resDias, resMet] = await Promise.all([
      supabase
        .from("agregados_diarios")
        .select("*")
        .order("fecha", { ascending: true })
        .limit(31),
      supabase.from("metricas_globales").select("*"),
    ]);

    if (resDias.error) {
      // Error típico: la tabla aún no existe -> guía al usuario
      setError(resDias.error.message);
    } else {
      setError(null);
      setDias(resDias.data || []);
    }

    if (!resMet.error && resMet.data) {
      const mapa = {};
      for (const m of resMet.data) mapa[m.clave] = m;
      setMetricas(mapa);
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 60000);
    return () => clearInterval(id);
  }, [cargar]);

  return { dias, metricas, cargando, error, recargar: cargar };
}
