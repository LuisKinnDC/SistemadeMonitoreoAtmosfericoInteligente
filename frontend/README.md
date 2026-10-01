# Dashboard React — Sistema de Monitoreo Atmosférico Inteligente

Capa 3 (frontend) del proyecto. App **React + Vite + Tailwind** que muestra la
telemetría del ESP32 en tiempo real y las comparativas históricas.

Portado desde el diseño original `archivos/UI.html` (que se conserva como
referencia visual) a componentes React conectados a **Supabase**.

## Stack
- **React 18 + Vite** (gestor de paquetes: **pnpm**)
- **Tailwind CSS** (theme Material portado del diseño original)
- **@supabase/supabase-js** (consultas + Realtime por WebSocket)

## De dónde salen los datos (arquitectura, opción B)
```
ESP32 → Supabase (lecturas_sensores)
                │
      ┌─────────┴───────────┐
      │ EN VIVO             │ COMPARATIVAS
      │ (Realtime/polling)  │ (leídas de Supabase)
      ▼                     ▼
  KPIs + gráfico      agregados_diarios + metricas_globales
  en tiempo real      ← poblados por PySpark (Backend/procesamiento/analisis_spark.py)
```
- **Datos en vivo**: el frontend lee `lecturas_sensores` directo de Supabase
  (suscripción Realtime a nuevos INSERT; si Realtime no está habilitado, hace
  *polling* automático cada 15 s).
- **Comparativas**: PySpark procesa el histórico y **escribe** los agregados en
  las tablas `agregados_diarios` y `metricas_globales`; el frontend las lee.

## Puesta en marcha

### 1. Requisitos
- **Node.js 18+** y **pnpm** (`npm install -g pnpm` si no lo tienes).

### 2. Instalar dependencias
```powershell
cd frontend
pnpm install
```

### 3. Credenciales
```powershell
copy .env.example .env.local
# Edita .env.local con tu VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (clave publishable/anon)
```

### 4. Tablas en Supabase (para las comparativas)
En el **SQL Editor** de Supabase, ejecuta una vez:
`Backend/sql/esquema_supabase.sql`
(crea `agregados_diarios`, `metricas_globales`, políticas de lectura y activa
Realtime en `lecturas_sensores`).

### 5. Arrancar en desarrollo
```powershell
pnpm dev
```
Abre `http://localhost:5173`.

### 6. Build de producción (opcional)
```powershell
pnpm build      # genera /dist
pnpm preview    # sirve el build para probarlo
```

## Estructura
```
frontend/
├── index.html               # HTML raíz (fuentes + iconos)
├── tailwind.config.js       # theme Material portado del diseño
├── .env.example             # plantilla de credenciales
├── archivos/UI.html         # diseño original (referencia, no se usa en runtime)
└── src/
    ├── main.jsx
    ├── App.jsx              # compone el dashboard y coordina el estado
    ├── index.css           # Tailwind + estilos base
    ├── lib/
    │   ├── config.js       # umbrales del semáforo, escalas, ventanas
    │   ├── supabaseClient.js
    │   └── helpers.js      # cálculos + generación de paths SVG
    ├── context/
    │   └── ConfigContext.jsx     # umbrales de calibración editables (localStorage)
    ├── hooks/
    │   ├── useLiveReadings.js   # en vivo (Realtime + fallback polling)
    │   ├── useComparativas.js   # lee agregados_diarios + metricas_globales
    │   └── useAlertas.js        # lecturas sobre umbral (badge + vista de alertas)
    ├── components/
    │   ├── Sidebar.jsx  Header.jsx  ContextBar.jsx
    │   ├── KpiPanel.jsx  Sparkline.jsx  LiveChart.jsx
    │   ├── Comparativas.jsx  Footer.jsx
    └── views/                    # una vista por sección del menú lateral
        ├── TelemetriaEnVivo.jsx      # KPIs + gráfico en tiempo real
        ├── MatrizSensores.jsx        # detalle por canal/sensor
        ├── TopologiaNodos.jsx        # diagrama del pipeline con estado en vivo
        ├── RegistrosTransmision.jsx  # log en vivo de lecturas crudas
        ├── AnaliticaHistorica.jsx    # comparativas (agregados de PySpark)
        ├── AlertasUmbral.jsx         # lecturas que superaron el umbral
        └── GestorCalibracion.jsx     # ajusta umbrales del semáforo en runtime
```

## Navegación
El menú lateral es funcional: cambia de vista con rutas limpias vía History API
(`/sensor-matrix`, `/threshold-alerts`, etc., sin `#`), y responde a los botones
atrás/adelante del navegador. El servidor de Vite (`dev` y `preview`) sirve
`index.html` para cualquier ruta (fallback SPA), así que recargar en una subruta
funciona. Si despliegas el `dist/` en un hosting estático, configura ese mismo
*fallback* a `index.html`. El **Gestor de
Calibración** cambia los umbrales del semáforo en vivo (guardados en el
navegador vía localStorage) y el badge de **Alertas por Umbral** muestra el
conteo real de lecturas por encima del umbral en las últimas 24 h.

## Notas
- La clave **publishable/anon** va en el cliente a propósito (Supabase la diseña
  así; la seguridad la da RLS). **Nunca** pongas aquí la `service_role` key.
- Si las comparativas aparecen vacías, corre primero el batch de PySpark
  (`python -m procesamiento.analisis_spark` en `Backend/`) para poblar las tablas.
- Los umbrales del semáforo en `src/lib/config.js` deben coincidir con
  `Backend/config.py`.
