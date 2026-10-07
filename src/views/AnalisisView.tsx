import { DAYS, DAYS_FULL, DAYS_SHORT, HOURS } from '../constants'
import { ScopeSeg } from '../components/ScopeSeg'
import { Sparkline } from '../components/Sparkline'
import { useApp } from '../context/AppContext'
import { analyze } from '../logic/analysis'
import { calc, capacityDay, inWeekF, scopeLabel } from '../logic/indicators'
import { weeksSeries } from '../logic/summary'
import { addDays, fmtShort, hh } from '../utils/date'
import { pct } from '../utils/format'

const Bars = ({ rows, meta }: { rows: { l: string; n: number; on: number }[]; meta: number }) => (
  <div className="hbars">{rows.map(x => {
    const p = pct(x.on, x.n), c = p == null ? '#cbd5e1' : p >= meta ? '#548235' : p >= 60 ? '#ED7D31' : '#C00000'
    return <div key={x.l} className="row"><span className="l">{x.l}</span>
      <div className="track"><i style={{ width: `${p || 0}%`, background: c }} /></div>
      <span className="n">{p == null ? '—' : p + '%'} <small style={{ color: '#8794a5', fontWeight: 600 }}>n={x.n}</small></span></div>
  })}</div>
)
const Insight = ({ l, v, s, color }: { l: string; v: string; s: string; color?: string }) =>
  <div className="insight-card"><div className="l">{l}</div><div className="v" style={color ? { color } : undefined}>{v}</div><div className="s">{s}</div></div>

export function AnalisisView() {
  const { data, cfg, week, scope } = useApp()
  const a = analyze(data, cfg, week, scope)
  const ser = weeksSeries(data, week, 8), labels = ser.map(s => fmtShort(s.w))
  const prev = calc(data, inWeekF(addDays(week, -7))), cur = calc(data, inWeekF(week))
  const cap = capacityDay(cfg)
  const cmp: [string, number | null, number | null, boolean, string][] = [
    ['Citas programadas', cur.programadas, prev.programadas, false, ''], ['Llegaron con cita', cur.atendCC, prev.atendCC, false, ''],
    ['Sin cita', cur.sc, prev.sc, true, ''], ['No llegaron', cur.absent, prev.absent, true, ''],
    ['Cumplimiento general', cur.cumpGen, prev.cumpGen, false, '%'], ['Puntualidad', cur.punt, prev.punt, false, '%'],
    ['Cumplimiento de cita', cur.cumpCita, prev.cumpCita, false, '%'],
    ['Retraso promedio', cur.late ? cur.delayProm : null, prev.late ? prev.delayProm : null, true, ' min']]
  const sparks: [string, (number | null)[], string, (v: number) => string][] = [
    ['Cumplimiento general', ser.map(s => s.r.cumpGen), '#2E75B6', v => v + '%'],
    ['Puntualidad', ser.map(s => s.r.punt), '#548235', v => v + '%'],
    ['Sin cita (cantidad)', ser.map(s => s.r.sc), '#C00000', v => String(v)],
    ['Retraso promedio', ser.map(s => (s.r.late ? s.r.delayProm : null)), '#ED7D31', v => v + ' min']]
  const { best, worst, freq, maxDel } = a
  const empty = !a.A.length && !a.W.length

  return (
    <>
      <div className="view-head"><div><h1>Análisis estadístico</h1><p>{scopeLabel(scope, week)}. Las tendencias siempre muestran las últimas 8 semanas.</p></div><ScopeSeg /></div>
      <div className="insights" style={{ marginBottom: 14 }}>
        <Insight l="Hora pico" v={a.peakH < 0 ? '—' : hh(a.peakH)} s={`${a.peakN} movimientos`} />
        <Insight l="Día más cargado" v={a.peakD < 0 ? '—' : DAYS_FULL[a.peakD]} s={`${a.peakDN} movimientos`} />
        <Insight l="Más frecuente" v={freq ? freq.name : '—'} s={freq ? freq.total + ' atenciones' : 'sin datos'} />
        <Insight l="Mayor retraso" v={maxDel ? maxDel.delay + ' min' : '—'} s={maxDel ? maxDel.provider + ' · ' + fmtShort(maxDel.date) : 'sin tardanzas'} />
        <Insight l="Mejor cumplimiento" color="var(--green)" v={best ? best.name : '—'} s={best ? `${best.cump}% en ${best.total} visitas (mín. 3)` : 'se requieren ≥ 3 visitas'} />
        <Insight l="A vigilar" color="var(--red)" v={worst && worst.cump! < cfg.metaCump ? worst.name : '—'}
          s={worst && worst.cump! < cfg.metaCump ? `${worst.cump}% en ${worst.total} visitas` : 'nadie por debajo de la meta'} />
      </div>
      {empty && <div className="banner warn"><span>No hay datos en este periodo. Cambie el periodo o cargue datos en <a href="#ajustes">Datos y ajustes</a>.</span></div>}
      <div className="stack-v">
        <div className="card"><div className="card-h"><h3>🔥 Mapa de carga: día × hora</h3><span className="hint">Citas + sin cita. Más oscuro = más movimiento</span></div>
          <div className="card-b"><div className="tblwrap"><table className="heat" style={{ minWidth: 560 }}>
            <thead><tr><th className="h" />{DAYS_SHORT.map(d => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>{HOURS.map((hr, hi) => (
              <tr key={hr}><th className="h">{hh(hr)}</th>{DAYS.map((_, d) => {
                const c = a.mat[d][hi], k = c.n / a.mxN
                return <td key={d} style={c.n ? { background: `rgba(31,78,121,${(.12 + k * .88).toFixed(2)})`, color: k > .45 ? '#fff' : '#1F4E79' } : undefined}
                  title={`${DAYS_FULL[d]} ${hh(hr)}: ${c.n} movimientos${c.arr ? ', ' + c.late + ' tarde de ' + c.arr + ' llegadas' : ''}`}>{c.n || ''}</td>
              })}</tr>))}</tbody>
          </table></div></div></div>

        <div className="grid2">
          <div className="card"><div className="card-h"><h3>🕐 Puntualidad por franja horaria</h3><span className="hint">% a tiempo de las llegadas con cita</span></div><div className="card-b"><Bars rows={a.byHour} meta={cfg.metaPunt} /></div></div>
          <div className="card"><div className="card-h"><h3>📆 Puntualidad por día</h3><span className="hint">% a tiempo de las llegadas con cita</span></div><div className="card-b"><Bars rows={a.byDay} meta={cfg.metaPunt} /></div></div>
        </div>

        <div className="grid3">
          <div className="card"><div className="card-h"><h3>⏱️ Distribución de retrasos</h3><span className="hint">{a.r.delays.length} tardanzas</span></div>
            <div className="card-b"><div className="cols-chart">{a.B.map(b => <div key={b.l} className="c"><span className="t">{b.n || ''}</span><div className="b" style={{ height: `${(b.n / a.mxB) * 80}%`, background: '#ED7D31' }} /></div>)}</div>
              <div className="cols-lab">{a.B.map(b => <span key={b.l}>{b.l}</span>)}</div></div></div>
          <div className="card"><div className="card-h"><h3>🧩 Con cita vs sin cita por día</h3></div>
            <div className="card-b"><div className="cols-chart">{a.mix.map(m => (
              <div key={m.l} className="c"><span className="t">{m.c + m.s || ''}</span>
                <div className="b" style={{ height: `${((m.c + m.s) / a.mxM) * 80}%` }}>
                  {m.s ? <i style={{ height: `${(m.s / (m.c + m.s)) * 100}%`, background: '#C00000' }} /> : null}
                  {m.c ? <i style={{ height: `${(m.c / (m.c + m.s)) * 100}%`, background: '#548235' }} /> : null}</div></div>))}</div>
              <div className="cols-lab">{a.mix.map(m => <span key={m.l}>{m.l}</span>)}</div>
              <div className="legend-inline"><span><i style={{ background: '#548235' }} />Con cita</span><span><i style={{ background: '#C00000' }} />Sin cita</span></div></div></div>
          <div className="card"><div className="card-h"><h3>🧱 Ocupación de la agenda</h3><span className="hint">Promedio por día (capacidad {cap})</span></div>
            <div className="card-b"><div className="hbars">{a.occ.map(o => (
              <div key={o.l} className="row"><span className="l">{o.l}</span>
                <div className="track"><i style={{ width: `${Math.min(100, o.p)}%`, background: o.p >= 90 ? '#C00000' : o.p >= 70 ? '#ED7D31' : '#2E75B6' }} /></div>
                <span className="n">{o.p}%</span></div>))}</div></div></div>
        </div>

        <div className="card"><div className="card-h"><h3>📈 Tendencia de las últimas 8 semanas</h3><span className="hint">Pase el cursor sobre un punto para ver el valor</span></div>
          <div className="card-b"><div className="grid2" style={{ gridTemplateColumns: 'repeat(4,minmax(0,1fr))' }}>
            {sparks.map(([t, vals, col, fmt]) => (
              <div key={t} className="spark-card"><div className="l"><span>{t}</span></div>
                <Sparkline vals={vals} color={col} fmt={fmt} labels={labels} />
                <div className="x"><span>{labels[0]}</span><span>{labels[labels.length - 1]}</span></div></div>))}
          </div></div></div>

        <div className="card"><div className="card-h"><h3>↔️ Esta semana vs semana anterior</h3></div>
          <div className="tblwrap"><table className="t">
            <thead><tr><th>Indicador</th><th className="r">Esta semana</th><th className="r">Semana anterior</th><th className="r">Variación</th></tr></thead>
            <tbody>{cmp.map(([name, c, p, lower, unit]) => {
              const d = c == null || p == null ? null : c - p
              const good = d == null || d === 0 ? null : lower ? d < 0 : d > 0
              const fm = (v: number | null) => (v == null ? '—' : v + unit)
              return <tr key={name}><td className="prov">{name}</td><td className="r">{fm(c)}</td><td className="r">{fm(p)}</td>
                <td className="r">{d == null ? '—' : <span className={'pill ' + (d === 0 ? 's' : good ? 'g' : 'r')}>
                  {d > 0 ? '▲ +' : d < 0 ? '▼ ' : '= '}{d === 0 ? '0' : d}{unit === ' min' ? ' min' : unit === '%' ? ' pp' : ''}</span>}</td></tr>
            })}</tbody></table></div></div>
      </div>
    </>
  )
}
