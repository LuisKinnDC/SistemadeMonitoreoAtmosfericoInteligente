"""
procesamiento/analisis_spark.py
==========================================================
CAPA 2 (parte A) - PROCESAMIENTO Y ANÁLISIS  [BATCH]
==========================================================
Análisis histórico sobre TODO el dataset limpio (datos/limpios/).
Se usa BATCH (no streaming) porque las comparativas día-a-día y las
correlaciones necesitan ver el conjunto completo, no una ventana.

Genera y guarda en datos/resultados/ (para que el dashboard los lea):
  - agregados_por_hora.csv   : avg/max/min de temp, humedad, gas por hora
  - agregados_por_dia.csv    : avg/max/min de temp, humedad, gas por día
  - dias_extremos.csv        : días más calurosos / más fríos
  - franjas_calor.csv        : franja horaria más calurosa de cada día
  - correlaciones.csv        : correlación temp/humedad vs gas
  - comparativa_gas_dia_franja.csv : gas promedio por día y franja horaria

Uso:
  python -m procesamiento.analisis_spark
==========================================================
"""
from __future__ import annotations

import sys

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F

try:
    import config
except ModuleNotFoundError:  # pragma: no cover
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config


# ----------------------------------------------------------------------
# Sesión de Spark
# ----------------------------------------------------------------------
def crear_spark(nombre: str = "MonitoreoAtmosferico-Batch") -> SparkSession:
    return (
        SparkSession.builder
        .appName(nombre)
        .master("local[*]")                       # usa todos los núcleos locales
        .config("spark.sql.shuffle.partitions", "8")   # bajo, dataset pequeño
        .config("spark.sql.session.timeZone", "UTC")
        # Arrow desactivado: en Windows la JVM puede romper las DLLs de pyarrow,
        # así que usamos la conversión pandas<->Spark en Python puro.
        .config("spark.sql.execution.arrow.pyspark.enabled", "false")
        .getOrCreate()
    )


# ----------------------------------------------------------------------
# Lectura + enriquecimiento temporal
# ----------------------------------------------------------------------
def leer_datos(spark: SparkSession, pdf=None) -> DataFrame:
    """
    Construye el DataFrame de Spark y añade columnas de tiempo derivadas.

    - Entorno ideal (Linux, o Windows con winutils): Spark lee el Parquet
      directamente con `spark.read.parquet`.
    - Windows sin winutils: se pasa `pdf` (ya cargado con pandas ANTES de
      iniciar la JVM) y se crea el DataFrame en memoria con createDataFrame.
      Las agregaciones se ejecutan en Spark igualmente.
    """
    if pdf is not None:
        # createDataFrame con esquema explícito y tuplas de Python puro
        # (evita depender de pyarrow/versión de pandas para la conversión).
        import pandas as pd
        from pyspark.sql.types import (
            StructType, StructField, DoubleType, LongType, TimestampType,
        )
        pdf = pdf.copy()
        pdf["created_at"] = pd.to_datetime(pdf["created_at"], utc=True)
        esquema = StructType([
            StructField("id", LongType(), True),
            StructField("temperatura", DoubleType(), True),
            StructField("humedad", DoubleType(), True),
            StructField("gas", DoubleType(), True),
            StructField("created_at", TimestampType(), True),
        ])
        filas = [
            (
                int(r.id) if pd.notna(r.id) else None,
                float(r.temperatura),
                float(r.humedad),
                float(r.gas),
                r.created_at.to_pydatetime(),
            )
            for r in pdf.itertuples(index=False)
        ]
        df = spark.createDataFrame(filas, esquema)
    else:
        df = spark.read.parquet(str(config.LANDING_DIR))

    # created_at viene como timestamp (Parquet conserva el tipo).
    df = (
        df
        .withColumn("fecha_d", F.to_date("created_at"))
        .withColumn("hora", F.hour("created_at"))
        .withColumn("dia_semana", F.date_format("created_at", "EEEE"))  # lunes, martes...
    )
    return df


# ----------------------------------------------------------------------
# Agregados por ventana de tiempo
# ----------------------------------------------------------------------
def _agregados(df: DataFrame, *cols_grupo) -> DataFrame:
    """Calcula avg/max/min de temperatura, humedad y gas agrupando por cols."""
    return (
        df.groupBy(*cols_grupo)
        .agg(
            F.round(F.avg("temperatura"), 2).alias("temp_prom"),
            F.round(F.max("temperatura"), 2).alias("temp_max"),
            F.round(F.min("temperatura"), 2).alias("temp_min"),
            F.round(F.avg("humedad"), 2).alias("hum_prom"),
            F.round(F.max("humedad"), 2).alias("hum_max"),
            F.round(F.min("humedad"), 2).alias("hum_min"),
            F.round(F.avg("gas"), 1).alias("gas_prom"),
            F.max("gas").alias("gas_max"),
            F.min("gas").alias("gas_min"),
            F.count("*").alias("n_lecturas"),
        )
    )


def agregados_por_hora(df: DataFrame) -> DataFrame:
    return _agregados(df, "fecha_d", "hora").orderBy("fecha_d", "hora")


def agregados_por_dia(df: DataFrame) -> DataFrame:
    return _agregados(df, "fecha_d", "dia_semana").orderBy("fecha_d")


# ----------------------------------------------------------------------
# Días extremos (más calurosos / más fríos)
# ----------------------------------------------------------------------
def dias_extremos(agg_dia: DataFrame) -> DataFrame:
    """Ordena los días por temperatura promedio para ver extremos."""
    return agg_dia.select("fecha_d", "dia_semana", "temp_prom", "temp_max", "temp_min") \
                  .orderBy(F.desc("temp_prom"))


# ----------------------------------------------------------------------
# Franja horaria más calurosa de cada día
# ----------------------------------------------------------------------
def franja_mas_calurosa(agg_hora: DataFrame) -> DataFrame:
    """
    Para cada día, encuentra la hora con mayor temperatura promedio.
    Usa una función de ventana (window) para rankear horas dentro del día.
    """
    from pyspark.sql.window import Window

    w = Window.partitionBy("fecha_d").orderBy(F.desc("temp_prom"))
    return (
        agg_hora
        .withColumn("rank", F.row_number().over(w))
        .filter(F.col("rank") == 1)
        .select(
            "fecha_d",
            F.col("hora").alias("hora_mas_calurosa"),
            "temp_prom",
            "gas_prom",
        )
        .orderBy("fecha_d")
    )


# ----------------------------------------------------------------------
# Correlaciones temp/humedad vs gas
# ----------------------------------------------------------------------
def correlaciones(df: DataFrame) -> DataFrame:
    """
    Correlación de Pearson entre gas y las otras variables.
    Valores cercanos a  1/-1 => relación fuerte;  0 => sin relación lineal.
    """
    corr_temp_gas = df.stat.corr("temperatura", "gas")
    corr_hum_gas  = df.stat.corr("humedad", "gas")
    corr_temp_hum = df.stat.corr("temperatura", "humedad")

    spark = df.sparkSession
    return spark.createDataFrame(
        [
            ("temperatura_vs_gas", round(corr_temp_gas or 0.0, 4)),
            ("humedad_vs_gas",     round(corr_hum_gas or 0.0, 4)),
            ("temperatura_vs_humedad", round(corr_temp_hum or 0.0, 4)),
        ],
        ["par_variables", "correlacion_pearson"],
    )


# ----------------------------------------------------------------------
# Comparativa: gas promedio por día y franja horaria
# ----------------------------------------------------------------------
def comparativa_gas_por_franja(df: DataFrame) -> DataFrame:
    """
    Divide el día en franjas y calcula el gas promedio por (día, franja).
    Permite frases como: "el martes 14-16h hubo mayor gas que el resto".
    """
    df_franja = df.withColumn(
        "franja",
        F.when(F.col("hora").between(0, 5), "00-06 madrugada")
         .when(F.col("hora").between(6, 11), "06-12 mañana")
         .when(F.col("hora").between(12, 13), "12-14 mediodía")
         .when(F.col("hora").between(14, 16), "14-16 tarde")
         .when(F.col("hora").between(17, 20), "17-21 tarde-noche")
         .otherwise("21-24 noche"),
    )
    return (
        df_franja.groupBy("dia_semana", "franja")
        .agg(
            F.round(F.avg("gas"), 1).alias("gas_prom"),
            F.round(F.avg("temperatura"), 2).alias("temp_prom"),
            F.count("*").alias("n_lecturas"),
        )
        .orderBy(F.desc("gas_prom"))
    )


# ----------------------------------------------------------------------
# Utilidad: guardar como un único CSV legible (coalesce(1))
# ----------------------------------------------------------------------
def guardar_csv(df: DataFrame, nombre: str) -> None:
    """
    Guarda el DataFrame como CSV. Spark escribe una carpeta;
    convertimos a pandas (datasets pequeños) para un CSV plano que
    el dashboard lee sin fricción.
    """
    ruta = config.RESULTADOS_DIR / f"{nombre}.csv"
    df.toPandas().to_csv(ruta, index=False, encoding="utf-8")
    print(f"  -> guardado {ruta.name}")


# ----------------------------------------------------------------------
# Exportación a Supabase (OPCIÓN B: Spark -> Supabase -> frontend)
# ----------------------------------------------------------------------
DIAS_ES = {
    "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
    "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado",
    "Sunday": "Domingo",
}


def _estado_aire(gas_max: int) -> str:
    """Clasifica el día según el pico de gas (mismos umbrales que el dashboard)."""
    if gas_max < config.GAS_UMBRAL_BUENO:
        return "Óptimo"
    if gas_max < config.GAS_UMBRAL_MODERADO:
        return "Moderado"
    return "Alerta"


def exportar_a_supabase(agg_dia: DataFrame, corr: DataFrame) -> None:
    """
    Sube los agregados diarios a la tabla 'agregados_diarios' y las
    correlaciones a 'metricas_globales' de Supabase, mediante UPSERT
    (idempotente: recalcular y volver a subir no duplica filas).
    El frontend React lee esas tablas para las comparativas históricas.
    """
    try:
        import supa_rest
    except ModuleNotFoundError:
        import sys as _sys
        from pathlib import Path as _Path
        _sys.path.append(str(_Path(__file__).resolve().parent.parent))
        import supa_rest

    config.validar_credenciales()

    # --- agregados_diarios ---
    pdf = agg_dia.toPandas()
    registros = [
        {
            "fecha": str(r["fecha_d"]),
            "dia_semana": DIAS_ES.get(str(r["dia_semana"]), str(r["dia_semana"])),
            "temp_min": float(r["temp_min"]),
            "temp_max": float(r["temp_max"]),
            "temp_prom": float(r["temp_prom"]),
            "hum_prom": float(r["hum_prom"]),
            "gas_prom": float(r["gas_prom"]),
            "gas_max": int(r["gas_max"]),
            "n_lecturas": int(r["n_lecturas"]),
            "estado": _estado_aire(int(r["gas_max"])),
        }
        for _, r in pdf.iterrows()
    ]
    if registros:
        supa_rest.upsert("agregados_diarios", registros, on_conflict="fecha")
        print(f"  -> {len(registros)} filas -> agregados_diarios (Supabase)")

    # --- metricas_globales (correlaciones) ---
    textos = {
        "temperatura_vs_gas": "Correlación temperatura vs gas",
        "humedad_vs_gas": "Correlación humedad vs gas",
        "temperatura_vs_humedad": "Correlación temperatura vs humedad",
    }
    cpdf = corr.toPandas()
    metricas = [
        {
            "clave": r["par_variables"],
            "valor": float(r["correlacion_pearson"]),
            "texto": textos.get(r["par_variables"], r["par_variables"]),
        }
        for _, r in cpdf.iterrows()
    ]
    if metricas:
        supa_rest.upsert("metricas_globales", metricas, on_conflict="clave")
        print(f"  -> {len(metricas)} métricas -> metricas_globales (Supabase)")


# ----------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------
def main() -> None:
    # Cargar el Parquet con pandas ANTES de iniciar la JVM de Spark.
    # (En Windows la JVM puede romper las DLLs de pyarrow; leyendo antes lo evitamos.)
    import glob
    import os
    import pandas as pd
    pdf = None
    try:
        # Leemos cada archivo .parquet por separado y concatenamos. La fecha
        # se deriva luego de created_at, así que no dependemos de la columna
        # de partición ni de la lectura de directorios (más robusto en Windows).
        archivos = glob.glob(
            os.path.join(str(config.LANDING_DIR), "**", "*.parquet"), recursive=True
        )
        if archivos:
            pdf = pd.concat([pd.read_parquet(f) for f in archivos], ignore_index=True)
            print(f"Parquet cargado con pandas: {len(pdf)} filas de {len(archivos)} archivo(s).")
    except Exception as e:  # noqa: BLE001
        print("  pandas no pudo leer Parquet:", str(e)[:150], "-> se intentará lectura nativa de Spark")

    spark = crear_spark()
    spark.sparkContext.setLogLevel("WARN")

    df = leer_datos(spark, pdf)
    total = df.count()
    if total == 0:
        print("No hay datos en la zona de aterrizaje. Ejecuta primero la ingesta (Capa 1).")
        spark.stop()
        return

    print(f"Procesando {total} lecturas limpias...\n")

    agg_hora = agregados_por_hora(df).cache()
    agg_dia  = agregados_por_dia(df).cache()

    print("== Agregados por día ==")
    agg_dia.show(truncate=False)

    print("== Días más calurosos (top) ==")
    dias_extremos(agg_dia).show(truncate=False)

    print("== Franja más calurosa por día ==")
    franjas = franja_mas_calurosa(agg_hora)
    franjas.show(truncate=False)

    print("== Correlaciones ==")
    corr = correlaciones(df)
    corr.show(truncate=False)

    print("== Comparativa gas por día y franja (top) ==")
    comp = comparativa_gas_por_franja(df)
    comp.show(10, truncate=False)

    # Persistir todo para el dashboard
    print("\nGuardando resultados en", config.RESULTADOS_DIR)
    guardar_csv(agg_hora, "agregados_por_hora")
    guardar_csv(agg_dia, "agregados_por_dia")
    guardar_csv(dias_extremos(agg_dia), "dias_extremos")
    guardar_csv(franjas, "franjas_calor")
    guardar_csv(corr, "correlaciones")
    guardar_csv(comp, "comparativa_gas_dia_franja")

    # Exportar a Supabase para que el dashboard React lo consuma (opción B)
    print("\nExportando agregados a Supabase (para el dashboard)...")
    try:
        exportar_a_supabase(agg_dia, corr)
    except Exception as e:  # noqa: BLE001 - no queremos que falle todo el batch
        print("  Aviso: no se pudo exportar a Supabase:", e)

    print("\nAnálisis batch completado.")
    spark.stop()


if __name__ == "__main__":
    main()
