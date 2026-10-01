-- ==========================================================
--  Limpieza de datos para una prueba end-to-end desde cero
-- ==========================================================
-- Vacía las tablas del pipeline SIN borrar su estructura.
-- Ejecútalo en: Supabase -> SQL Editor -> New query -> Run
--
-- TRUNCATE es más rápido que DELETE y reinicia los contadores de id
-- (RESTART IDENTITY), así la primera lectura real del ESP32 vuelve a id = 1.
--
-- OJO: esto borra TODAS las filas de esas tablas. Úsalo solo cuando
-- quieras empezar una prueba limpia con datos reales del ESP32.
-- ==========================================================

-- Lecturas crudas del ESP32 (fuente en vivo)
truncate table public.lecturas_sensores restart identity;

-- Agregados que produce PySpark (se repueblan al correr el batch)
truncate table public.agregados_diarios;
truncate table public.metricas_globales;

-- Verificación (deben devolver 0)
-- select count(*) from public.lecturas_sensores;
-- select count(*) from public.agregados_diarios;
-- select count(*) from public.metricas_globales;
