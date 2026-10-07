-- PASO 4: ejecutar SOLO después de comprobar que el login funciona en la app.
-- Reemplaza las políticas abiertas (anon) por políticas que exigen sesión iniciada.

drop policy if exists "dev_all_appointments" on public.appointments;
drop policy if exists "dev_all_walkins"      on public.walkins;
drop policy if exists "dev_all_settings"     on public.settings;

create policy "auth_all_appointments" on public.appointments for all to authenticated using (true) with check (true);
create policy "auth_all_walkins"      on public.walkins      for all to authenticated using (true) with check (true);
create policy "auth_all_settings"     on public.settings     for all to authenticated using (true) with check (true);
