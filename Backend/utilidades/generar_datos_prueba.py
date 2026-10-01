"""
utilidades/generar_datos_prueba.py
==========================================================
Generador de datos sintéticos para PROBAR el pipeline sin depender
del ESP32. Inserta lecturas realistas en la tabla de Supabase,
incluyendo A PROPÓSITO algunos valores sucios (nulos y outliers)
para poder comprobar que la Capa 1 (limpieza) los descarta.

Uso:
  # Insertar 3 días de historial (para las comparativas del batch):
  python -m utilidades.generar_datos_prueba --dias 3

  # Simular el ESP32 en vivo (una lectura cada 15s):
  python -m utilidades.generar_datos_prueba --vivo
==========================================================
"""
from __future__ import annotations

import argparse
import math
import random
import sys
import time
from datetime import datetime, timedelta, timezone

try:
    import config
    import supa_rest
except ModuleNotFoundError:  # pragma: no cover
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config
    import supa_rest


def _lectura(ts: datetime, sucio: bool = False) -> dict:
    """
    Genera una lectura plausible con un ciclo diario:
      - Temperatura sube al mediodía, baja de madrugada.
      - Humedad inversa a la temperatura.
      - Gas mayor en horas pico (mañana/tarde).
    """
    hora = ts.hour + ts.minute / 60
    # Ciclo diario con seno (pico ~15h)
    temp = 22 + 7 * math.sin((hora - 9) / 24 * 2 * math.pi) + random.uniform(-0.8, 0.8)
    hum = 60 - 15 * math.sin((hora - 9) / 24 * 2 * math.pi) + random.uniform(-3, 3)
    # Gas con picos en horas de tráfico (8h y 15h)
    pico = math.exp(-((hora - 8) ** 2) / 6) + math.exp(-((hora - 15) ** 2) / 6)
    gas = int(900 + 1500 * pico + random.uniform(-120, 120))

    if sucio:
        # ~1 de cada varias: mete basura para probar la limpieza
        tipo = random.choice(["null_temp", "outlier_temp", "outlier_gas"])
        if tipo == "null_temp":
            temp = None
        elif tipo == "outlier_temp":
            temp = random.choice([-999.0, 250.0])   # fallo del DHT22
        elif tipo == "outlier_gas":
            gas = random.choice([-50, 99999])        # fuera de rango ADC

    return {
        "temperatura": round(temp, 2) if temp is not None else None,
        "humedad": round(max(0, min(100, hum)), 2),
        "gas": gas,
        "created_at": ts.astimezone(timezone.utc).isoformat(),
    }


def generar_historial(dias: int, prob_sucio: float = 0.05) -> None:
    ahora = datetime.now(timezone.utc)
    inicio = ahora - timedelta(days=dias)
    filas = []
    t = inicio
    while t < ahora:
        # prob_sucio de lecturas sucias para probar la limpieza (0 = todo limpio)
        filas.append(_lectura(t, sucio=random.random() < prob_sucio))
        t += timedelta(minutes=5)   # una lectura cada 5 min para el historial

    # Insertar por lotes vía REST (evita el problema de RLS de supabase-py)
    print(f"Insertando {len(filas)} lecturas de {dias} día(s)...")
    total = supa_rest.insertar(config.TABLA_LECTURAS, filas)
    print(f"Historial generado: {total} lecturas insertadas.")


def generar_vivo(prob_sucio: float = 0.05) -> None:
    print("Simulando ESP32 en vivo (cada 15s). Ctrl+C para detener.")
    try:
        while True:
            fila = _lectura(datetime.now(timezone.utc), sucio=random.random() < prob_sucio)
            supa_rest.insertar(config.TABLA_LECTURAS, [fila])
            print(f"[{datetime.now():%H:%M:%S}] insertada: {fila}")
            time.sleep(15)
    except KeyboardInterrupt:
        print("\nSimulación detenida.")


def main() -> None:
    p = argparse.ArgumentParser(description="Generador de datos de prueba para Supabase")
    p.add_argument("--dias", type=int, default=0, help="Genera N días de historial y termina.")
    p.add_argument("--vivo", action="store_true", help="Simula el ESP32 enviando cada 15s.")
    p.add_argument("--limpio", action="store_true", help="No inyecta datos sucios (todo dentro de rango).")
    args = p.parse_args()

    prob = 0.0 if args.limpio else 0.05

    if args.dias > 0:
        generar_historial(args.dias, prob_sucio=prob)
    if args.vivo:
        generar_vivo(prob_sucio=prob)
    if args.dias == 0 and not args.vivo:
        p.print_help()


if __name__ == "__main__":
    main()
