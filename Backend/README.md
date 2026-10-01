# Sistema de Monitoreo Atmosférico Inteligente — Backend

Pipeline de datos en 3 capas para un proyecto de **Analítica con Big Data**.
Toma lecturas de un **ESP32 (DHT22 + MQ-135)** almacenadas en **Supabase**,
las limpia, las procesa con **PySpark** y las publica de vuelta en Supabase para
que las consuma el **dashboard React** (carpeta `frontend/`).

> **Capa 3 (dashboard):** es una app **React + Vite** en `../frontend/`, no Python.
> Este backend solo cubre las Capas 1 y 2 (ingesta/limpieza y procesamiento Spark).

---

## 🏗️ Arquitectura

```
   ESP32 (DHT22 + MQ-135)
        │  HTTP POST cada 15 s
        ▼
   ┌───────────────────────┐
   │   Supabase (Postgres) │   tabla: lecturas_sensores
   └───────────┬───────────┘
               │  polling / micro-batch (supabase-py)
               ▼
   ┌─────────────────────────────────────┐
   │ CAPA 1 · INGESTA + LIMPIEZA (pandas) │  ingesta/limpieza.py
   │  nulos · duplicados · outliers       │
   └───────────┬─────────────────────────┘
               │  escribe Parquet particionado por fecha
               ▼
   ┌───────────────────────────┐
   │  datos/limpios/  (Parquet) │  ← "zona de aterrizaje" / data lake
   └───────┬───────────────┬───┘
           │               │
   (file source)      (lectura batch)
           │               │
           ▼               ▼
 ┌──────────────────┐  ┌────────────────────────────┐
 │ CAPA 2-B         │  │ CAPA 2-A                     │
 │ STRUCTURED       │  │ ANÁLISIS BATCH               │
 │ STREAMING        │  │ analisis_spark.py            │
 │ streaming_spark  │  │  agregados hora/día          │
 │  ventanas 1 h    │  │  días extremos · franjas     │
 └────────┬─────────┘  │  correlaciones · comparativas│
          │            └───────────────┬──────────────┘
          │  ventanas_horarias.csv     │ agregados -> Supabase
          ▼                            ▼   (tablas agregados_diarios / metricas_globales)
   ┌─────────────────────────────────────────────┐
   │ CAPA 3 · DASHBOARD (React + Vite)  ../frontend│
   │  · En vivo: lee lecturas_sensores de Supabase │
   │  · Comparativas: lee los agregados de Supabase│
   └─────────────────────────────────────────────┘
```

### ¿Por qué cada herramienta?

| Capa | Herramienta | Razón |
|------|-------------|-------|
| Ingesta | `supabase-py` + `pandas` → Parquet | Simple, sin configurar JDBC; pandas es ideal para limpieza; Parquet es el formato nativo de Spark. |
| Procesamiento | **PySpark** (batch + Structured Streaming) | Requisito del curso; el batch hace las comparativas históricas, el streaming procesa lo nuevo casi en tiempo real. |
| Dashboard | **React + Vite** (carpeta `../frontend/`) | Lee Supabase directo (Realtime/polling en vivo + tablas de agregados). Sin servidor Python. |

### Decisión clave: streaming vs. polling

**Spark Structured Streaming NO puede leer directo de Supabase vía JDBC**
(el conector JDBC de Spark es solo batch; Postgres no es fuente de streaming).
Por eso:

- **Ingesta = micro-batch con polling** (correcto, la fuente no es streaming nativo).
- **Procesamiento = Structured Streaming real** usando el *file source*: Spark
  vigila la carpeta `datos/limpios/` y procesa cada Parquet nuevo automáticamente.

Esto cumple el requisito de "usar Structured Streaming" de forma técnicamente honesta.

---

## 📁 Estructura

```
Backend/
├── config.py                  # Rutas, umbrales y credenciales centralizados
├── requirements.txt           # Dependencias
├── .env.example               # Plantilla de credenciales (copiar a .env)
├── ingesta/
│   └── limpieza.py            # CAPA 1: ingesta + limpieza desde Supabase
├── procesamiento/
│   ├── analisis_spark.py      # CAPA 2-A: comparativas batch (+ sube agregados a Supabase)
│   └── streaming_spark.py     # CAPA 2-B: Structured Streaming
├── supa_rest.py               # Helper de escritura a Supabase vía REST
├── sql/                       # Esquemas y políticas para el SQL Editor de Supabase
├── utilidades/
│   └── generar_datos_prueba.py# Datos sintéticos para probar sin el ESP32
└── datos/                     # (generado) data lake local
    ├── limpios/               #   Parquet limpio particionado por fecha
    ├── resultados/            #   CSV de las comparativas batch
    └── stream_salida/         #   CSV de las ventanas del streaming
```

---

## 🚀 Puesta en marcha

### 1. Requisitos previos
- **Python 3.9–3.11** (PySpark aún no soporta bien 3.12+).
- **Java 8, 11 o 17** instalado y en el `PATH` (Spark lo necesita).
  Verifica con: `java -version`

### 2. Instalación
```powershell
cd "Backend"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Credenciales
```powershell
copy .env.example .env
# Edita .env con tu SUPABASE_URL y SUPABASE_KEY
```

---

## ▶️ Orden de ejecución

> Ejecuta cada comando **desde la carpeta `Backend/`** con el entorno virtual activo.
> Los que dicen "déjalo corriendo" van en su **propia terminal**.

### (Opcional) Generar datos de prueba
Si aún no tienes datos del ESP32:
```powershell
# 3 días de historial (para las comparativas)
python -m utilidades.generar_datos_prueba --dias 3

# y/o simular el ESP32 en vivo (otra terminal)
python -m utilidades.generar_datos_prueba --vivo
```

### Paso 1 — Ingesta (Capa 1)  · déjalo corriendo
```powershell
python -m ingesta.limpieza
```
Lee de Supabase cada 30 s y escribe Parquet limpio en `datos/limpios/`.
Para una sola pasada: `python -m ingesta.limpieza --una-vez`

### Paso 2 — Procesamiento (Capa 2)

**2-A · Comparativas batch** (ejecútalo cuando quieras recalcular):
```powershell
python -m procesamiento.analisis_spark
```
Genera los CSV en `datos/resultados/`.

**2-B · Structured Streaming** (opcional, en vivo) · déjalo corriendo:
```powershell
python -m procesamiento.streaming_spark
```

### Paso 3 — Dashboard (Capa 3 · React)  · déjalo corriendo
El dashboard vive en la carpeta `../frontend/` (app React). En otra terminal:
```powershell
cd ..\frontend
pnpm install     # solo la primera vez
pnpm dev
```
Abre `http://localhost:5173`. Se actualiza en vivo (Realtime/polling de Supabase).
Ver `frontend/README.md` para el detalle.

---

## 🔄 Cómo se conectan los componentes

1. El **ESP32** inserta lecturas en **Supabase** (ya funciona).
2. La **Capa 1** hace *polling* a Supabase, limpia y deposita **Parquet** en
   `datos/limpios/` (el "contrato" de datos entre capas).
3. La **Capa 2** lee ese Parquet:
   - el **batch** produce comparativas (CSV en `datos/resultados/`) y **sube los
     agregados a Supabase** (`agregados_diarios`, `metricas_globales`),
   - el **streaming** produce ventanas horarias (CSV en `datos/stream_salida/`).
4. La **Capa 3** (dashboard React) combina dos fuentes, ambas desde Supabase:
   - **en vivo** → lee `lecturas_sensores` (lo que capta el ESP32 ahora),
   - **comparativas** → lee las tablas de agregados que dejó la Capa 2.

El **Parquet particionado es el punto de desacople**: la ingesta y el
procesamiento no se conocen entre sí, solo comparten esa carpeta. Eso es
justamente el patrón de un data lake / arquitectura de Big Data.

---

## ⚠️ Notas

- Los **umbrales del semáforo** (MQ-135) en `config.py` son ilustrativos sobre
  el valor ADC crudo (0–4095). Para ppm reales hay que **calibrar** el sensor
  (resistencia R0 en aire limpio). Ajusta `GAS_UMBRAL_BUENO/MODERADO`.
- Los **rangos de outliers** (temperatura, humedad, gas) también están en
  `config.py`; cámbialos según tu entorno.
- En Windows, si Spark se queja de `winutils`/`HADOOP_HOME`, para un proyecto
  local suele bastar con instalar Java; consulta el error concreto si aparece.
