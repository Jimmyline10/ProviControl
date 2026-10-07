import { DAYS, DAYS_SHORT, HOURS } from '../constants'
import type { AppData, Config } from '../types'
import { dow, hh, mondayOf, toMin } from '../utils/date'
import { pct } from '../utils/format'
import { apps, calc, capacityDay, providerStats, scopeFilter, Scope, walks } from './indicators'

export function analyze(data: AppData, cfg: Config, week: string, scope: Scope) {
  const f = scopeFilter(scope, week), A = apps(data, f), W = walks(data, f), r = calc(data, f)
  const hourOf = (arr: string) => { const m = toMin(arr); return m == null ? null : Math.floor(m / 60) }

  /* matriz día × hora */
  const mat = DAYS.map(() => HOURS.map(() => ({ n: 0, late: 0, arr: 0 })))
  A.forEach(a => {
    const d = dow(a.date), hi = HOURS.indexOf(a.hour); if (d > 5 || hi < 0) return
    mat[d][hi].n++
    if (a.status === 'late' || a.status === 'ontime') { mat[d][hi].arr++; if (a.status === 'late') mat[d][hi].late++ }
  })
  W.forEach(w => {
    const h = hourOf(w.arrival), d = dow(w.date), hi = h == null ? -1 : HOURS.indexOf(h); if (d > 5 || hi < 0) return
    mat[d][hi].n++
  })
  const mxN = Math.max(1, ...mat.flat().map(c => c.n))
  let peakH = -1, peakN = 0; HOURS.forEach((h, hi) => { const n = mat.reduce((s, row) => s + row[hi].n, 0); if (n > peakN) { peakN = n; peakH = h } })
  let peakD = -1, peakDN = 0; DAYS.forEach((_, d) => { const n = mat[d].reduce((s, c) => s + c.n, 0); if (n > peakDN) { peakDN = n; peakD = d } })

  const ps = providerStats(data, f), freq = [...ps].sort((a, b) => b.total - a.total)[0]
  const elig = ps.filter(e => e.prog + e.sc >= 3 && e.cump != null)
  const best = [...elig].sort((a, b) => b.cump! - a.cump! || b.total - a.total)[0]
  const worst = [...elig].sort((a, b) => a.cump! - b.cump! || b.total - a.total)[0]
  const maxDel = A.filter(a => a.status === 'late').sort((a, b) => b.delay - a.delay)[0]

  /* puntualidad por hora y por día */
  const arrived = (pred: (d: typeof A[number]) => boolean) => A.filter(a => pred(a) && (a.status === 'ontime' || a.status === 'late'))
  const byHour = HOURS.map(h => { const x = arrived(a => a.hour === h); return { l: hh(h), n: x.length, on: x.filter(a => a.status === 'ontime').length } })
  const byDay = DAYS_SHORT.map((l, i) => { const x = arrived(a => dow(a.date) === i); return { l, n: x.length, on: x.filter(a => a.status === 'ontime').length } })

  /* histograma de retrasos */
  const B = ([['1–15 min', 1, 15], ['16–30', 16, 30], ['31–45', 31, 45], ['46–60', 46, 60], ['> 60', 61, 9999]] as [string, number, number][])
    .map(([l, lo, hi]) => ({ l, n: r.delays.filter(d => d >= lo && d <= hi).length }))
  const mxB = Math.max(1, ...B.map(b => b.n))

  /* con/sin cita por día y ocupación */
  const mix = DAYS_SHORT.map((l, i) => ({ l, c: arrived(a => dow(a.date) === i).length, s: W.filter(w => dow(w.date) === i).length }))
  const mxM = Math.max(1, ...mix.map(m => m.c + m.s))
  const nWeeks = scope === 'week' ? 1 : scope === '4w' ? 4
    : Math.max(1, new Set([...data.appointments, ...data.walkins].map(x => mondayOf(x.date))).size)
  const occ = DAYS_SHORT.map((l, i) => ({ l, p: Math.round((A.filter(a => dow(a.date) === i).length / nWeeks / capacityDay(cfg)) * 100) }))

  return { A, W, r, mat, mxN, peakH, peakN, peakD, peakDN, freq, best, worst, maxDel, byHour, byDay, B, mxB, mix, mxM, occ, pctOf: pct }
}
