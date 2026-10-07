import { ST } from '../constants'
import type { AppData, Status } from '../types'
import { hh } from '../utils/date'
import { norm } from '../utils/format'

export interface HistFilters { from: string; to: string; st: string; type: string; q: string; page: number }
export const EMPTY_HIST: HistFilters = { from: '', to: '', st: '', type: '', q: '', page: 1 }

export interface HistEvent {
  kind: 'a' | 'w'; id: string; date: string; time: string; provider: string
  type: 'Con cita' | 'Sin cita'; st: Status | 'sc'; arr: string; delay: number; notes: string
}
export const stLabel = (s: Status | 'sc') => (s === 'sc' ? 'Sin cita' : ST[s])
export const pillOf = (s: string) => (s === 'ontime' ? 'g' : s === 'late' ? 'o' : s === 'absent' || s === 'sc' ? 'r' : 's')

export function allEvents(data: AppData): HistEvent[] {
  return [
    ...data.appointments.map((a): HistEvent => ({ kind: 'a', id: a.id, date: a.date, time: hh(a.hour), provider: a.provider,
      type: 'Con cita', st: a.status, arr: a.arrival, delay: a.delay, notes: a.notes })),
    ...data.walkins.map((w): HistEvent => ({ kind: 'w', id: w.id, date: w.date, time: w.arrival || '', provider: w.provider,
      type: 'Sin cita', st: 'sc', arr: w.arrival, delay: 0, notes: w.notes })),
  ].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
}
export const histEvents = (data: AppData, f: HistFilters) =>
  allEvents(data).filter(e => (!f.from || e.date >= f.from) && (!f.to || e.date <= f.to) && (!f.st || e.st === f.st)
    && (!f.type || e.type === f.type) && (!f.q || norm(e.provider + ' ' + e.notes).includes(norm(f.q))))
