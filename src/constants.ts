import type { Config, Status } from './types'

export const DAYS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO']
export const DAYS_FULL = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const DAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
export const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
export const HOURS = [8, 9, 10, 11, 12, 13, 14]

export const DEF_CFG: Config = { metaCump: 85, metaPunt: 85, maxAbs: 5, maxImpr: 15, maxDelay: 15, slots: 4 }

export const ST: Record<Status, string> = {
  ontime: 'A tiempo', late: 'Tarde', absent: 'No llegó', pending: 'Programada',
}
export const ST_COLOR: Record<Status, string> = {
  ontime: '#548235', late: '#ED7D31', absent: '#C00000', pending: '#94a3b8',
}
export const VIEWS: [string, string][] = [
  ['resumen', '📊 Resumen'], ['agenda', '📅 Agenda'], ['bitacora', '📋 Bitácora'],
  ['proveedores', '🏭 Proveedores'], ['analisis', '📈 Análisis'], ['historial', '🗂 Historial'],
  ['ajustes', '⚙️ Datos y ajustes'],
]
