"""
config.py
==========================================================
Configuración central del proyecto.

Aquí viven TODAS las rutas y parámetros compartidos por las 3 capas
(ingesta, procesamiento y dashboard). Cambiar un umbral o una ruta
en un solo lugar evita inconsistencias entre scripts.
==========================================================
"""
from pathlib import Path
import os

from dotenv import load_dotenv

# ----------------------------------------------------------------------
# Carga de variables de entorno (.env ubicado junto a este archivo)
# ----------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

# ----------------------------------------------------------------------
# Credenciales de Supabase
# ----------------------------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
TABLA_LECTURAS = os.getenv("TABLA_LECTURAS", "lecturas_sensores")

# ----------------------------------------------------------------------
# Rutas del "data lake" local (zona de aterrizaje que consume Spark)
# ----------------------------------------------------------------------
DATA_DIR          = BASE_DIR / "datos"
LANDING_DIR       = DATA_DIR / "limpios"        # Parquet limpio particionado por fecha (fuente del streaming)
RESULTADOS_DIR    = DATA_DIR / "resultados"     # Salidas de las comparativas (batch)
STREAM_OUT_DIR    = DATA_DIR / "stream_salida"  # Salidas del Structured Streaming
CHECKPOINT_DIR    = DATA_DIR / "checkpoints"    # Checkpoints obligatorios de Spark Streaming
WATERMARK_FILE    = DATA_DIR / "_watermark.txt" # Marca de agua para la ingesta incremental

# Crear las carpetas si no existen
for _d in (DATA_DIR, LANDING_DIR, RESULTADOS_DIR, STREAM_OUT_DIR, CHECKPOINT_DIR):
    _d.mkdir(parents=True, exist_ok=True)

# ----------------------------------------------------------------------
# Parámetros de la INGESTA (Capa 1)
# ----------------------------------------------------------------------
INTERVALO_POLLING_SEG = 30        # Cada cuántos segundos hace polling la ingesta
TAMANIO_LOTE          = 1000      # Filas máximas por consulta a Supabase

# ----------------------------------------------------------------------
# Reglas de LIMPIEZA / rangos físicos válidos de los sensores (Capa 1)
# ----------------------------------------------------------------------
# DHT22: rango físico del datasheet -40..80 °C, 0..100 % HR.
# Acotamos a un rango urbano realista para descartar fallos del sensor.
TEMP_MIN, TEMP_MAX = -10.0, 60.0     # °C plausibles en ambiente urbano
HUM_MIN,  HUM_MAX  = 0.0, 100.0      # % humedad relativa
# MQ-135 leído por ADC de 12 bits del ESP32 => valores crudos 0..4095.
GAS_MIN,  GAS_MAX  = 0, 4095

# ----------------------------------------------------------------------
# Umbrales del SEMÁFORO de calidad del aire (Capa 3) - valor crudo MQ-135
# ----------------------------------------------------------------------
# OJO: son valores ILUSTRATIVOS. El MQ-135 requiere calibración real
# (resistencia R0 en aire limpio) para convertir a ppm. Ajusta según
# tu calibración. Aquí trabajamos sobre el valor ADC crudo (0..4095).
GAS_UMBRAL_BUENO    = 1200    # < 1200  => Verde  (aire bueno)
GAS_UMBRAL_MODERADO = 2500    # 1200..2500 => Amarillo (moderado)
#                              # > 2500  => Rojo (malo)


def validar_credenciales() -> None:
    """Falla temprano y con un mensaje claro si faltan credenciales."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError(
            "Faltan credenciales de Supabase. Copia .env.example a .env "
            "y rellena SUPABASE_URL y SUPABASE_KEY."
        )
