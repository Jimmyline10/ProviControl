-- Base de productos para el módulo Rótulos.
-- Ejecutar en Supabase: SQL Editor > New query > pegar todo > Run

create table if not exists public.productos (
  code         text primary key,          -- estilo / N° (texto para conservar ceros a la izquierda)
  description  text not null,
  updated_at   timestamptz not null default now()
);

alter table public.productos enable row level security;

drop policy if exists "auth_all_productos" on public.productos;
create policy "auth_all_productos" on public.productos for all to authenticated using (true) with check (true);
