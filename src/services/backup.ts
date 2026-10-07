import { DEF_CFG } from '../constants'
import type { AppData, Config } from '../types'
import { todayISO } from '../utils/date'
import { sanitize } from './repository'

export function download(blob: Blob, name: string) {
  const u = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(u), 1500)
}
export function downloadBackup(data: AppData, cfg: Config) {
  const body = JSON.stringify({ app: 'provicontrol', version: 11, exported: new Date().toISOString(), cfg, ...data }, null, 1)
  download(new Blob([body], { type: 'application/json' }), `ProviControl_respaldo_${todayISO()}.json`)
}
/** Lee un respaldo .json (mismo formato de la versión anterior). Devuelve null si no es válido. */
export function parseBackup(text: string): { data: AppData; cfg?: Config } | null {
  try {
    const p = JSON.parse(text), data = sanitize(p); if (!data) return null
    const maxSlot = Math.max(1, ...data.appointments.map(a => a.slot))
    const cfg = p.cfg && typeof p.cfg === 'object'
      ? { ...DEF_CFG, ...p.cfg, slots: Math.max(+p.cfg.slots || 4, maxSlot) } as Config : undefined
    return { data, cfg }
  } catch { return null }
}
