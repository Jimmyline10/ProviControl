import { HOURS } from '../constants'
import type { AppData, Appointment, Config, Status } from '../types'
import { toMin } from '../utils/date'

/** Registra llegada; si es «Tarde» calcula el retraso desde el inicio de la hora agendada. */
export function applyArrival(a: Appointment, status: Status, arrival: string): Appointment {
  const m = toMin(arrival), base = a.hour * 60
  return { ...a, status, arrival, delay: status === 'late' ? Math.max(1, (m == null ? base + 1 : m) - base) : 0 }
}
export const markAbsent = (a: Appointment): Appointment => ({ ...a, status: 'absent', arrival: '', delay: 0 })
export const resetAppt = (a: Appointment): Appointment => ({ ...a, status: 'pending', arrival: '', delay: 0 })

export const slotTaken = (d: AppData, date: string, hour: number, slot: number, exceptId?: string) =>
  d.appointments.some(x => x.date === date && x.hour === hour && x.slot === slot && x.id !== exceptId)

/** Devuelve "hora:espacio" deseado si está libre; si no, el primer espacio libre del día. */
export function pickSlot(d: AppData, cfg: Config, date: string, want: string, exceptId?: string) {
  let first = ''
  for (const h of HOURS) for (let s = 1; s <= cfg.slots; s++) {
    if (slotTaken(d, date, h, s, exceptId)) continue
    if (`${h}:${s}` === want) return want
    if (!first) first = `${h}:${s}`
  }
  return first
}
