-- ==========================================================
--  Políticas RLS de ESCRITURA para la prueba end-to-end
-- ==========================================================
-- Permite insertar/actualizar con la clave anon (publishable) en las
-- tablas del pipeline, para poder generar datos de prueba y que PySpark
-- suba los agregados SIN usar la service_role key.
--
-- Ejecútalo en: Supabase -> SQL Editor -> New query -> Run
--
-- NOTA: abre escritura pública a estas tablas. Es aceptable para un
-- proyecto académico. En producción usarías la service_role key en el
-- backend y NO estas políticas.
-- ==========================================================

-- lecturas_sensores: permitir INSERT (para el generador de datos de prueba)
drop policy if exists "demo_insert_lecturas" on public.lecturas_sensores;
create policy "demo_insert_lecturas" on public.lecturas_sensores
  for insert to anon, authenticated with check (true);

-- lecturas_sensores: permitir SELECT (lo necesita la ingesta Y el frontend en vivo)
drop policy if exists "demo_select_lecturas" on public.lecturas_sensores;
create policy "demo_select_lecturas" on public.lecturas_sensores
  for select to anon, authenticated using (true);

-- agregados_diarios: permitir UPSERT (insert + update) desde el cliente
drop policy if exists "demo_insert_agregados" on public.agregados_diarios;
create policy "demo_insert_agregados" on public.agregados_diarios
  for insert to anon, authenticated with check (true);
drop policy if exists "demo_update_agregados" on public.agregados_diarios;
create policy "demo_update_agregados" on public.agregados_diarios
  for update to anon, authenticated using (true) with check (true);

-- metricas_globales: permitir UPSERT
drop policy if exists "demo_insert_metricas" on public.metricas_globales;
create policy "demo_insert_metricas" on public.metricas_globales
  for insert to anon, authenticated with check (true);
drop policy if exists "demo_update_metricas" on public.metricas_globales;
create policy "demo_update_metricas" on public.metricas_globales
  for update to anon, authenticated using (true) with check (true);
