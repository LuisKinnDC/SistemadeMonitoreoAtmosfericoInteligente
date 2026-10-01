/**
 * useLiveReadings — Lecturas EN VIVO desde Supabase.
 *
 * Estrategia híbrida y robusta:
 *   1. Carga inicial: consulta las lecturas de la ventana seleccionada.
 *   2. Realtime: se suscribe a INSERT en la tabla (WebSocket) para
 *      añadir lecturas nuevas al instante.
 *   3. Fallback: si Realtime no conecta (no habilitado en Supabase),
 *      hace polling cada INTERVALO_POLLING_MS automáticamente.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient.js";
import {
  TABLA_LECTURAS,
  MAX_PUNTOS_VIVO,
  INTERVALO_POLLING_MS,
} from "../lib/config.js";

export function useLiveReadings(horas = 1) {
  const [lecturas, setLecturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [conexion, setConexion] = useState("conectando"); // conectando | realtime | polling

  const pollRef = useRef(null);

  // Carga inicial (o recarga por polling / cambio de ventana)
  const cargar = useCallback(async () => {
    const desde = new Date(Date.now() - horas * 3600 * 1000).toISOString();
    const { data, error: err } = await supabase
      .from(TABLA_LECTURAS)
      .select("id, temperatura, humedad, gas, created_at")
      .gt("created_at", desde)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (err) {
      setError(err.message);
    } else {
      setError(null);
      // Nos quedamos con los últimos MAX_PUNTOS_VIVO para que el SVG sea legible
      const arr = data || [];
      setLecturas(arr.slice(-MAX_PUNTOS_VIVO));
    }
    setCargando(false);
  }, [horas]);

  // Efecto principal: carga + suscripción Realtime + fallback polling
  useEffect(() => {
    let activo = true;
    setCargando(true);
    cargar();

    // Suscripción Realtime a nuevas inserciones
    const canal = supabase
      .channel("lecturas-vivo")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: TABLA_LECTURAS },
        (payload) => {
          if (!activo) return;
          setConexion("realtime");
          setLecturas((prev) => {
            const siguiente = [...prev, payload.new];
            return siguiente.slice(-MAX_PUNTOS_VIVO);
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConexion("realtime");
          // Con Realtime activo no necesitamos polling frecuente
          if (pollRef.current) clearInterval(pollRef.current);
        }
      });

    // Fallback: si en 6s no hay Realtime, activamos polling
    const tempCheck = setTimeout(() => {
      if (!activo) return;
      setConexion((c) => {
        if (c !== "realtime") {
          if (!pollRef.current) {
            pollRef.current = setInterval(cargar, INTERVALO_POLLING_MS);
          }
          return "polling";
        }
        return c;
      });
    }, 6000);

    return () => {
      activo = false;
      clearTimeout(tempCheck);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      supabase.removeChannel(canal);
    };
  }, [cargar]);

  return { lecturas, cargando, error, conexion, recargar: cargar };
}
