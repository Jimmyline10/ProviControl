/* Interpretación estadística formal de la semana: resumen ejecutivo, indicadores con
   intervalos de confianza, análisis por apartados, lectura por día y recomendaciones.
   Los textos usan **negrita** como marcado mínimo (la vista la resalta, el Excel la quita). */
import { DAYS_FULL, HOURS } from '../constants'
import type { AppData, Config } from '../types'
import { addDays, fmtLong, hh, weekEnd } from '../utils/date'
import { pct } from '../utils/format'
import { calc, capacityDay, inWeekF, providerStats, tone } from './indicators'
import type { Indicators, Tone } from './indicators'
import { cv, mean, meanCI, median, percentile, sd, slope, wilson } from './stats'
import { weeksSeries } from './summary'

export interface KpiRow { name: string; value: string; ci: string; meta: string; tone: Tone; delta: string; hist: string; reading: string }
export type DayState = 'none' | 'pending' | 'prelim' | 'ok'
export interface DayRow {
  label: string; date: string; prog: number; sc: number; recib: number
  cump: number | null; punt: number | null; inas: number | null; tone: Tone; state: DayState; text: string
}
export interface Section { title: string; paras: string[] }
export interface Report {
  period: string; empty: boolean
  verdict: { tone: Tone; label: string; text: string }
  kpis: KpiRow[]; sections: Section[]; days: DayRow[]; dayNote: string; recs: string[]; method: string[]
}

const sg = (d: number) => (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(Math.round(d * 10) / 10)
const s = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`
const list = (a: string[]) => a.length <= 1 ? a.join('') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1]
const rnd = (v: number | null) => (v == null ? null : Math.round(v))

interface Def {
  name: string; v: number | null; ci: [number, number] | null; meta: number; ok: number; inv?: boolean
  prev: number | null; hist: number[]; unit: '%' | ' min'
}

function kpiRow(d: Def): KpiRow {
  const u = d.unit === '%' ? ' pp' : ' min'
  const t = tone(d.v, d.meta, d.ok, d.inv)
  const row: KpiRow = {
    name: d.name, value: d.v == null ? '—' : d.v + d.unit, ci: d.ci ? `${d.ci[0]}–${d.ci[1]}${d.unit}` : '—',
    meta: (d.inv ? '≤ ' : '≥ ') + d.meta + d.unit, tone: t,
    delta: d.v == null || d.prev == null ? '—' : sg(d.v - d.prev) + u,
    hist: d.hist.length >= 2 ? `${rnd(mean(d.hist))}${d.unit} ± ${rnd(sd(d.hist))}` : d.hist.length === 1 ? d.hist[0] + d.unit : '—',
    reading: 'Sin datos para evaluar.',
  }
  if (d.v == null) return row
  const gap = Math.abs(d.v - d.meta), meets = d.inv ? d.v <= d.meta : d.v >= d.meta
  let r = meets ? (gap === 0 ? 'En el límite de la meta' : `Cumple la meta (margen de ${gap}${u})`)
    : d.inv ? `Supera el máximo en ${gap}${u}` : `Bajo la meta en ${gap}${u}`
  if (d.ci) {
    const [lo, hi] = d.ci
    const conclusive = d.inv ? hi <= d.meta || lo > d.meta : lo >= d.meta || hi < d.meta
    r += conclusive ? '; estadísticamente concluyente' : '; no concluyente (el IC 95% incluye la meta)'
  }
  const m = mean(d.hist), sdev = sd(d.hist)
  if (d.hist.length >= 4 && m != null && sdev) {
    const z = (d.v - m) / sdev
    if (Math.abs(z) >= 2) r += `; valor atípico frente al histórico (z = ${sg(z)})`
    else if (Math.abs(z) >= 1) r += `; ${z > 0 ? 'por encima' : 'por debajo'} de lo habitual (z = ${sg(z)})`
  }
  row.reading = r + '.'
  return row
}

const prop = (x: number, n: number) => (n > 0 ? wilson(x, n) : null)

export function buildReport(data: AppData, cfg: Config, week: string): Report {
  const inW = inWeekF(week)
  const r = calc(data, inW), p = calc(data, inWeekF(addDays(week, -7)))
  const ser = weeksSeries(data, week, 8)
  const prevWeeks = ser.slice(0, -1).filter(x => x.r.esperados > 0).map(x => x.r)
  const hist = (f: (x: Indicators) => number | null) => prevWeeks.map(f).filter((v): v is number => v != null)
  const period = `Semana del ${fmtLong(week)} al ${fmtLong(weekEnd(week))}`
  const cap = capacityDay(cfg) * 6, ocup = pct(r.programadas, cap)
  const prelim = r.pending > 0
  /* evaluable: hay al menos un hecho registrado (llegada, inasistencia o sin cita); solo citas pendientes no permite evaluar */
  const evaluable = r.ontime + r.late + r.absent + r.sc > 0

  /* ---- indicadores ---- */
  const defs: Def[] = [
    { name: 'Cumplimiento general', v: r.cumpGen, ci: prop(r.ontime, r.esperados), meta: cfg.metaCump, ok: 60, prev: p.cumpGen, hist: hist(x => x.cumpGen), unit: '%' },
    { name: 'Puntualidad', v: r.punt, ci: prop(r.ontime, r.atendCC), meta: cfg.metaPunt, ok: 60, prev: p.punt, hist: hist(x => x.punt), unit: '%' },
    { name: 'Cumplimiento de cita', v: r.cumpCita, ci: prop(r.atendCC, r.atendidos), meta: cfg.metaCump, ok: 60, prev: p.cumpCita, hist: hist(x => x.cumpCita), unit: '%' },
    { name: 'Improvisación', v: r.impr, ci: prop(r.sc, r.esperados), meta: cfg.maxImpr, ok: 30, inv: true, prev: p.impr, hist: hist(x => x.impr), unit: '%' },
    { name: 'Inasistencia', v: r.inas, ci: prop(r.absent, r.programadas), meta: cfg.maxAbs, ok: 10, inv: true, prev: p.inas, hist: hist(x => x.inas), unit: '%' },
    { name: 'Retraso promedio', v: r.late ? r.delayProm : null, ci: meanCI(r.delays), meta: cfg.maxDelay, ok: 30, inv: true,
      prev: p.late ? p.delayProm : null, hist: hist(x => (x.late ? x.delayProm : null)), unit: ' min' },
  ]
  const kpis = defs.map(kpiRow)

  /* ---- tendencia ---- */
  const trendVals = ser.filter(x => x.r.cumpGen != null && x.r.esperados > 0).map(x => x.r.cumpGen!)
  const b = slope(trendVals)
  const trendWord = b == null ? '' : Math.abs(b) < 1 ? 'estable' : b > 0 ? 'creciente' : 'decreciente'

  /* ---- veredicto ---- */
  const evaluated = kpis.filter(k => k.tone !== 'n')
  const nG = evaluated.filter(k => k.tone === 'g').length, nO = evaluated.filter(k => k.tone === 'o').length, nR = evaluated.filter(k => k.tone === 'r').length
  const gTone = tone(r.cumpGen, cfg.metaCump, 60)
  const label = r.esperados === 0 ? 'Sin datos suficientes' : !evaluable ? 'Pendiente de evaluación' : gTone === 'g' ? 'Desempeño satisfactorio' : gTone === 'o' ? 'Desempeño con observaciones' : 'Desempeño crítico'
  const ciG = prop(r.ontime, r.esperados)
  const verdictText = r.esperados === 0
    ? `${period}: no se registraron citas ni ingresos sin cita, por lo que no es posible emitir una evaluación del periodo.`
    : !evaluable
    ? `${period}: se programaron **${s(r.programadas, 'cita')}**, todas pendientes de registro de llegada. No es posible evaluar el desempeño hasta que se registren las llegadas o inasistencias.`
    : `${period}: el cumplimiento general fue de **${r.cumpGen}%**${ciG ? ` (IC 95%: ${ciG[0]}–${ciG[1]}%)` : ''} frente a una meta de ${cfg.metaCump}%. `
      + `De los ${evaluated.length} indicadores evaluados, ` + list([
        `**${nG} cumple${nG === 1 ? '' : 'n'} su meta**`,
        ...(nO ? [`${nO} se encuentra${nO === 1 ? '' : 'n'} en observación`] : []),
        ...(nR ? [`${nR} en nivel crítico`] : [])]) + '.'
      + (trendWord ? ` La tendencia de las últimas semanas es ${trendWord}.` : '')
      + (prelim ? ` Resultados preliminares: ${s(r.pending, 'cita')} sin registro de llegada.` : '')

  /* ---- apartados ---- */
  const sections: Section[] = []
  if (evaluable) {
    const vol = [`Se programaron **${r.programadas}** citas y se registraron **${r.sc}** ingresos sin cita, para un total de **${r.esperados}** recepciones esperadas. `
      + `Se recibieron efectivamente **${r.atendidos}** (${r.ontime} a tiempo, ${r.late} con tardanza y ${r.sc} sin cita)`
      + (r.absent ? ` y se ${r.absent === 1 ? 'registró' : 'registraron'} **${s(r.absent, 'inasistencia')}**.` : '; no se registraron inasistencias.')]
    if (r.cumpCita != null) vol.push(`El **${r.cumpCita}%** de las recepciones se realizó con cita previa. La ocupación de la agenda alcanzó el **${ocup}%** de la capacidad semanal (${r.programadas} de ${cap} espacios).`)
    if (r.esperados < 30) vol.push(`Dado el tamaño reducido de la muestra (n = ${r.esperados}), los intervalos de confianza son amplios y los porcentajes deben interpretarse con cautela.`)
    sections.push({ title: 'Desempeño general', paras: vol })

    const pun: string[] = []
    if (r.atendCC) {
      const ci = prop(r.ontime, r.atendCC)
      pun.push(`De las ${s(r.atendCC, 'llegada')} con cita, ${r.ontime} fueron puntuales, lo que representa una puntualidad de **${r.punt}%**${ci ? ` (IC 95%: ${ci[0]}–${ci[1]}%)` : ''} frente a una meta de ${cfg.metaPunt}%.`)
    } else pun.push('No se registraron llegadas con cita en el periodo, por lo que no es posible evaluar la puntualidad.')
    if (r.delays.length) {
      const md = median(r.delays)!, p90 = percentile(r.delays, 90)!, sdv = sd(r.delays)
      pun.push(`Los ${s(r.delays.length, 'retraso')} registrado${r.delays.length === 1 ? '' : 's'} promediaron **${r.delayProm} min** (mediana ${Math.round(md)} min`
        + (sdv != null ? `; desviación estándar ${Math.round(sdv)} min` : '') + `; percentil 90: ${Math.round(p90)} min; máximo ${r.delayMax} min).`
        + (r.delays.length >= 3 && r.delayProm > md * 1.2 ? ' La media supera a la mediana, lo que indica una distribución asimétrica a la derecha: unos pocos retrasos prolongados elevan el promedio.' : ''))
    }
    const arr = data.appointments.filter(a => inW(a.date) && (a.status === 'ontime' || a.status === 'late'))
    const worstH = HOURS.map(h => { const x = arr.filter(a => a.hour === h); return { h, n: x.length, p: pct(x.filter(a => a.status === 'ontime').length, x.length) } })
      .filter(o => o.n >= 3 && o.p != null).sort((a, b) => a.p! - b.p!)[0]
    if (worstH && worstH.p! < cfg.metaPunt) pun.push(`La franja de las ${hh(worstH.h)} presentó la menor puntualidad (${worstH.p}%, n = ${worstH.n}).`)
    sections.push({ title: 'Puntualidad y retrasos', paras: pun })

    const pla: string[] = []
    if (r.impr != null) pla.push(`La improvisación (ingresos sin cita sobre recepciones esperadas) fue de **${r.impr}%** frente a un máximo de ${cfg.maxImpr}%`
      + (r.impr > 30 ? ', lo que evidencia una operación predominantemente reactiva.' : r.impr > cfg.maxImpr ? ', por encima del máximo tolerado.' : ', dentro del rango aceptable.'))
    if (r.inas != null) pla.push(`La inasistencia fue de **${r.inas}%** (${r.absent} de ${r.programadas} citas) frente a un máximo de ${cfg.maxAbs}%`
      + (r.inas > cfg.maxAbs ? ', por lo que se recomienda reforzar la confirmación previa de citas.' : '.'))
    if (prelim) pla.push(`Quedan **${s(r.pending, 'cita')}** sin registro de llegada (${pct(r.pending, r.programadas)}% de lo programado); mientras no se registren, reducen el cumplimiento y los resultados deben considerarse preliminares.`)
    sections.push({ title: 'Planificación', paras: pla })

    const tre: string[] = []
    if (b != null) {
      tre.push(`La serie de cumplimiento general de las últimas ${trendVals.length} semanas con datos presenta una pendiente de **${sg(b)} pp por semana**, lo que indica una tendencia ${trendWord}.`)
      const H = hist(x => x.cumpGen), m = mean(H), sdev = sd(H)
      if (r.cumpGen != null && m != null && sdev) {
        const z = (r.cumpGen - m) / sdev
        tre.push(`El promedio de las semanas previas fue de ${Math.round(m)}% (desviación estándar ${Math.round(sdev)} pp); el resultado actual se ubica `
          + (Math.abs(z) < 1 ? 'dentro del rango habitual.' : `${z > 0 ? 'por encima' : 'por debajo'} de lo habitual (z = ${sg(z)})${Math.abs(z) >= 2 ? ', lo que constituye un valor atípico' : ''}.`))
      }
    } else tre.push('No hay suficientes semanas con datos (mínimo 3) para estimar una tendencia.')
    sections.push({ title: 'Tendencia (últimas 8 semanas)', paras: tre })

    const ps = providerStats(data, inW).filter(e => e.total > 0).sort((a, b) => b.total - a.total)
    const tot = ps.reduce((n, e) => n + e.total, 0)
    const pro: string[] = []
    if (ps.length) {
      const top = ps.slice(0, 3), share = pct(top.reduce((n, e) => n + e.total, 0), tot) ?? 0
      pro.push(`Se atendieron **${s(ps.length, 'proveedor', 'proveedores')}** distintos. `
        + (ps.length > 3 ? `Los tres de mayor movimiento (${list(top.map(e => e.name))}) concentraron el **${share}%** de las recepciones${share > 50 ? ', lo que indica una alta concentración de la operación' : ''}.`
          : `El de mayor movimiento fue ${top[0].name} (${s(top[0].total, 'recepción', 'recepciones')}).`))
      const inc = ps.filter(e => e.late + e.absent >= 2)
      if (inc.length) pro.push(`Proveedores con dos o más incidencias (tardanzas o inasistencias): ${list(inc.slice(0, 5).map(e => `${e.name} (${e.late + e.absent})`))}${inc.length > 5 ? ` y ${inc.length - 5} más` : ''}.`)
      const crit = ps.filter(e => e.total >= 3 && e.cump != null && e.cump < 60)
      if (crit.length) pro.push(`En nivel crítico (cumplimiento menor a 60% con al menos 3 recepciones): ${list(crit.slice(0, 5).map(e => `${e.name} (${e.cump}%)`))}.`)
    }
    if (pro.length) sections.push({ title: 'Proveedores', paras: pro })
  }

  /* ---- por día ---- */
  const days: DayRow[] = DAYS_FULL.map((label, i) => {
    const date = addDays(week, i), x = calc(data, d => d === date)
    const registered = x.ontime + x.late + x.absent + x.sc
    const state: DayState = x.esperados === 0 ? 'none' : registered === 0 ? 'pending' : x.pending > 0 ? 'prelim' : 'ok'
    let text: string
    if (state === 'none') text = 'Sin operaciones programadas ni registradas.'
    else if (state === 'pending') text = `${s(x.pending, 'cita programada', 'citas programadas')} pendiente${x.pending === 1 ? '' : 's'} de registro; aún no es posible evaluar el día.`
    else {
      const c = x.cumpGen!
      const rel = c >= cfg.metaCump ? 'por encima de la meta' : `${cfg.metaCump - c} pp por debajo de la meta`
      const dev = r.cumpGen != null ? ` y ${sg(c - r.cumpGen)} pp respecto del resultado semanal` : ''
      const drivers: [number, string][] = [
        [x.absent, x.absent === 1 ? 'una inasistencia' : `las inasistencias (${x.absent})`],
        [x.late, x.late === 1 ? `una tardanza de ${x.delayProm} min` : `las tardanzas (${x.late}; retraso promedio ${x.delayProm} min)`],
        [x.sc, x.sc === 1 ? `un ingreso sin cita (${x.impr}% de lo esperado)` : `los ingresos sin cita (${x.sc}; ${x.impr}% de lo esperado)`],
      ]
      const top = drivers.filter(d => d[0] > 0).sort((a, b) => b[0] - a[0])[0]
      text = `Cumplimiento de **${c}%** (${x.ontime} a tiempo de ${x.esperados} esperados), ${rel}${dev}. `
        + (top ? `El principal factor de incumplimiento ${top[0] === 1 ? 'fue' : 'fueron'} ${top[1]}.` : 'Sin incidencias registradas.')
        + (state === 'prelim' ? ` Resultado preliminar: ${s(x.pending, 'cita')} sin registrar.` : '')
    }
    return { label, date, prog: x.programadas, sc: x.sc, recib: x.atendidos, cump: state === 'ok' || state === 'prelim' ? x.cumpGen : null,
      punt: x.punt, inas: x.inas, tone: state === 'ok' || state === 'prelim' ? tone(x.cumpGen, cfg.metaCump, 60) : 'n', state, text }
  })
  const ev = days.filter(d => d.cump != null)
  let dayNote = 'Se requieren al menos dos días evaluados para comparar el desempeño diario.'
  if (ev.length >= 2) {
    const best = [...ev].sort((a, b) => b.cump! - a.cump!)[0], worst = [...ev].sort((a, b) => a.cump! - b.cump!)[0]
    const c = cv(ev.map(d => d.cump!))
    dayNote = `Entre los ${ev.length} días evaluados, el mejor resultado correspondió al **${best.label}** (${best.cump}%) y el más bajo al **${worst.label}** (${worst.cump}%), con una amplitud de ${best.cump! - worst.cump!} pp.`
      + (c != null ? ` El coeficiente de variación del cumplimiento diario fue de ${Math.round(c)}%, lo que indica una dispersión ${c < 15 ? 'baja' : c <= 30 ? 'moderada' : 'alta'} entre días.` : '')
  }

  /* ---- recomendaciones ---- */
  const recs: string[] = []
  if (evaluable) {
    const ps = providerStats(data, inW)
    if (prelim) recs.push(`Registrar la llegada de las ${s(r.pending, 'cita')} pendiente${r.pending === 1 ? '' : 's'} para cerrar los indicadores del periodo.`)
    if (r.inas != null && r.inas > cfg.maxAbs) {
      const who = ps.filter(e => e.absent > 0).sort((a, b) => b.absent - a.absent).slice(0, 3).map(e => e.name)
      recs.push(`Confirmar las citas con 24 horas de anticipación, con prioridad para los proveedores con inasistencias${who.length ? ` (${list(who)})` : ''}.`)
    }
    if (r.impr != null && r.impr > cfg.maxImpr) {
      const who = ps.filter(e => e.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 3).map(e => e.name)
      recs.push(`Reducir los ingresos no programados comunicando la obligación de agendar a los proveedores recurrentes sin cita${who.length ? ` (${list(who)})` : ''}.`)
    }
    if (r.punt != null && r.punt < cfg.metaPunt) recs.push('Revisar con los proveedores impuntuales las ventanas horarias asignadas y evaluar el cumplimiento de los tiempos de traslado.')
    if (r.late && r.delayProm > cfg.maxDelay) recs.push(`Establecer una tolerancia máxima de ${cfg.maxDelay} minutos y reprogramar las entregas que la excedan.`)
    const full = days.map((d, i) => ({ d, n: data.appointments.filter(a => a.date === addDays(week, i)).length })).filter(o => o.n >= capacityDay(cfg) * 0.9)
    if (full.length) recs.push(`Redistribuir citas de ${list(full.map(o => o.d.label))}, cuya ocupación supera el 90% de la capacidad diaria.`)
    const worst = [...ev].sort((a, b) => a.cump! - b.cump!)[0]
    if (worst && worst.tone === 'r') recs.push(`Analizar las causas del bajo resultado del ${worst.label} (${worst.cump}%).`)
    if (b != null && b <= -1) recs.push('Dar seguimiento a la tendencia decreciente del cumplimiento con una revisión semanal de causas.')
    if (!recs.length) recs.push('Mantener las prácticas actuales y continuar con el monitoreo semanal de los indicadores.')
  }

  const method = [
    'Cumplimiento general = llegadas a tiempo ÷ (citas programadas + ingresos sin cita). Puntualidad = a tiempo ÷ llegadas con cita.',
    'Cumplimiento de cita = recepciones con cita ÷ total de recepciones. Improvisación = sin cita ÷ recepciones esperadas. Inasistencia = no llegaron ÷ citas programadas.',
    'Los intervalos de confianza al 95% de las proporciones se calculan con el método de Wilson; el del retraso promedio, con aproximación normal. Un resultado es estadísticamente concluyente respecto de la meta cuando el intervalo no la incluye.',
    'El histórico corresponde a las semanas previas con datos dentro de las últimas 8 (media ± desviación estándar) y la tendencia es la pendiente de mínimos cuadrados de esa serie.',
  ]

  return { period, empty: !evaluable, verdict: { tone: evaluable ? gTone : 'n', label, text: verdictText }, kpis, sections, days, dayNote, recs, method }
}

/** Texto plano (sin marcado) para exportar. */
export const plain = (t: string) => t.replace(/\*\*/g, '')
