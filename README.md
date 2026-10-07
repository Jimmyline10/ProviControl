# ProviControl (React + TypeScript + Supabase)

## Puesta en marcha
1. `npm install`
2. En Supabase: SQL Editor -> pega y ejecuta `supabase/schema.sql`
3. Copia `.env.example` a `.env` y completa URL y anon key (Settings -> API)
4. `npm run dev`

## Estructura
- `src/utils`     fechas y formato
- `src/logic`     indicadores y estadísticas por proveedor (lógica pura)
- `src/services`  Supabase y acceso a datos
- `src/views`, `src/components`, `src/context`  (etapas 2 y 3)
