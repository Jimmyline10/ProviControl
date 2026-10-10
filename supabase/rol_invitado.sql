-- Rol INVITADO: solo puede ver. No puede crear, editar, borrar ni importar nada.
-- Ejecutar en Supabase: SQL Editor > New query > pegar todo > Run
-- (reemplaza las políticas de policies_auth.sql y productos.sql)

-- ¿El usuario de la sesión es invitado? El rol se guarda en app_metadata,
-- que solo puede cambiar el administrador (el usuario no puede modificarlo).
create or replace function public.es_invitado() returns boolean
language sql stable as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'invitado'
$$;

-- Citas
drop policy if exists "auth_all_appointments"   on public.appointments;
drop policy if exists "leer_appointments"       on public.appointments;
drop policy if exists "escribir_appointments"   on public.appointments;
create policy "leer_appointments"     on public.appointments for select to authenticated using (true);
create policy "escribir_appointments" on public.appointments for all    to authenticated using (not public.es_invitado()) with check (not public.es_invitado());

-- Llegadas sin cita
drop policy if exists "auth_all_walkins"   on public.walkins;
drop policy if exists "leer_walkins"       on public.walkins;
drop policy if exists "escribir_walkins"   on public.walkins;
create policy "leer_walkins"     on public.walkins for select to authenticated using (true);
create policy "escribir_walkins" on public.walkins for all    to authenticated using (not public.es_invitado()) with check (not public.es_invitado());

-- Metas / ajustes
drop policy if exists "auth_all_settings"   on public.settings;
drop policy if exists "leer_settings"       on public.settings;
drop policy if exists "escribir_settings"   on public.settings;
create policy "leer_settings"     on public.settings for select to authenticated using (true);
create policy "escribir_settings" on public.settings for all    to authenticated using (not public.es_invitado()) with check (not public.es_invitado());

-- Productos (Rótulos)
drop policy if exists "auth_all_productos"   on public.productos;
drop policy if exists "leer_productos"       on public.productos;
drop policy if exists "escribir_productos"   on public.productos;
create policy "leer_productos"     on public.productos for select to authenticated using (true);
create policy "escribir_productos" on public.productos for all    to authenticated using (not public.es_invitado()) with check (not public.es_invitado());

-- ============================================================================
-- CÓMO CREAR UN INVITADO
-- 1) Authentication > Users > Add user: cree el usuario con su correo y contraseña.
-- 2) Ejecute (cambiando el correo):
--
--    update auth.users
--       set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"invitado"}'
--     where email = 'invitado@empresa.com';
--
-- Para quitarle el rol (volver a usuario normal):
--
--    update auth.users
--       set raw_app_meta_data = raw_app_meta_data - 'role'
--     where email = 'invitado@empresa.com';
--
-- El cambio se aplica cuando el usuario vuelve a iniciar sesión.
-- ============================================================================
