/**
 * helpers.js — Utilidades de cálculo y de dibujo SVG.
 */
import {
  GAS_UMBRAL_BUENO,
  GAS_UMBRAL_MODERADO,
} from "./config.js";

// ---------------------------------------------------------------
// Semáforo de calidad del aire (según valor crudo MQ-135)
// Los umbrales pueden venir del Gestor de Calibración (contexto).
// ---------------------------------------------------------------
export function estadoAire(gas, umbrales = {}) {
  const bueno = umbrales.bueno ?? GAS_UMBRAL_BUENO;
  const moderado = umbrales.moderado ?? GAS_UMBRAL_MODERADO;
  if (gas == null || Number.isNaN(gas))
    return { label: "SIN DATOS", nivel: "desconocido", clase: "text-outline", bg: "bg-surface-container" };
  if (gas < bueno)
    return { label: "BUENA (ÓPTIMA)", nivel: "bueno", clase: "text-secondary", bg: "bg-secondary/15" };
  if (gas < moderado)
    return { label: "MODERADA", nivel: "moderado", clase: "text-tertiary", bg: "bg-tertiary/15" };
  return { label: "CRÍTICA", nivel: "malo", clase: "text-error", bg: "bg-error/15" };
}

// Estado corto para la tabla/comparativas ('Óptimo' | 'Moderado' | 'Alerta')
export function estadoCorto(gasMax, umbrales = {}) {
  const bueno = umbrales.bueno ?? GAS_UMBRAL_BUENO;
  const moderado = umbrales.moderado ?? GAS_UMBRAL_MODERADO;
  if (gasMax == null) return "—";
  if (gasMax < bueno) return "Óptimo";
  if (gasMax < moderado) return "Moderado";
  return "Alerta";
}

// ---------------------------------------------------------------
// Punto de rocío (fórmula de Magnus) — dato derivado para la tarjeta
// ---------------------------------------------------------------
export function puntoRocio(tempC, humRel) {
  if (tempC == null || humRel == null || humRel <= 0) return null;
  const a = 17.27;
  const b = 237.7;
  const gamma = (a * tempC) / (b + tempC) + Math.log(humRel / 100);
  return (b * gamma) / (a - gamma);
}

// Voltaje aproximado del pin ADC (ESP32: 12 bits, 0..3.3V)
export function adcAVoltaje(adc) {
  if (adc == null) return null;
  return (adc / 4095) * 3.3;
}

// ---------------------------------------------------------------
// Formato
// ---------------------------------------------------------------
export function fmt(valor, decimales = 1) {
  if (valor == null || Number.isNaN(valor)) return "—";
  return Number(valor).toFixed(decimales);
}

export function horaCorta(fechaISO) {
  const d = new Date(fechaISO);
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export function haceSegundos(fechaISO) {
  if (!fechaISO) return "—";
  const seg = Math.max(0, Math.round((Date.now() - new Date(fechaISO).getTime()) / 1000));
  if (seg < 60) return `hace ${seg}s`;
  const min = Math.round(seg / 60);
  if (min < 60) return `hace ${min}m`;
  return `hace ${Math.round(min / 60)}h`;
}

// ---------------------------------------------------------------
// Construcción de paths SVG (líneas suavizadas + áreas)
// ---------------------------------------------------------------
// Mapea un valor [min..max] a la coordenada Y del viewBox (invertida).
function mapY(valor, min, max, altura, padTop, padBottom) {
  const rango = max - min || 1;
  const usable = altura - padTop - padBottom;
  const t = (valor - min) / rango;
  return altura - padBottom - Math.max(0, Math.min(1, t)) * usable;
}

/**
 * Convierte un array de valores en coordenadas {x,y} distribuidas
 * uniformemente a lo largo del ancho del viewBox.
 */
export function aPuntos(valores, { ancho, alto, min, max, padTop = 8, padBottom = 20 }) {
  const n = valores.length;
  if (n === 0) return [];
  return valores.map((v, i) => ({
    x: n === 1 ? ancho : (i / (n - 1)) * ancho,
    y: mapY(v, min, max, alto, padTop, padBottom),
  }));
}

/** Path de línea suavizada (Catmull-Rom -> Bézier). */
export function pathLinea(puntos) {
  if (puntos.length === 0) return "";
  if (puntos.length === 1) return `M ${puntos[0].x},${puntos[0].y}`;
  let d = `M ${puntos[0].x.toFixed(2)},${puntos[0].y.toFixed(2)}`;
  for (let i = 0; i < puntos.length - 1; i++) {
    const p0 = puntos[i - 1] || puntos[i];
    const p1 = puntos[i];
    const p2 = puntos[i + 1];
    const p3 = puntos[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2.x.toFixed(2)},${p2.y.toFixed(2)}`;
  }
  return d;
}

/** Path de área (línea + cierre hasta la base). */
export function pathArea(puntos, alto) {
  if (puntos.length === 0) return "";
  const linea = pathLinea(puntos);
  const ultimo = puntos[puntos.length - 1];
  const primero = puntos[0];
  return `${linea} L ${ultimo.x.toFixed(2)},${alto} L ${primero.x.toFixed(2)},${alto} Z`;
}

// Delta entre las dos últimas lecturas de una serie
export function delta(valores) {
  if (!valores || valores.length < 2) return 0;
  return valores[valores.length - 1] - valores[valores.length - 2];
}
