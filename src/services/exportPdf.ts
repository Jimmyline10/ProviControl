import { DAYS, DAYS_SHORT, HOURS, ST } from '../constants'
import { apps, capacityDay, inWeekF } from '../logic/indicators'
import type { AppData, Appointment, Config, Status } from '../types'
import { addDays, dow, fmtLong, fmtShort, hh, nowHM, todayISO, weekEnd } from '../utils/date'
import { pct } from '../utils/format'

type RGB = [number, number, number]
const NAVY: RGB = [31, 78, 121], NAVY_D: RGB = [23, 63, 102], TEXT: RGB = [30, 41, 59], MUTED: RGB = [100, 116, 139], LINE: RGB = [221, 228, 236]
/** Mismos tonos que la agenda en pantalla: [fondo, borde, texto, acento] */
const TONE: Record<Status, RGB[]> = {
  pending: [[229, 244, 223], [191, 224, 177], [36, 86, 26], [63, 154, 43]],
  ontime: [[227, 238, 252], [181, 208, 243], [23, 69, 126], [29, 111, 209]],
  late: [[253, 239, 226], [246, 203, 167], [138, 63, 8], [237, 125, 49]],
  absent: [[253, 232, 231], [245, 188, 183], [155, 28, 18], [217, 45, 32]],
}
const DIM: RGB[] = [[246, 248, 250], [226, 232, 240], [160, 172, 188], [203, 213, 225]]

export interface PdfAgendaOpts {
  /** Horas visibles (filtro de turno) */
  hours?: number[]
  /** Citas que cumplen los filtros; las demás salen atenuadas */
  match?: (a: Appointment) => boolean
  /** Texto con los filtros aplicados, para dejar constancia en el documento */
  filterLabel?: string
}

/** Arma la agenda semanal en PDF (A4 horizontal). jsPDF se carga solo al exportar. */
export async function buildAgendaPdf(data: AppData, cfg: Config, week: string, opts: PdfAgendaOpts = {}) {
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = 297, H = 210, M = 10
  const hours = opts.hours?.length ? opts.hours : HOURS
  const match = opts.match ?? (() => true)
  const today = todayISO(), cap = capacityDay(cfg)
  const days = DAYS.map((name, i) => {
    const date = addDays(week, i), A = data.appointments.filter(a => a.date === date)
    const by = (st: Status) => A.filter(a => a.status === st).length
    return { name, date, A, n: A.length, ontime: by('ontime'), late: by('late'), absent: by('absent'), pending: by('pending') }
  })
  const total = days.reduce((n, d) => n + d.n, 0)
  const occ = pct(apps(data, inWeekF(week)).length, cap * 6) ?? 0

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2])
  const draw = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2])
  const color = (c: RGB) => doc.setTextColor(c[0], c[1], c[2])
  const font = (size: number, style: 'normal' | 'bold' = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size) }
  const fit = (s: string, w: number) => {
    if (doc.getTextWidth(s) <= w) return s
    while (s.length > 1 && doc.getTextWidth(s + '…') > w) s = s.slice(0, -1)
    return s + '…'
  }
  const pageHeader = (title: string) => {
    fill(NAVY); doc.rect(0, 0, W, 22, 'F')
    fill(NAVY_D); doc.rect(0, 20.5, W, 1.5, 'F')
    color([196, 213, 234]); font(7.5, 'bold'); doc.text('PROVICONTROL', M, 7)
    color([255, 255, 255]); font(15, 'bold'); doc.text(title, M, 13.5)
    color([196, 213, 234]); font(8.5)
    doc.text(`Semana del ${fmtLong(week)} al ${fmtLong(weekEnd(week))}  ·  ${cfg.slots} espacios por hora`, M, 18.3)
    font(8.5, 'bold'); color([255, 255, 255])
    doc.text(`${total} citas · Ocupación ${occ}%`, W - M, 11, { align: 'right' })
    font(7.5); color([196, 213, 234])
    doc.text(`Generado el ${fmtLong(today)} a las ${nowHM()}`, W - M, 16.5, { align: 'right' })
  }

  /* ===== Página 1: grilla semanal ===== */
  pageHeader('Agenda semanal de recepción')

  // Leyenda y filtros
  let lx = M; const ly = 28
  font(7.5)
  ;(['pending', 'ontime', 'late', 'absent'] as Status[]).forEach(s => {
    fill(TONE[s][3]); doc.circle(lx + 1.3, ly - 1.1, 1.3, 'F')
    color(TEXT); doc.text(ST[s], lx + 3.6, ly); lx += doc.getTextWidth(ST[s]) + 9
  })
  if (opts.filterLabel) { color(MUTED); font(7.5, 'bold'); doc.text('Filtros: ' + opts.filterLabel, W - M, ly, { align: 'right' }) }

  const gx = M, gy = 32, hourW = 22, dayW = (W - 2 * M - hourW) / 6
  const headH = 10, footH = 13
  const rowH = Math.min(26, (H - 9 - gy - headH - footH) / hours.length)
  const pad = 1.1, gap = 0.8, slotH = (rowH - 2 * pad - (cfg.slots - 1) * gap) / cfg.slots
  const colX = (i: number) => gx + hourW + i * dayW

  // Cabecera de días
  fill(NAVY_D); doc.rect(gx, gy, hourW, headH, 'F')
  color([255, 255, 255]); font(8.5, 'bold'); doc.text('HORA', gx + hourW / 2, gy + 6.3, { align: 'center' })
  days.forEach((d, i) => {
    fill(d.date === today ? [46, 117, 182] : NAVY); doc.rect(colX(i), gy, dayW, headH, 'F')
    color([255, 255, 255]); font(8.5, 'bold'); doc.text(d.name, colX(i) + dayW / 2, gy + 4.4, { align: 'center' })
    font(7); color([196, 213, 234])
    doc.text(`${fmtShort(d.date)}  ·  ${d.n} cita${d.n !== 1 ? 's' : ''}`, colX(i) + dayW / 2, gy + 8.2, { align: 'center' })
  })

  // Filas por hora
  hours.forEach((hr, r) => {
    const y = gy + headH + r * rowH
    fill([238, 243, 249]); doc.rect(gx, y, hourW, rowH, 'F')
    color(NAVY); font(8.5, 'bold'); doc.text(`${hh(hr)} – ${hh(hr + 1)}`, gx + hourW / 2, y + rowH / 2 + 1.2, { align: 'center' })
    days.forEach((d, di) => {
      const x = colX(di)
      if (d.date === today) { fill([245, 249, 255]); doc.rect(x, y, dayW, rowH, 'F') }
      for (let s = 1; s <= cfg.slots; s++) {
        const sx = x + pad, sy = y + pad + (s - 1) * (slotH + gap), sw = dayW - 2 * pad
        const a = d.A.find(z => z.hour === hr && z.slot === s)
        if (!a) {
          draw([214, 221, 230]); doc.setLineWidth(0.15); doc.setLineDashPattern([0.6, 0.6], 0)
          doc.roundedRect(sx, sy, sw, slotH, 0.8, 0.8, 'S'); doc.setLineDashPattern([], 0)
          color([190, 199, 210]); font(5.5); doc.text('#' + s, sx + 1.5, sy + slotH / 2 + 0.9)
          continue
        }
        const [bg, bd, fg, ac] = match(a) ? TONE[a.status] : DIM
        fill(bg); draw(bd); doc.setLineWidth(0.2); doc.roundedRect(sx, sy, sw, slotH, 0.8, 0.8, 'FD')
        fill(ac); doc.rect(sx, sy + 0.2, 0.9, slotH - 0.4, 'F')
        const fs = Math.min(6.3, slotH * 1.55), ty = sy + slotH / 2 + fs * 0.13
        const status = ST[a.status] + (a.status === 'late' ? ` +${a.delay}m` : '') + (a.arrival && a.status !== 'absent' ? ' ' + a.arrival : '')
        font(fs - 0.8); color(fg)
        const stW = doc.getTextWidth(status)
        doc.text(status, sx + sw - 1.2, ty, { align: 'right' })
        font(fs, 'bold')
        const label = `#${s} ${a.provider}`
        doc.text(fit(label, sw - stW - 4.5), sx + 2, ty)
        if (a.status === 'absent') { draw(fg); doc.setLineWidth(0.15); doc.line(sx + 2, ty - fs * 0.12, sx + 2 + Math.min(doc.getTextWidth(fit(label, sw - stW - 4.5)), sw - stW - 4.5), ty - fs * 0.12) }
      }
    })
  })

  // Totales por día
  const fy = gy + headH + hours.length * rowH
  fill([248, 250, 252]); doc.rect(gx, fy, W - 2 * M, footH, 'F')
  color(TEXT); font(12, 'bold'); doc.text(String(total), gx + hourW / 2, fy + 6, { align: 'center' })
  color(MUTED); font(6); doc.text('citas en la semana', gx + hourW / 2, fy + 9.8, { align: 'center' })
  days.forEach((d, i) => {
    const x = colX(i) + 2, w = dayW - 4, p = pct(d.n, cap) ?? 0
    color(TEXT); font(8, 'bold'); doc.text(`${d.n} agendada${d.n !== 1 ? 's' : ''}`, x, fy + 4.2)
    doc.text(p + '%', x + w, fy + 4.2, { align: 'right' })
    fill([226, 232, 240]); doc.roundedRect(x, fy + 5.6, w, 1.4, 0.7, 0.7, 'F')
    if (p > 0) { fill(p >= 90 ? [237, 125, 49] : [29, 95, 168]); doc.roundedRect(x, fy + 5.6, Math.max(1.4, w * Math.min(100, p) / 100), 1.4, 0.7, 0.7, 'F') }
    const parts = ([['ontime', 'a tiempo'], ['late', 'tarde'], ['absent', 'no llegó'], ['pending', 'program.']] as [Status, string][])
      .filter(([k]) => d[k] > 0).map(([k, l]) => `${d[k]} ${l}`)
    font(6); color(MUTED); doc.text(fit(parts.join(' · ') || 'Sin citas', w), x, fy + 10.6)
  })

  // Líneas de la grilla
  draw(LINE); doc.setLineWidth(0.2)
  for (let r = 0; r <= hours.length; r++) doc.line(gx, gy + headH + r * rowH, W - M, gy + headH + r * rowH)
  for (let i = 0; i <= 6; i++) doc.line(colX(i), gy + headH, colX(i), fy + footH)
  draw([201, 214, 229]); doc.setLineWidth(0.5); doc.line(gx + hourW, gy + headH, gx + hourW, fy + footH)
  draw(LINE); doc.setLineWidth(0.3); doc.rect(gx, gy, W - 2 * M, fy + footH - gy, 'S')

  /* ===== Página 2+: detalle de citas ===== */
  const list = data.appointments.filter(a => inWeekF(week)(a.date) && hours.includes(a.hour) && match(a))
    .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.slot - b.slot)
  if (list.length) {
    const cols: [string, number, 'left' | 'center'][] = [
      ['Fecha', 20, 'center'], ['Día', 14, 'center'], ['Hora', 26, 'center'], ['Esp.', 12, 'center'], ['Proveedor', 62, 'left'],
      ['Estado', 26, 'left'], ['Llegada', 18, 'center'], ['Retraso', 16, 'center'], ['Observaciones', W - 2 * M - 194, 'left'],
    ]
    const rh = 6.2
    let y = 0
    const tableHead = () => {
      doc.addPage(); pageHeader('Detalle de citas de la semana'); y = 28
      fill(NAVY); doc.rect(M, y, W - 2 * M, 7, 'F'); color([255, 255, 255]); font(7.5, 'bold')
      let x = M; cols.forEach(([t, w, al]) => { doc.text(t, al === 'center' ? x + w / 2 : x + 2, y + 4.7, { align: al }); x += w })
      y += 7
    }
    tableHead()
    list.forEach((a, i) => {
      if (y + rh > H - 12) tableHead()
      if (i % 2) { fill([248, 250, 252]); doc.rect(M, y, W - 2 * M, rh, 'F') }
      const [bg, , fg, ac] = TONE[a.status]
      const vals = [fmtShort(a.date), DAYS_SHORT[dow(a.date)], `${hh(a.hour)} – ${hh(a.hour + 1)}`, '#' + a.slot, a.provider,
        ST[a.status], a.status === 'absent' ? '—' : a.arrival || '—', a.delay ? a.delay + ' min' : '—', a.notes || '']
      let x = M
      cols.forEach(([, w, al], ci) => {
        if (ci === 5) {
          fill(bg); doc.roundedRect(x + 1, y + 1.1, w - 3, rh - 2.2, 1.6, 1.6, 'F')
          fill(ac); doc.circle(x + 3.2, y + rh / 2, 0.8, 'F')
          color(fg); font(7, 'bold'); doc.text(vals[ci], x + 5, y + 4.2)
        } else {
          color(ci === 4 ? TEXT : MUTED); font(7.5, ci === 4 ? 'bold' : 'normal')
          doc.text(fit(vals[ci], w - 4), al === 'center' ? x + w / 2 : x + 2, y + 4.2, { align: al })
        }
        x += w
      })
      draw(LINE); doc.setLineWidth(0.15); doc.line(M, y + rh, W - M, y + rh)
      y += rh
    })
  }

  // Pie de página con numeración
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); font(7); color(MUTED)
    doc.text('ProviControl · Agenda semanal de recepción', M, H - 4.5)
    doc.text(`Página ${p} de ${pages}`, W - M, H - 4.5, { align: 'right' })
  }
  return doc
}

/** Genera y descarga la agenda semanal en PDF. */
export const exportAgendaPdf = (data: AppData, cfg: Config, week: string, opts: PdfAgendaOpts = {}) =>
  buildAgendaPdf(data, cfg, week, opts).then(doc => doc.save(`Agenda_${week}.pdf`))
