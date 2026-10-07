import type { AppData } from '../types'
import { addDays } from '../utils/date'
import { calc, inWeekF } from './indicators'

/** Indicadores de las últimas n semanas (la última es la semana visualizada). */
export function weeksSeries(data: AppData, week: string, n: number) {
  const out = []
  for (let i = n - 1; i >= 0; i--) { const w = addDays(week, -7 * i); out.push({ w, r: calc(data, inWeekF(w)) }) }
  return out
}
