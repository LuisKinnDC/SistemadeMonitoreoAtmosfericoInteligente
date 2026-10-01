"""
ingesta/limpieza.py
==========================================================
CAPA 1 - INGESTA Y LIMPIEZA
==========================================================
Responsabilidad:
  1. Conectarse a Supabase (supabase-py) y leer lecturas nuevas.
  2. Limpiar los datos: nulos, duplicados y outliers físicamente imposibles.
  3. Escribir Parquet particionado por fecha en la "zona de aterrizaje"
     (config.LANDING_DIR) para que PySpark lo consuma.

Se ejecuta en modo MICRO-BATCH con POLLING porque Supabase/Postgres NO es
una fuente de streaming nativa. Usa una "marca de agua" (watermark) sobre
la columna created_at para leer solo lo nuevo en cada pasada (ingesta
incremental) y no reprocesar todo el historial.

Uso:
  # Una sola pasada (ideal para probar o para tarea programada / cron):
  python -m ingesta.limpieza --una-vez

  # Bucle continuo cada N segundos (config.INTERVALO_POLLING_SEG):
  python -m ingesta.limpieza
==========================================================
"""
from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timezone

import pandas as pd
from supabase import create_client, Client

# Permite ejecutar tanto como módulo (-m) como script suelto
try:
    import config
except ModuleNotFoundError:  # pragma: no cover
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config


# ----------------------------------------------------------------------
# Conexión
# ----------------------------------------------------------------------
def conectar_supabase() -> Client:
    """Crea el cliente de Supabase validando credenciales."""
    config.validar_credenciales()
    return create_client(config.SUPABASE_URL, config.SUPABASE_KEY)


# ----------------------------------------------------------------------
# Marca de agua (para ingesta incremental)
# ----------------------------------------------------------------------
def leer_watermark() -> str | None:
    """Devuelve el último created_at procesado, o None si es la 1ª ejecución."""
    if config.WATERMARK_FILE.exists():
        valor = config.WATERMARK_FILE.read_text(encoding="utf-8").strip()
        return valor or None
    return None


def guardar_watermark(valor: str) -> None:
    config.WATERMARK_FILE.write_text(valor, encoding="utf-8")


# ----------------------------------------------------------------------
# Extracción
# ----------------------------------------------------------------------
def extraer_lecturas(sb: Client, desde: str | None) -> pd.DataFrame:
    """
    Lee de Supabase las filas con created_at > 'desde'.
    Si 'desde' es None, trae el historial completo (primera corrida).
    """
    consulta = (
        sb.table(config.TABLA_LECTURAS)
        .select("id, temperatura, humedad, gas, created_at")
        .order("created_at", desc=False)
        .limit(config.TAMANIO_LOTE)
    )
    if desde:
        consulta = consulta.gt("created_at", desde)

    respuesta = consulta.execute()
    datos = respuesta.data or []
    return pd.DataFrame(datos)


# ----------------------------------------------------------------------
# Limpieza
# ----------------------------------------------------------------------
def limpiar(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Aplica las reglas de limpieza y devuelve (df_limpio, reporte).

    Reglas:
      - Tipado correcto de columnas.
      - Eliminar filas con nulos en columnas clave.
      - Eliminar duplicados (por id, y por timestamp+valores).
      - Descartar outliers fuera del rango físico del sensor:
          temperatura   : [TEMP_MIN, TEMP_MAX]
          humedad       : [HUM_MIN, HUM_MAX]
          gas (ADC 12b) : [GAS_MIN, GAS_MAX]
    """
    reporte = {"recibidas": len(df)}
    if df.empty:
        reporte.update(nulos=0, duplicados=0, outliers=0, validas=0)
        return df, reporte

    # 1) Tipado. 'coerce' convierte lo no numérico en NaN (basura del sensor).
    df["temperatura"] = pd.to_numeric(df["temperatura"], errors="coerce")
    df["humedad"]     = pd.to_numeric(df["humedad"], errors="coerce")
    df["gas"]         = pd.to_numeric(df["gas"], errors="coerce")
    df["created_at"]  = pd.to_datetime(df["created_at"], errors="coerce", utc=True)

    # 2) Nulos en columnas clave
    antes = len(df)
    df = df.dropna(subset=["temperatura", "humedad", "gas", "created_at"])
    reporte["nulos"] = antes - len(df)

    # 3) Duplicados: por id (clave primaria) y por combinación de valores
    antes = len(df)
    df = df.drop_duplicates(subset=["id"])
    df = df.drop_duplicates(subset=["created_at", "temperatura", "humedad", "gas"])
    reporte["duplicados"] = antes - len(df)

    # 4) Outliers fuera de rango físico posible (fallos del DHT22 / MQ-135)
    antes = len(df)
    mask = (
        df["temperatura"].between(config.TEMP_MIN, config.TEMP_MAX)
        & df["humedad"].between(config.HUM_MIN, config.HUM_MAX)
        & df["gas"].between(config.GAS_MIN, config.GAS_MAX)
    )
    df = df[mask].copy()
    reporte["outliers"] = antes - len(df)

    # 5) Columna de partición (fecha) para Spark / Parquet
    df["fecha"] = df["created_at"].dt.strftime("%Y-%m-%d")

    reporte["validas"] = len(df)
    return df, reporte


# ----------------------------------------------------------------------
# Carga (escritura a Parquet particionado)
# ----------------------------------------------------------------------
def escribir_parquet(df: pd.DataFrame) -> None:
    """
    Escribe el DataFrame como Parquet particionado por 'fecha'.
    Cada micro-batch genera un archivo nuevo dentro de datos/limpios/fecha=YYYY-MM-DD/
    lo que dispara automáticamente al Structured Streaming de Spark.
    """
    if df.empty:
        return
    # partition_cols crea la estructura fecha=YYYY-MM-DD/ que Spark entiende.
    df.to_parquet(
        config.LANDING_DIR,
        engine="pyarrow",
        index=False,
        partition_cols=["fecha"],
        # 'basename_template' evita colisiones de nombre entre micro-batches
        basename_template=f"lote-{datetime.now(timezone.utc):%Y%m%dT%H%M%S%f}-{{i}}.parquet",
    )


# ----------------------------------------------------------------------
# Un ciclo completo de ingesta (extraer -> limpiar -> cargar)
# ----------------------------------------------------------------------
def ejecutar_ciclo(sb: Client) -> int:
    """Ejecuta una pasada de ingesta. Devuelve nº de filas válidas escritas."""
    watermark = leer_watermark()
    df_crudo = extraer_lecturas(sb, watermark)

    if df_crudo.empty:
        print(f"[{datetime.now():%H:%M:%S}] Sin lecturas nuevas.")
        return 0

    df_limpio, rep = limpiar(df_crudo)
    escribir_parquet(df_limpio)

    # Avanzar la marca de agua al created_at más reciente PROCESADO (limpio o no,
    # para no volver a leer basura ya evaluada).
    nuevo_wm = pd.to_datetime(df_crudo["created_at"], utc=True).max()
    if pd.notna(nuevo_wm):
        guardar_watermark(nuevo_wm.isoformat())

    print(
        f"[{datetime.now():%H:%M:%S}] "
        f"recibidas={rep['recibidas']}  nulos={rep['nulos']}  "
        f"duplicados={rep['duplicados']}  outliers={rep['outliers']}  "
        f"-> VALIDAS={rep['validas']}"
    )
    return rep["validas"]


def main() -> None:
    parser = argparse.ArgumentParser(description="Capa 1 - Ingesta y limpieza desde Supabase")
    parser.add_argument(
        "--una-vez", action="store_true",
        help="Ejecuta una sola pasada y termina (útil para cron/tarea programada)."
    )
    args = parser.parse_args()

    sb = conectar_supabase()
    print("Conectado a Supabase. Zona de aterrizaje:", config.LANDING_DIR)

    if args.una_vez:
        ejecutar_ciclo(sb)
        return

    print(f"Modo continuo: polling cada {config.INTERVALO_POLLING_SEG}s. Ctrl+C para detener.")
    try:
        while True:
            ejecutar_ciclo(sb)
            time.sleep(config.INTERVALO_POLLING_SEG)
    except KeyboardInterrupt:
        print("\nIngesta detenida por el usuario.")


if __name__ == "__main__":
    main()
