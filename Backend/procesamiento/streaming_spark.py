"""
procesamiento/streaming_spark.py
==========================================================
CAPA 2 (parte B) - PROCESAMIENTO EN TIEMPO CASI REAL  [STRUCTURED STREAMING]
==========================================================
Este script demuestra Spark Structured Streaming REAL usando el
"file source": Spark VIGILA la carpeta datos/limpios/ y procesa
automáticamente cada archivo Parquet nuevo que la Capa 1 deposita.

  ¿Por qué NO leemos directo de Supabase con streaming?
  ---------------------------------------------------------
  Spark Structured Streaming NO soporta JDBC como fuente de streaming
  (no existe readStream.format("jdbc")). Postgres no expone offsets que
  Spark pueda rastrear. Las únicas fuentes de streaming nativas son
  Kafka, sockets, ficheros (file source), Kinesis, etc.

  Por eso el patrón correcto y honesto es:
     Supabase --(polling/micro-batch, Capa 1)--> Parquet --(file source)--> Spark Streaming
  Así el requisito de "Structured Streaming" se cumple de verdad.

Calcula agregados por VENTANAS DE TIEMPO deslizantes (ventana de 1 hora,
con watermark de tolerancia a datos que llegan tarde) y:
  - los imprime por consola, y
  - los escribe (foreachBatch) a datos/stream_salida/ventanas_horarias.csv
    para que el dashboard muestre lo "casi en vivo" ya agregado.

Uso:
  python -m procesamiento.streaming_spark
  (déjalo corriendo en su propia terminal; se actualiza solo)
==========================================================
"""
from __future__ import annotations

import sys

from pyspark.sql import SparkSession, DataFrame
from pyspark.sql import functions as F
from pyspark.sql.types import (
    StructType, StructField, LongType, DoubleType, IntegerType, TimestampType, StringType,
)

try:
    import config
except ModuleNotFoundError:  # pragma: no cover
    from pathlib import Path
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    import config


# El file source de streaming EXIGE un esquema explícito (no puede inferirlo
# de forma segura entre micro-batches). Debe coincidir con el Parquet de Capa 1.
ESQUEMA = StructType([
    StructField("id", LongType(), True),
    StructField("temperatura", DoubleType(), True),
    StructField("humedad", DoubleType(), True),
    StructField("gas", LongType(), True),
    StructField("created_at", TimestampType(), True),
    # 'fecha' es la columna de partición; Spark la reconstruye de la ruta.
    StructField("fecha", StringType(), True),
])


def crear_spark() -> SparkSession:
    return (
        SparkSession.builder
        .appName("MonitoreoAtmosferico-Streaming")
        .master("local[*]")
        .config("spark.sql.shuffle.partitions", "8")
        .config("spark.sql.session.timeZone", "UTC")
        .getOrCreate()
    )


def construir_stream(spark: SparkSession) -> DataFrame:
    """Define el stream de lectura sobre la carpeta Parquet (file source)."""
    lecturas = (
        spark.readStream
        .schema(ESQUEMA)
        .option("maxFilesPerTrigger", 5)   # cuántos archivos procesa por micro-batch
        .parquet(str(config.LANDING_DIR))
    )

    # Agregación por ventana temporal de 1 hora con watermark de 10 min
    # (tolera lecturas que lleguen hasta 10 min tarde sin romper el estado).
    agregado = (
        lecturas
        .withWatermark("created_at", "10 minutes")
        .groupBy(F.window("created_at", "1 hour"))
        .agg(
            F.round(F.avg("temperatura"), 2).alias("temp_prom"),
            F.round(F.max("temperatura"), 2).alias("temp_max"),
            F.round(F.min("temperatura"), 2).alias("temp_min"),
            F.round(F.avg("humedad"), 2).alias("hum_prom"),
            F.round(F.avg("gas"), 1).alias("gas_prom"),
            F.max("gas").alias("gas_max"),
            F.count("*").alias("n_lecturas"),
        )
        .select(
            F.col("window.start").alias("ventana_inicio"),
            F.col("window.end").alias("ventana_fin"),
            "temp_prom", "temp_max", "temp_min",
            "hum_prom", "gas_prom", "gas_max", "n_lecturas",
        )
    )
    return agregado


def escribir_lote(batch_df: DataFrame, batch_id: int) -> None:
    """
    foreachBatch: en cada micro-batch persistimos el estado agregado
    completo a un CSV plano que el dashboard lee. (El modo 'complete'
    reescribe todas las ventanas, así el CSV siempre está al día.)
    """
    if batch_df.rdd.isEmpty():
        return
    ruta = config.STREAM_OUT_DIR / "ventanas_horarias.csv"
    (
        batch_df.orderBy("ventana_inicio")
        .toPandas()
        .to_csv(ruta, index=False, encoding="utf-8")
    )
    print(f"[micro-batch {batch_id}] {batch_df.count()} ventanas actualizadas -> {ruta.name}")


def main() -> None:
    spark = crear_spark()
    spark.sparkContext.setLogLevel("WARN")

    agregado = construir_stream(spark)

    query = (
        agregado.writeStream
        .outputMode("complete")            # recalcula todas las ventanas cada trigger
        .foreachBatch(escribir_lote)       # persiste a CSV para el dashboard
        .option("checkpointLocation", str(config.CHECKPOINT_DIR / "streaming"))
        .trigger(processingTime="15 seconds")   # frecuencia de los micro-batches
        .start()
    )

    print("Structured Streaming activo. Vigilando:", config.LANDING_DIR)
    print("Ctrl+C para detener.")
    try:
        query.awaitTermination()
    except KeyboardInterrupt:
        print("\nDeteniendo streaming...")
        query.stop()
        spark.stop()


if __name__ == "__main__":
    main()
