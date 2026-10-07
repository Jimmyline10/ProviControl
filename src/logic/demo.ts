import { HOURS } from '../constants'
import type { AppData, Appointment, Config, Walkin } from '../types'
import { addDays, mondayOf, pad, todayISO } from '../utils/date'
import { uid } from '../utils/format'
import { applyArrival } from './appointments'

/** Datos de ejemplo: 6 semanas hasta hoy (misma semilla que la versión anterior). */
export function makeDemo(cfg: Config): AppData {
  let s = 20260
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  const P: [string, number][] = [['ALICORP', .85], ['ARCOR', .9], ['GLORIA', .75], ['COLOMBINA', .8], ['MONDELEZ', .9], ['NESTLE', .85], ['SOFTYS', .7], ['LAIVE', .8], ['INTEK', .88], ['COSTEÑO', .82], ['MOLITALIA PASTAS', .55], ['SAN JORGE', .9], ['CISNE', .6], ['TABERNERO', .85], ['KMC', .92], ['YICHANG', .8], ['PAPELERA REYES', .78], ['ROMEX', .72], ['FAMPRO', .86], ['MALSA', .7], ['HERBI', .65], ['WISH', .8], ['GLOBAL CC', .9]]
  const today = todayISO(), nowH = new Date().getHours()
  const appointments: Appointment[] = [], walkins: Walkin[] = []
  const hw = [5, 9, 9, 8, 6, 6, 3]
  const pickH = () => { let t = rnd() * hw.reduce((a, b) => a + b), i = 0; while (t > hw[i]) { t -= hw[i]; i++ } return HOURS[Math.min(i, 6)] }
  for (let wk = 5; wk >= 0; wk--) {
    const mon = addDays(mondayOf(today), -7 * wk)
    for (let d = 0; d < 6; d++) {
      const date = addDays(mon, d); if (date > today) continue
      const n = [7, 9, 9, 11, 13, 6][d] + Math.floor(rnd() * 4), used = new Set<string>()
      for (let k = 0; k < n; k++) {
        let h = pickH(), sl = 1 + Math.floor(rnd() * cfg.slots), g = 0
        while (used.has(h + ':' + sl) && g++ < 30) { h = pickH(); sl = 1 + Math.floor(rnd() * cfg.slots) }
        if (used.has(h + ':' + sl)) continue
        used.add(h + ':' + sl)
        const p = P[Math.floor(rnd() * P.length)], past = date < today || h < nowH
        let a: Appointment = { id: uid(), provider: p[0], date, hour: h, slot: sl, status: 'pending', arrival: '', delay: 0, notes: '', createdAt: '', demo: true }
        if (past) {
          const x = rnd()
          if (x < p[1]) a = applyArrival(a, 'ontime', `${pad(h)}:00`)
          else if (x < p[1] + (1 - p[1]) * .75) { const m = h * 60 + 5 + Math.floor(rnd() * 50); a = applyArrival(a, 'late', `${pad(Math.floor(m / 60))}:${pad(m % 60)}`) }
          else a = { ...a, status: 'absent' }
        }
        appointments.push(a)
      }
      const k = Math.floor(rnd() * (d >= 3 ? 4 : 3))
      for (let j = 0; j < k; j++) {
        const p = rnd() < .4 ? P[0] : P[Math.floor(rnd() * P.length)], h = pickH()
        if (date === today && h > nowH) continue
        walkins.push({ id: uid(), provider: p[0], date, arrival: `${pad(h)}:${pad(Math.floor(rnd() * 60))}`, notes: 'Ingreso sin agendar', createdAt: '', demo: true })
      }
    }
  }
  return { appointments, walkins }
}
