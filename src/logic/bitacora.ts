import { DAYS } from '../constants'
import type { AppData } from '../types'
import { addDays } from '../utils/date'

/** Una columna por día: llegadas con cita (a tiempo/tarde) y sin cita, ordenadas como en el Excel. */
export function bitColumns(data: AppData, week: string) {
  return DAYS.map((_, di) => {
    const date = addDays(week, di)
    return {
      date,
      citas: data.appointments.filter(a => a.date === date && (a.status === 'ontime' || a.status === 'late'))
        .sort((a, b) => a.hour - b.hour || a.slot - b.slot),
      walks: data.walkins.filter(w => w.date === date).sort((a, b) => (a.arrival || '').localeCompare(b.arrival || '')),
    }
  })
}
export const bitRows = (cols: ReturnType<typeof bitColumns>) =>
  Math.max(15, ...cols.map(c => Math.max(c.citas.length, c.walks.length)))
