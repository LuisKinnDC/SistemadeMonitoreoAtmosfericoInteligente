-- ==========================================================
--  Esquema de tablas de RESULTADOS en Supabase
-- ==========================================================
-- Ejecuta este script UNA VEZ en:
--   Supabase -> SQL Editor -> New query -> pega esto -> Run
--
-- Crea las tablas donde PySpark (Capa 2) deposita los agregados,
-- y que el frontend (Capa 3) lee para las comparativas históricas.
-- ==========================================================

-- ----------------------------------------------------------
-- 1) Agregados diarios (una fila por día)
-- ----------------------------------------------------------
create table if not exists public.agregados_diarios (
    fecha        date primary key,
    dia_semana   text,
    temp_min     double precision,
    temp_max     double precision,
    temp_prom    double precision,
    hum_prom     double precision,
    gas_prom     double precision,
    gas_max      integer,
    n_lecturas   integer,
    estado       text,              -- 'Óptimo' | 'Moderado' | 'Alerta'
    actualizado_en timestamptz default now()
);

-- ----------------------------------------------------------
-- 2) Métricas globales (correlaciones e insights) - clave/valor
-- ----------------------------------------------------------
create table if not exists public.metricas_globales (
    clave        text primary key,  -- ej: 'corr_temp_gas', 'corr_temp_hum'
    valor        double precision,
    texto        text,              -- descripción legible para el insight
    actualizado_en timestamptz default now()
);

-- ==========================================================
--  Row Level Security (RLS)
-- ==========================================================
-- El frontend usa la clave pública (publishable/anon), así que
-- necesita política de LECTURA. La escritura la hace PySpark; si usas
-- la service_role key en el backend, esta ignora RLS (no necesita política).
-- Si tu backend usa la anon key, añade también políticas de insert/update.
-- ----------------------------------------------------------

alter table public.agregados_diarios enable row level security;
alter table public.metricas_globales enable row level security;

-- Lectura pública (SELECT) para el dashboard
drop policy if exists "lectura_publica_agregados" on public.agregados_diarios;
create policy "lectura_publica_agregados"
    on public.agregados_diarios for select
    using (true);

drop policy if exists "lectura_publica_metricas" on public.metricas_globales;
create policy "lectura_publica_metricas"
    on public.metricas_globales for select
    using (true);

-- (OPCIONAL) Si el backend escribe con la ANON key en lugar de service_role,
-- descomenta estas políticas para permitir upsert desde el cliente anon:
--
-- drop policy if exists "escritura_agregados" on public.agregados_diarios;
-- create policy "escritura_agregados"
--     on public.agregados_diarios for all
--     using (true) with check (true);
--
-- drop policy if exists "escritura_metricas" on public.metricas_globales;
-- create policy "escritura_metricas"
--     on public.metricas_globales for all
--     using (true) with check (true);

-- ==========================================================
--  (RECOMENDADO) Habilitar Supabase Realtime en la tabla de lecturas
-- ==========================================================
-- Para que el dashboard reciba lecturas nuevas por WebSocket (en vivo),
-- agrega la tabla del ESP32 a la publicación de Realtime:
alter publication supabase_realtime add table public.lecturas_sensores;
-- Si ya estaba agregada, Supabase devolverá un aviso; puedes ignorarlo.
