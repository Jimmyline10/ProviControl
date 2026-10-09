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
  ontime: '#3fcf6a', late: '#ff9a3d', absent: '#ff5c5c', pending: '#7fa8d8',
}
/** [clave, etiqueta, ícono, grupo del menú lateral] */
export const VIEWS: [string, string, string, string][] = [
  ['resumen', 'Panel ejecutivo', 'dashboard', 'Operación'],
  ['agenda', 'Agenda', 'calendar', 'Operación'],
  ['bitacora', 'Bitácora', 'clipboard', 'Operación'],
  ['rotulos', 'Rótulos', 'tag', 'Operación'],
  ['proveedores', 'Proveedores', 'truck', 'Gestión'],
  ['analisis', 'Análisis', 'chart', 'Gestión'],
  ['historial', 'Historial', 'archive', 'Gestión'],
  ['ajustes', 'Datos y ajustes', 'settings', 'Sistema'],
]
