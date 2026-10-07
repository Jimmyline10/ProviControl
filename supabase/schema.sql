-- Ejecutar en Supabase: SQL Editor > New query > Run

create table if not exists public.appointments (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,
  date        date not null,
  hour        smallint not null,
  slot        smallint not null default 1,
  status      text not null default 'pending' check (status in ('ontime','late','absent','pending')),
  arrival     text not null default '',
  delay       integer not null default 0,
  notes       text not null default '',
  demo        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists appointments_date_idx on public.appointments (date);

create table if not exists public.walkins (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null,
  date        date not null,
  arrival     text not null default '',
  notes       text not null default '',
  demo        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists walkins_date_idx on public.walkins (date);

create table if not exists public.settings (
  id          smallint primary key default 1 check (id = 1),
  meta_cump   integer not null default 85,
  meta_punt   integer not null default 85,
  max_abs     integer not null default 5,
  max_impr    integer not null default 15,
  max_delay   integer not null default 15,
  slots       integer not null default 4
);
insert into public.settings (id) values (1) on conflict do nothing;

-- Seguridad (RLS). OJO: estas políticas dejan leer/escribir a cualquiera que tenga
-- la anon key. Sirve para desarrollo; antes de publicar, agrega login (Supabase Auth)
-- y cambia "to anon" por "to authenticated".
alter table public.appointments enable row level security;
alter table public.walkins      enable row level security;
alter table public.settings     enable row level security;

create policy "dev_all_appointments" on public.appointments for all to anon using (true) with check (true);
create policy "dev_all_walkins"      on public.walkins      for all to anon using (true) with check (true);
create policy "dev_all_settings"     on public.settings     for all to anon using (true) with check (true);
