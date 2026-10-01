# Sistema de Monitoreo Atmosférico Inteligente

Captura datos de un **ESP32** (temperatura, humedad y calidad del aire MQ-135),
los limpia, los analiza con **PySpark** y los muestra en un **dashboard React**.
Todo se comunica a través de una base de datos **Supabase**.

```
  ESP32  ──►  SUPABASE  ──►  INGESTA (Capa 1)  ──►  ANÁLISIS PySpark (Capa 2)
 (sensor)    (base de       limpia y guarda         agregados/comparativas
             datos)         Parquet local           ──► suben a Supabase
                                                            │
                                   DASHBOARD React (Capa 3) ◄┘
                                   https://monitoreoambiental.pages.dev/
                                   (lee de Supabase)
```

| Capa | Qué hace | Tipo | Carpeta |
|------|----------|------|---------|
| **1 — Ingesta** | Lee lo que el ESP32 manda a Supabase, lo limpia y lo guarda en Parquet | Servicio continuo | `Backend/ingesta/` |
| **2 — Análisis** | Calcula agregados y comparativas con PySpark y los sube a Supabase | Bajo demanda (batch) | `Backend/procesamiento/` |
| **3 — Dashboard** | Muestra telemetría en vivo y comparativas | App web (hospedada) | `frontend/` |

---

## 1. Requisitos previos (instalar en una máquina nueva)

Antes de tocar el proyecto, instala estas herramientas del sistema:

| Herramienta | Versión recomendada | Para qué | Cómo comprobar |
|-------------|--------------------|----------|----------------|
| **Python** | 3.11 o superior | Capas 1 y 2 (ingesta + análisis) | `python --version` |
| **Java (JDK)** | **JDK 17** (obligatorio) | PySpark necesita Java para ejecutarse | `java -version` |
| **Node.js** | 20 o superior | Dashboard (solo si lo corres en local) | `node --version` |
| **pnpm** | 9 o superior | Gestor de paquetes del frontend | `pnpm --version` |
| **Cuenta Supabase** | — | Base de datos en la nube | — |

> **Java es imprescindible para la Capa 2.** Si `java -version` falla, instala el
> JDK 17 (Temurin / Adoptium o el de Oracle) y asegúrate de tener la variable
> de entorno `JAVA_HOME` apuntando a la carpeta del JDK. Sin Java, PySpark no arranca.
>
> `pnpm` se instala con: `npm install -g pnpm`

---

## 2. Dependencias que instala el BACKEND

El backend instala estos paquetes de Python (archivo `Backend/requirements.txt`):

| Paquete | Capa | Para qué sirve |
|---------|------|----------------|
| `supabase` (≥2.4) | 1 | Cliente oficial de Supabase (leer/escribir en la BD) |
| `pandas` (≥2.0) | 1 | Limpieza y manipulación de datos |
| `pyarrow` (≥14.0) | 1 | Motor del formato **Parquet** (lo que consume PySpark) |
| `python-dotenv` (≥1.0) | 1 | Carga las credenciales desde el archivo `.env` |
| `pyspark` (≥3.5) | 2 | Motor de procesamiento (batch + streaming) |

El **frontend** no usa Python; sus dependencias (React, Vite, Tailwind, supabase-js)
se instalan aparte con `pnpm install` (ver paso 4.4).

---

## 3. Qué ejecutar PRIMERO en una máquina nueva (paso a paso)

### 3.1. Copiar el proyecto
Copia o clona esta carpeta completa en la máquina nueva.

### 3.2. Preparar Supabase (la base de datos) — se hace UNA sola vez
1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En Supabase, abre **SQL Editor** y ejecuta, **en este orden**, el contenido de:
   1. `Backend/sql/esquema_supabase.sql`  → crea las tablas (`lecturas_sensores`, `agregados_diarios`, `metricas_globales`).
   2. `Backend/sql/politicas_escritura_demo.sql`  → activa los permisos (RLS) para lectura pública y escritura.
3. En **Project Settings → API** copia dos valores que usarás abajo:
   - **Project URL**  (ej: `https://xxxxx.supabase.co`)
   - **anon / service_role key**

> `Backend/sql/limpiar_datos.sql` es opcional: sirve para **vaciar** las tablas
> si alguna vez quieres empezar de cero. No lo ejecutes en el primer arranque.

### 3.3. Preparar el BACKEND (Capas 1 y 2)
Desde la carpeta `Backend/`:

**PowerShell:**
```powershell
cd Backend
python -m venv .venv                 # 1) crear entorno virtual
.venv\Scripts\Activate.ps1           # 2) activarlo
pip install -r requirements.txt      # 3) instalar dependencias (tabla del punto 2)
copy .env.example .env               # 4) crear el archivo de credenciales
```

**Git Bash:**
```bash
cd Backend
python -m venv .venv
source .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env
```

Luego **edita `Backend/.env`** y rellena con tus datos de Supabase:
```
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_KEY=TU_CLAVE_ANON_O_SERVICE_ROLE
TABLA_LECTURAS=lecturas_sensores
```

### 3.4. Preparar el FRONTEND (solo si vas a correr el dashboard en local)
> El dashboard ya está hospedado en **https://monitoreoambiental.pages.dev/**,
> así que este paso es opcional (solo para desarrollo local).

Desde la carpeta `frontend/`:
```bash
cd frontend
pnpm install                         # instala React, Vite, Tailwind, etc.
cp .env.example .env.local           # (en PowerShell: copy .env.example .env.local)
```
Edita `frontend/.env.local` con **la clave anon** (nunca la service_role):
```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_CLAVE_ANON
VITE_TABLA_LECTURAS=lecturas_sensores
```

---

## 4. Uso diario (una vez instalado)

La forma más fácil: **doble clic** en los `.bat` de la raíz / carpetas.

| Acción | Qué ejecutar | Qué hace |
|--------|--------------|----------|
| **Encender todo** | `prender_server.bat` (raíz) | Arranca la ingesta y abre el dashboard hospedado |
| **Solo la ingesta** | `Backend\iniciar_ingesta.bat` | Captura + limpia lo del ESP32 (bucle con auto-reinicio) |
| **Refrescar comparativas** | `Backend\correr_analisis.bat` | Corre el análisis PySpark y sube agregados a Supabase |
| **Dashboard en local** | `frontend\iniciar_dashboard.bat` | Abre el dashboard en `http://localhost:5173/` |

### Equivalente por comandos (desde `Backend/`, con el venv activado)
```bash
python -m ingesta.limpieza              # Capa 1 — ingesta continua
python -m ingesta.limpieza --una-vez    # Capa 1 — una sola pasada (para probar)
python -m procesamiento.analisis_spark  # Capa 2 — análisis batch (bajo demanda)
python -m procesamiento.streaming_spark # Capa 2-B — streaming (opcional)
```

> **Importante:** siempre con el entorno virtual activado, o usando el Python del
> venv directamente (`.venv\Scripts\python.exe -m ...`). Si no, verás el error
> `ModuleNotFoundError: No module named 'supabase'` (ver más abajo).

---

## 5. Estructura del proyecto

```
SistemadeMonitoreoAtmosfericoInteligente/
├─ prender_server.bat            ← Enciende ingesta + abre dashboard
├─ README.md                     ← Este archivo
├─ Backend/
│  ├─ requirements.txt           ← Dependencias Python
│  ├─ config.py                  ← Umbrales y configuración
│  ├─ .env                       ← Tus credenciales (NO se sube a git)
│  ├─ iniciar_ingesta.bat        ← Lanzador de la Capa 1
│  ├─ correr_analisis.bat        ← Lanzador de la Capa 2 (batch)
│  ├─ ingesta/limpieza.py        ← CAPA 1: ingesta + limpieza
│  ├─ procesamiento/
│  │  ├─ analisis_spark.py       ← CAPA 2-A: análisis batch
│  │  └─ streaming_spark.py      ← CAPA 2-B: streaming (opcional)
│  ├─ sql/                       ← Scripts SQL de Supabase
│  └─ datos/
│     ├─ limpios/                ← Parquet limpio (entrada del análisis)
│     └─ resultados/             ← CSV de resultados del análisis
└─ frontend/                     ← CAPA 3: dashboard React (Vite + Tailwind)
   ├─ iniciar_dashboard.bat
   └─ .env.local                 ← Credenciales del dashboard (clave anon)
```

---

## 6. Problemas frecuentes

- **`ModuleNotFoundError: No module named 'supabase'`**
  El entorno virtual no está activado (estás usando el Python del sistema).
  Solución: activa el venv (`source .venv/Scripts/activate` en Git Bash,
  `.venv\Scripts\Activate.ps1` en PowerShell) o usa `.venv\Scripts\python.exe -m ...`.
  El `.bat` ya lo hace automáticamente.

- **PySpark no arranca / error de Java**
  Falta el JDK o `JAVA_HOME`. Instala JDK 17 y vuelve a intentar.

- **El contador de "paquetes" del dashboard baja al recargar**
  No es un error ni pérdida de datos. El contador muestra las lecturas de la
  **ventana en vivo** (última hora por defecto). Si el ESP32 dejó de enviar, las
  lecturas viejas van saliendo de esa ventana. Cambia el selector a "Últimas 6/24
  horas" para ver el histórico completo, o enciende el ESP32.

- **Los datos no se duplican**
  La ingesta usa una **marca de agua** (`datos/_watermark.txt`) para leer solo lo
  nuevo, y el análisis usa **UPSERT** en Supabase. No borres el `_watermark.txt`
  salvo que quieras reprocesar todo el histórico a propósito.
