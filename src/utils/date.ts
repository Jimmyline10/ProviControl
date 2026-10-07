import { MES } from '../constants'

export const pad = (n: number) => String(n).padStart(2, '0')
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12) }
export const todayISO = () => iso(new Date())
export const mondayOf = (s: string) => {
  const x = parse(s); const w = x.getDay(); x.setDate(x.getDate() + (w === 0 ? -6 : 1 - w)); return iso(x)
}
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d) }
export const weekEnd = (w: string) => addDays(w, 5)
export const fmtShort = (s: string) => { const d = parse(s); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}` }
export const fmtLong = (s: string) => { const d = parse(s); return `${pad(d.getDate())} ${MES[d.getMonth()]} ${d.getFullYear()}` }
/** 0 = lunes … 6 = domingo */
export const dow = (s: string) => (parse(s).getDay() + 6) % 7
export const nowHM = () => { const d = new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}` }
export const toMin = (h: string) => { const m = String(h || '').match(/^(\d{1,2}):(\d{2})$/); return m ? +m[1] * 60 + +m[2] : null }
export const hh = (h: number) => `${pad(h)}:00`
