/**
 * config.js — Parámetros del dashboard.
 * Mantén los umbrales del semáforo SINCRONIZADOS con Backend/config.py.
 */

// Nombre de la tabla de lecturas del ESP32
export const TABLA_LECTURAS =
  import.meta.env.VITE_TABLA_LECTURAS || "lecturas_sensores";

// --- Umbrales del semáforo de calidad del aire (MQ-135 crudo, 0..4095) ---
export const GAS_UMBRAL_BUENO = 1200; // < 1200  => Óptimo (verde)
export const GAS_UMBRAL_MODERADO = 2500; // 1200..2500 => Moderado (ámbar); > => Crítico (rojo)

// Escala vertical del gas en el gráfico principal (eje Y2). El ADC llega a 4095,
// pero para que la curva sea visible usamos una escala de visualización menor.
export const GAS_ESCALA_GRAFICO = 2048;

// Escala del eje Y1 (temperatura y humedad comparten eje: 0..40°C / 0..100%HR)
export const TEMP_ESCALA = 40; // °C
export const HUM_ESCALA = 100; // %

// Nº máximo de puntos a mostrar en el gráfico y sparklines en vivo
export const MAX_PUNTOS_VIVO = 120;
export const PUNTOS_SPARKLINE = 24;

// Cada cuánto hacer polling si Realtime NO está disponible (ms)
export const INTERVALO_POLLING_MS = 15000;

// Opciones de ventana temporal para el gráfico en vivo
export const VENTANAS = [
  { clave: "1h", label: "Última hora", horas: 1 },
  { clave: "6h", label: "Últimas 6 horas", horas: 6 },
  { clave: "24h", label: "Últimas 24 horas", horas: 24 },
];
