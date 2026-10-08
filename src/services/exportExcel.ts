import { DAYS, DAYS_SHORT, HOURS, ST } from '../constants'
import { bitColumns, bitRows } from '../logic/bitacora'
import { calc, inWeekF, providerStats, apps } from '../logic/indicators'
import { weeksSeries } from '../logic/summary'
import { allEvents, HistEvent, stLabel } from '../logic/history'
import type { AppData, Config } from '../types'
import { addDays, dow, fmtLong, hh, todayISO, weekEnd } from '../utils/date'
import { fmtP, pct } from '../utils/format'

/** Muestra el resultado de una exportación en el toast. */
export const notifyExport = (p: Promise<void>, toast: (m: string) => void) =>
  p.then(() => toast('Excel exportado.'), () => toast('No se pudo generar el Excel. Revise su conexión e intente de nuevo.'))

interface Sheet { name: string; cols?: number[]; aoa: any[][] }

/** Genera y descarga el .xlsx. La librería se carga solo al exportar para no pesar en la carga inicial. */
export async function writeXlsx(sheets: Sheet[], name: string) {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()
  sheets.forEach(s => {
    const ws = XLSX.utils.aoa_to_sheet(s.aoa)
    if (s.cols) ws['!cols'] = s.cols.map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31))
  })
  XLSX.writeFile(wb, name + '.xlsx')
}

export function aoaBitacora(data: AppData, week: string) {
  const cols = bitColumns(data, week), rows = bitRows(cols)
  const aoa: any[][] = [['', ...DAYS.flatMap(d => [d, ''])], ['', ...DAYS.flatMap(() => ['CON CITA', 'SIN CITA'])]]
  for (let i = 0; i < rows; i++)
    aoa.push([i + 1, ...cols.flatMap(c => [c.citas[i]?.provider || '', c.walks[i]?.provider || ''])])
  aoa.push(['Cantidad', ...cols.flatMap(c => [c.citas.length, c.walks.length])])
  aoa.push(['Total día', ...cols.flatMap(c => [c.citas.length + c.walks.length, ''])])
  aoa.push(['% Cumpl.', ...cols.flatMap(c => {
    const p = pct(c.citas.length, c.citas.length + c.walks.length); return [p == null ? 'Sin datos' : p + '%', '']
  })])
  return aoa
}
export const aoaDias = (data: AppData, week: string) => [
  ['Día', 'Fecha', 'Programadas', 'A tiempo', 'Tarde', 'No llegó', 'Sin cita', 'Esperados', '% Cumpl. general', '% Cumpl. de cita'],
  ...DAYS.map((d, i) => {
    const date = addDays(week, i), x = calc(data, dd => dd === date)
    return [d, date, x.programadas, x.ontime, x.late, x.absent, x.sc, x.esperados, fmtP(x.cumpGen), fmtP(x.cumpCita)]
  })]
export const aoaProv = (data: AppData, week: string) => [
  ['Proveedor', 'Citas', 'A tiempo', 'Tarde', 'No llegó', 'Sin cita', 'Puntualidad', 'Retraso prom. (min)', 'Cumplimiento', 'Última visita'],
  ...providerStats(data, inWeekF(week)).sort((a, b) => b.total - a.total)
    .map(e => [e.name, e.prog, e.ontime, e.late, e.absent, e.sc, fmtP(e.punt), e.delayProm, fmtP(e.cump), e.last])]

export function exportBitacora(data: AppData, week: string) {
  return writeXlsx([
    { name: 'Bitácora', cols: [10, ...Array(12).fill(18)], aoa: aoaBitacora(data, week) },
    { name: 'Cumplimiento por día', cols: [11, 12, 12, 10, 8, 10, 10, 10, 14, 14], aoa: aoaDias(data, week) },
    { name: 'Proveedores', cols: [30, 8, 10, 8, 10, 10, 12, 16, 14, 13], aoa: aoaProv(data, week) },
  ], `Bitacora_${week}`)
}

export function exportAgenda(data: AppData, week: string) {
  const aoa: any[][] = [['HORA', ...DAYS]]
  HOURS.forEach(h => aoa.push([`${hh(h)} - ${hh(h + 1)}`, ...DAYS.map((_, di) => {
    const d = addDays(week, di)
    return data.appointments.filter(a => a.date === d && a.hour === h).sort((a, b) => a.slot - b.slot)
      .map(a => `[#${a.slot}] ${a.provider} (${ST[a.status]})`).join(' | ')
  })]))
  aoa.push(['Total agendadas', ...DAYS.map((_, di) => data.appointments.filter(a => a.date === addDays(week, di)).length)])
  const flat =[...apps(data, inWeekF(week))]
    .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.slot - b.slot)
    .map(a => [a.date, DAYS_SHORT[dow(a.date)], hh(a.hour), '#' + a.slot, a.provider, ST[a.status], a.arrival, a.delay || 0, a.notes])
  return writeXlsx([
    { name: 'Agenda', cols: [18, ...DAYS.map(() => 34)], aoa },
    { name: 'Citas detalle', cols: [12, 6, 8, 8, 28, 12, 10, 12, 30],
      aoa: [['Fecha', 'Día', 'Hora', 'Espacio', 'Proveedor', 'Estado', 'Llegada', 'Retraso (min)', 'Observaciones'], ...flat] },
  ], `Agenda_${week}`)
}

export function exportExec(data: AppData, cfg: Config, week: string) {
  const r = calc(data, inWeekF(week))
  const st = (v: number | null, g: number, o: number, inv?: boolean) => v == null ? '—'
    : inv ? (v <= g ? 'ÓPTIMO' : v <= o ? 'ACEPTABLE' : 'CRÍTICO') : (v >= g ? 'ÓPTIMO' : v >= o ? 'ACEPTABLE' : 'CRÍTICO')
  const ser = weeksSeries(data, week, 8)
  return writeXlsx([
    { name: 'Reporte ejecutivo', cols: [34, 14, 12, 14, 48], aoa: [
      ['PROVICONTROL · REPORTE EJECUTIVO'], [`Semana del ${fmtLong(week)} al ${fmtLong(weekEnd(week))}`], [`Generado el ${fmtLong(todayISO())}`], [],
      ['INDICADOR', 'VALOR', 'META', 'ESTADO', 'DESCRIPCIÓN'],
      ['Cumplimiento general', fmtP(r.cumpGen), '≥ ' + cfg.metaCump + '%', st(r.cumpGen, cfg.metaCump, 60), 'A tiempo ÷ (programadas + sin cita)'],
      ['Puntualidad', fmtP(r.punt), '≥ ' + cfg.metaPunt + '%', st(r.punt, cfg.metaPunt, 60), 'A tiempo ÷ llegaron con cita'],
      ['Cumplimiento de cita', fmtP(r.cumpCita), '≥ ' + cfg.metaCump + '%', st(r.cumpCita, cfg.metaCump, 60), 'Con cita ÷ total recibidos'],
      ['Improvisación', fmtP(r.impr), '≤ ' + cfg.maxImpr + '%', st(r.impr, cfg.maxImpr, 30, true), 'Sin cita ÷ esperados'],
      ['Inasistencia', fmtP(r.inas), '≤ ' + cfg.maxAbs + '%', st(r.inas, cfg.maxAbs, 10, true), 'No llegaron ÷ programadas'],
      ['Retraso promedio', r.delayProm + ' min', '≤ ' + cfg.maxDelay + ' min', r.late ? st(r.delayProm, cfg.maxDelay, 30, true) : '—', 'Minutos de tardanza promedio'], [],
      ['VOLUMEN', 'Cantidad'], ['Citas programadas', r.programadas], ['A tiempo', r.ontime], ['Tarde', r.late], ['No llegó', r.absent],
      ['Pendientes', r.pending], ['Sin cita', r.sc], ['Total esperado', r.esperados], ['Total recibidos', r.atendidos]] },
    { name: 'Cumplimiento por día', cols: [11, 12, 12, 10, 8, 10, 10, 10, 14, 14], aoa: aoaDias(data, week) },
    { name: 'Proveedores', cols: [30, 8, 10, 8, 10, 10, 12, 16, 14, 13], aoa: aoaProv(data, week) },
    { name: 'Tendencia 8 semanas', cols: [12, 12, 12, 12, 10, 10, 16], aoa: [
      ['Desde', 'Hasta', 'Programadas', 'A tiempo', 'Sin cita', 'Cumpl. general', 'Estado'],
      ...ser.map(s => [s.w, weekEnd(s.w), s.r.programadas, s.r.ontime, s.r.sc, fmtP(s.r.cumpGen), st(s.r.cumpGen, cfg.metaCump, 60)])] },
  ], `Reporte_Ejecutivo_${week}`)
}

export function exportHistorial(ev: HistEvent[]) {
  return writeXlsx([{ name: 'Historial', cols: [12, 6, 8, 28, 10, 12, 10, 12, 32], aoa: [
    ['Fecha', 'Día', 'Hora', 'Proveedor', 'Tipo', 'Estado', 'Llegada', 'Retraso (min)', 'Observación'],
    ...ev.map(e => [e.date, DAYS_SHORT[dow(e.date)] || 'Dom', e.time, e.provider, e.type, stLabel(e.st), e.arr || '', e.delay || 0, e.notes || ''])] }],
    `Historial_${todayISO()}`)
}

export function exportAll(data: AppData) {
  const ev = allEvents(data)
  return writeXlsx([
    { name: 'Todos los registros', cols: [12, 6, 8, 28, 10, 12, 10, 12, 32], aoa: [
      ['Fecha', 'Día', 'Hora', 'Proveedor', 'Tipo', 'Estado', 'Llegada', 'Retraso (min)', 'Observación'],
      ...ev.map(e => [e.date, DAYS_SHORT[dow(e.date)] || 'Dom', e.time, e.provider, e.type, stLabel(e.st), e.arr || '', e.delay || 0, e.notes || ''])] },
    { name: 'Proveedores (todo)', cols: [30, 8, 10, 8, 10, 10, 12, 16, 14, 13], aoa: [
      ['Proveedor', 'Citas', 'A tiempo', 'Tarde', 'No llegó', 'Sin cita', 'Puntualidad', 'Retraso prom. (min)', 'Cumplimiento', 'Última visita'],
      ...providerStats(data, () => true).sort((a, b) => b.total - a.total)
        .map(e => [e.name, e.prog, e.ontime, e.late, e.absent, e.sc, fmtP(e.punt), e.delayProm, fmtP(e.cump), e.last])] },
  ], `ProviControl_Todo_${todayISO()}`)
}
