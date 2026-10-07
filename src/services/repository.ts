import { DEF_CFG, ST } from '../constants'
import type { AppData, Appointment, Config, Walkin } from '../types'
import { uid } from '../utils/format'
import { supabase } from './supabase'

/* ---- filas de la BD (snake_case) <-> modelo de la app (camelCase) ---- */
const toApp = (r: any): Appointment => ({
  id: r.id, provider: r.provider, date: r.date, hour: r.hour, slot: r.slot, status: r.status,
  arrival: r.arrival ?? '', delay: r.delay ?? 0, notes: r.notes ?? '', createdAt: r.created_at ?? '', demo: !!r.demo,
})
const fromApp = (a: Appointment) => ({
  id: a.id, provider: a.provider, date: a.date, hour: a.hour, slot: a.slot, status: a.status,
  arrival: a.arrival, delay: a.delay, notes: a.notes, demo: a.demo,
})
const toWalk = (r: any): Walkin => ({
  id: r.id, provider: r.provider, date: r.date, arrival: r.arrival ?? '', notes: r.notes ?? '',
  createdAt: r.created_at ?? '', demo: !!r.demo,
})
const fromWalk = (w: Walkin) => ({
  id: w.id, provider: w.provider, date: w.date, arrival: w.arrival, notes: w.notes, demo: w.demo,
})
const ok = <T>(r: { data: T | null; error: { message: string } | null }): T => {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

/* ---- lectura ---- */
export async function loadAll(): Promise<{ data: AppData; cfg: Config }> {
  const [a, w, c] = await Promise.all([
    supabase.from('appointments').select('*').limit(10000),
    supabase.from('walkins').select('*').limit(10000),
    supabase.from('settings').select('*').eq('id', 1).maybeSingle(),
  ])
  const s: any = ok(c)
  return {
    data: { appointments: (ok(a) as any[]).map(toApp), walkins: (ok(w) as any[]).map(toWalk) },
    cfg: s ? {
      metaCump: s.meta_cump, metaPunt: s.meta_punt, maxAbs: s.max_abs,
      maxImpr: s.max_impr, maxDelay: s.max_delay, slots: s.slots,
    } : { ...DEF_CFG },
  }
}

/* ---- citas ---- */
export const saveAppointment = async (a: Appointment) => { ok(await supabase.from('appointments').upsert(fromApp(a))) }
export const deleteAppointment = async (id: string) => { ok(await supabase.from('appointments').delete().eq('id', id)) }

/* ---- sin cita ---- */
export const saveWalkin = async (w: Walkin) => { ok(await supabase.from('walkins').upsert(fromWalk(w))) }
export const deleteWalkin = async (id: string) => { ok(await supabase.from('walkins').delete().eq('id', id)) }

/* ---- operaciones masivas ---- */
export async function deleteRange(from: string, to: string) {
  ok(await supabase.from('appointments').delete().gte('date', from).lte('date', to))
  ok(await supabase.from('walkins').delete().gte('date', from).lte('date', to))
}
export async function deleteDemo() {
  ok(await supabase.from('appointments').delete().eq('demo', true))
  ok(await supabase.from('walkins').delete().eq('demo', true))
}
export async function wipeAll() {
  ok(await supabase.from('appointments').delete().not('id', 'is', null))
  ok(await supabase.from('walkins').delete().not('id', 'is', null))
}
export async function insertMany(d: AppData) {
  if (d.appointments.length) ok(await supabase.from('appointments').upsert(d.appointments.map(fromApp)))
  if (d.walkins.length) ok(await supabase.from('walkins').upsert(d.walkins.map(fromWalk)))
}
export async function replaceAll(d: AppData) { await wipeAll(); await insertMany(d) }

/* ---- metas ---- */
export async function saveConfig(c: Config) {
  ok(await supabase.from('settings').upsert({
    id: 1, meta_cump: c.metaCump, meta_punt: c.metaPunt, max_abs: c.maxAbs,
    max_impr: c.maxImpr, max_delay: c.maxDelay, slots: c.slots,
  }))
}

/* ---- validar un respaldo .json (mismo criterio que la versión anterior) ---- */
export function sanitize(p: any): AppData | null {
  if (!p || typeof p !== 'object' || !Array.isArray(p.appointments) || !Array.isArray(p.walkins)) return null
  const okD = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)
  const isUuid = (s: unknown) => typeof s === 'string' && /^[0-9a-f-]{36}$/i.test(s)
  const appointments = p.appointments
    .filter((a: any) => a && okD(a.date) && typeof a.provider === 'string' && a.provider.trim() && Number.isFinite(+a.hour))
    .map((a: any): Appointment => ({
      id: isUuid(a.id) ? a.id : uid(), provider: a.provider.trim(), date: a.date, hour: +a.hour,
      slot: Math.max(1, +a.slot || 1), status: a.status in ST ? a.status : 'pending',
      arrival: a.arrival || '', delay: +a.delay || 0, notes: a.notes || '', createdAt: a.createdAt || '', demo: !!a.demo,
    }))
  const walkins = p.walkins
    .filter((w: any) => w && okD(w.date) && typeof w.provider === 'string' && w.provider.trim())
    .map((w: any): Walkin => ({
      id: isUuid(w.id) ? w.id : uid(), provider: w.provider.trim(), date: w.date,
      arrival: w.arrival || '', notes: w.notes || '', createdAt: w.createdAt || '', demo: !!w.demo,
    }))
  return { appointments, walkins }
}
