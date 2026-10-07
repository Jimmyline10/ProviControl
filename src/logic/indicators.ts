import { HOURS } from '../constants'
import type { AppData, Appointment, Config, DateFilter, Walkin } from '../types'
import { addDays, fmtShort, weekEnd } from '../utils/date'
import { avg, norm, pct } from '../utils/format'

export type Scope = 'week' | '4w' | 'all'

/* ---- filtros de periodo ---- */
export const inWeekF = (w: string): DateFilter => d => d >= w && d <= weekEnd(w)
export const scopeFilter = (scope: Scope, week: string): DateFilter =>
  scope === 'week' ? inWeekF(week)
  : scope === '4w' ? d => d >= addDays(week, -21) && d <= weekEnd(week)
  : () => true
export const scopeLabel = (scope: Scope, week: string) =>
  scope === 'week' ? `Semana ${fmtShort(week)} – ${fmtShort(weekEnd(week))}`
  : scope === '4w' ? `Últimas 4 semanas (${fmtShort(addDays(week, -21))} – ${fmtShort(weekEnd(week))})`
  : 'Todo el historial'

export const apps = (data: AppData, f: DateFilter): Appointment[] => data.appointments.filter(a => f(a.date))
export const walks = (data: AppData, f: DateFilter): Walkin[] => data.walkins.filter(w => f(w.date))
export const capacityDay = (cfg: Config) => HOURS.length * cfg.slots

/* ---- indicadores ----
   cumpGen  = a tiempo ÷ (programadas + sin cita)
   cumpCita = atendidos con cita ÷ total atendidos (con + sin cita)
   punt     = a tiempo ÷ atendidos con cita */
export function calc(data: AppData, f: DateFilter) {
  const A = apps(data, f), W = walks(data, f)
  const programadas = A.length
  const ontime = A.filter(a => a.status === 'ontime').length
  const late = A.filter(a => a.status === 'late').length
  const absent = A.filter(a => a.status === 'absent').length
  const pending = A.filter(a => a.status === 'pending').length
  const sc = W.length
  const esperados = programadas + sc, atendCC = ontime + late, atendidos = atendCC + sc
  const delays = A.filter(a => a.status === 'late' && a.delay > 0).map(a => a.delay)
  return {
    programadas, ontime, late, absent, pending, sc, esperados, atendCC, atendidos,
    cumpGen: pct(ontime, esperados), cumpCita: pct(atendCC, atendidos), punt: pct(ontime, atendCC),
    impr: pct(sc, esperados), inas: pct(absent, programadas), asist: pct(atendCC, programadas),
    delayProm: avg(delays), delayMax: delays.length ? Math.max(...delays) : 0, delays,
  }
}
export type Indicators = ReturnType<typeof calc>

export type Tone = 'g' | 'o' | 'r' | 'n'
export const tone = (v: number | null, good: number, ok: number, inv?: boolean): Tone =>
  v == null ? 'n'
  : inv ? (v <= good ? 'g' : v <= ok ? 'o' : 'r')
  : v >= good ? 'g' : v >= ok ? 'o' : 'r'
export const TCOL: Record<Tone, string> = {
  g: 'var(--green)', o: 'var(--orange)', r: 'var(--red)', n: 'var(--navy)',
}

/** Comparativo contra la semana anterior (el componente decide cómo pintarlo). */
export function delta(cur: number | null, prev: number | null, lowerBetter?: boolean) {
  if (cur == null || prev == null) return { kind: 'none' as const }
  const d = cur - prev
  if (d === 0) return { kind: 'same' as const }
  const good = lowerBetter ? d < 0 : d > 0
  return { kind: 'diff' as const, good, up: d > 0, abs: Math.abs(d) }
}

/* ---- proveedores ---- */
export interface ProviderStat {
  key: string; name: string; prog: number; ontime: number; late: number; absent: number; pending: number
  sc: number; delays: number[]; last: string; hours: number[]
  total: number; atend: number; punt: number | null; cump: number | null; delayProm: number
}
export function providerStats(data: AppData, f: DateFilter): ProviderStat[] {
  const map = new Map<string, Omit<ProviderStat, 'total' | 'atend' | 'punt' | 'cump' | 'delayProm'>>()
  const get = (n: string) => {
    const k = norm(n)
    if (!map.has(k)) map.set(k, { key: k, name: n.trim(), prog: 0, ontime: 0, late: 0, absent: 0, pending: 0, sc: 0, delays: [], last: '', hours: [] })
    return map.get(k)!
  }
  apps(data, f).forEach(a => {
    const e = get(a.provider)
    e.prog++; e[a.status]++
    if (a.status === 'late' && a.delay > 0) e.delays.push(a.delay)
    if (a.date > e.last && a.status !== 'pending') e.last = a.date
    if (a.provider !== a.provider.toUpperCase() && e.name === e.name.toUpperCase()) e.name = a.provider
  })
  walks(data, f).forEach(w => { const e = get(w.provider); e.sc++; if (w.date > e.last) e.last = w.date })
  return [...map.values()].map(e => ({
    ...e, total: e.prog + e.sc, atend: e.ontime + e.late + e.sc,
    punt: pct(e.ontime, e.ontime + e.late), cump: pct(e.ontime, e.prog + e.sc), delayProm: avg(e.delays),
  }))
}
export const level = (e: ProviderStat, cfg: Config): [string, Tone | 's'] =>
  e.total === 0 || e.cump == null ? ['Sin datos', 's']
  : e.cump >= cfg.metaCump ? ['Excelente', 'g']
  : e.cump >= 60 ? ['Regular', 'o'] : ['Crítico', 'r']
export const knownProviders = (data: AppData) =>
  [...new Set([...data.appointments.map(a => a.provider), ...data.walkins.map(w => w.provider)].map(norm))].sort()
