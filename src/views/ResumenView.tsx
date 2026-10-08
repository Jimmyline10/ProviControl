import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { Dona } from '../components/Dona'
import { Icon } from '../components/Icon'
import { DeltaTag, Kpi } from '../components/Kpi'
import { calc, capacityDay, delta, inWeekF, providerStats, tone } from '../logic/indicators'
import { makeDemo } from '../logic/demo'
import { buildReport } from '../logic/interpretation'
import { weeksSeries } from '../logic/summary'
import { exportExec, notifyExport } from '../services/exportExcel'
import { addDays, fmtLong, fmtShort, weekEnd } from '../utils/date'
import { fmtP, pct } from '../utils/format'
import { Alerts } from './resumen/Alerts'
import { Interpretation } from './resumen/Interpretation'

export function ResumenView() {
  const { data, cfg, week, addData } = useApp()
  const { confirm, toast } = useUI()
  const r = calc(data, inWeekF(week)), p = calc(data, inWeekF(addDays(week, -7))), ser = weeksSeries(data, week, 8)
  const empty = !data.appointments.length && !data.walkins.length
  const cap = capacityDay(cfg) * 6
  const ocup = pct(r.programadas, cap), ocupP = pct(p.programadas, cap)
  const rep = buildReport(data, cfg, week)
  const stats = providerStats(data, inWeekF(week))
  const top = stats.filter(e => e.total > 0).sort((a, b) => b.total - a.total || a.name.localeCompare(b.name)).slice(0, 5)
  const grand = stats.reduce((n, e) => n + e.total, 0) || 1
  const max = Math.max(r.programadas, r.atendCC, r.sc, r.absent, 1)
  const cmp: [string, number, string][] = [['Programadas', r.programadas, 'prog'], ['Llegaron con cita', r.atendCC, 'att'], ['Sin cita', r.sc, 'sc'], ['No llegaron', r.absent, 'abs']]
  const health: [string, string, ReturnType<typeof tone>, string][] = [
    ['Cumplimiento', fmtP(r.cumpGen), tone(r.cumpGen, cfg.metaCump, 60), `Meta ≥ ${cfg.metaCump}%`],
    ['Puntualidad', fmtP(r.punt), tone(r.punt, cfg.metaPunt, 60), `Meta ≥ ${cfg.metaPunt}%`],
    ['Improvisación', fmtP(r.impr), tone(r.impr, cfg.maxImpr, 30, true), `Meta ≤ ${cfg.maxImpr}%`],
    ['Inasistencias', fmtP(r.inas), tone(r.inas, cfg.maxAbs, 10, true), `Meta ≤ ${cfg.maxAbs}%`]]

  const loadDemo = async () => {
    if (!empty && !(await confirm('Se agregarán datos de ejemplo junto a los registros actuales. Podrá quitarlos después sin perder los suyos.', 'Agregar ejemplo'))) return
    addData(makeDemo(cfg)); toast('Datos de ejemplo cargados.')
  }

  return (
    <>
      <div className="view-head"><span className="vh-ico"><Icon name="dashboard" size={24} /></span><div><h1>Panel ejecutivo</h1>
        <p>Semana del {fmtLong(week)} al {fmtLong(weekEnd(week))}. Los porcentajes comparan contra la semana anterior.</p></div>
        <div className="view-actions no-print">
          <button className="btn ghost" onClick={() => window.print()}><Icon name="printer" size={15} />Imprimir</button>
          <button className="btn primary" onClick={() => notifyExport(exportExec(data, cfg, week), toast)}><Icon name="download" size={15} />Exportar a Excel</button>
        </div></div>
      {empty && <div className="banner"><span><b>Aún no hay datos.</b> Programe su primera cita en <a href="#agenda">Agenda</a>, o cargue datos de ejemplo para explorar todas las ventanas.</span>
        <button className="btn navy sm" onClick={loadDemo}>Cargar datos de ejemplo</button></div>}
      <section className="exec-section" style={{ marginTop: 0 }}>
        <h2 className="section-title">Indicadores clave</h2>
        <div className="exec-kpi-grid k8">
          <Kpi c="n" ico="list" lbl="Citas programadas" val={r.programadas} sub={`${r.pending} pendientes de registrar`} extra={<span className="trend flat">{p.programadas} sem. ant.</span>} />
          <Kpi c={tone(r.cumpGen, cfg.metaCump, 60)} ico="checkCircle" lbl="Cumplimiento general" val={fmtP(r.cumpGen)} sub="A tiempo ÷ (programadas + sin cita)" extra={<DeltaTag d={delta(r.cumpGen, p.cumpGen)} />} />
          <Kpi c={tone(r.punt, cfg.metaPunt, 60)} ico="target" lbl="Puntualidad" val={fmtP(r.punt)} sub="A tiempo ÷ llegaron con cita" extra={<DeltaTag d={delta(r.punt, p.punt)} />} />
          <Kpi c={tone(r.cumpCita, cfg.metaCump, 60)} ico="calendarCheck" lbl="Cumplimiento de cita" val={fmtP(r.cumpCita)} sub="Con cita ÷ total recibidos (Excel)" extra={<DeltaTag d={delta(r.cumpCita, p.cumpCita)} />} />
          <Kpi c={tone(r.impr, cfg.maxImpr, 30, true)} ico="zap" lbl="Improvisación" val={fmtP(r.impr)} sub="Sin cita ÷ esperados" extra={<DeltaTag d={delta(r.impr, p.impr, true)} />} />
          <Kpi c={tone(r.inas, cfg.maxAbs, 10, true)} ico="userX" lbl="Inasistencia" val={fmtP(r.inas)} sub="No llegaron ÷ programadas" extra={<DeltaTag d={delta(r.inas, p.inas, true)} />} />
          <Kpi c={r.late ? tone(r.delayProm, cfg.maxDelay, 30, true) : 'n'} ico="clock" lbl="Retraso promedio" val={r.late ? r.delayProm + ' min' : '—'}
            sub={`${r.late} tardanza(s) · máx. ${r.delayMax} min`} extra={<DeltaTag unit=" min" d={delta(r.late ? r.delayProm : null, p.late ? p.delayProm : null, true)} />} />
          <Kpi c="purple" ico="grid" lbl="Ocupación de agenda" val={fmtP(ocup)} sub={`${r.programadas} de ${cap} espacios`} extra={<DeltaTag d={delta(ocup, ocupP)} />} />
        </div>

        <div className="exec-charts">
          <div className="exec-panel"><div className="panel-h"><Icon name="pie" size={16} /><h3>Estado de las citas</h3></div><div className="hint">Composición de la semana</div><Dona r={r} /></div>
          <div className="exec-panel"><div className="panel-h"><Icon name="bars" size={16} /><h3>Volumen comparativo</h3></div><div className="hint">Programadas · llegadas · sin cita · inasistencias</div>
            {cmp.map(([l, v, c]) => (
              <div key={l} className="cmp-row"><span className="lbl">{l}</span>
                <div className="cmp-track"><div className={'cmp-fill ' + c} style={{ width: `${(v / max) * 100}%` }}>{v / max >= .2 ? v : ''}</div></div>
                <span className="val">{v}</span></div>))}
          </div>
          <div className="exec-panel"><div className="panel-h"><Icon name="trophy" size={16} /><h3>Top 5 proveedores</h3></div><div className="hint">Más atenciones de la semana</div>
            {top.length ? <div className="top-list">{top.map((e, i) => (
              <div key={e.key} className="top-item"><div className="pos">{i + 1}</div>
                <div><div className="name">{e.name}</div><div className="detail">{e.total} atención{e.total !== 1 ? 'es' : ''}{e.sc ? ' · ' + e.sc + ' sin cita' : ''}</div></div>
                <div className="pct">{((e.total / grand) * 100).toFixed(1)}%<small>del total</small></div></div>))}</div>
              : <div className="empty-top">Aún no hay atenciones esta semana</div>}
          </div>
        </div>

        <div className="exec-charts two">
          <div className="exec-panel"><div className="panel-h"><Icon name="trend" size={16} /><h3>Cumplimiento general · últimas 8 semanas</h3></div>
            <div className="hint">Verde ≥ {cfg.metaCump}%, naranja 60–{cfg.metaCump - 1}%, rojo &lt; 60%</div>
            <div className="trend-chart">{ser.map(s => {
              const v = s.r.cumpGen, cls = v == null ? '' : v >= cfg.metaCump ? 'good' : v >= 60 ? 'warn' : 'bad'
              return <div key={s.w} className="trend-bar" title={`Semana ${fmtShort(s.w)}: ${fmtP(v)} (${s.r.ontime}/${s.r.esperados})`}>
                <div className="pct">{fmtP(v)}</div><div className={'col ' + cls} style={{ height: `${Math.max(4, v || 0)}%` }} />
                <div className="lab"><b>{fmtShort(s.w)}</b></div></div>
            })}</div></div>
          <div className="exec-panel"><div className="panel-h"><Icon name="bell" size={16} /><h3>Alertas</h3></div><div className="hint">Lo que conviene atender</div><Alerts r={r} /></div>
        </div>

        <h2 className="section-title">Salud operativa</h2>
        <div className="health-grid">{health.map(([l, v, t, m]) => (
          <div key={l} className={'health-card ' + (t === 'o' ? 'warn' : t === 'r' ? 'bad' : t === 'g' ? '' : 'none')}>
            <span className="status-dot" />
            <div className="info"><div className="lbl">{l}</div><div className="val">{v}</div><div className="msg">{m}</div></div></div>))}
        </div>

        <h2 className="section-title">Resumen ejecutivo e interpretación estadística</h2>
        <div className="exec-summary">
          <div className="panel-h"><Icon name="fileText" size={16} /><h3>Informe de la semana</h3><span className="panel-sub">{rep.period}</span></div>
          <Interpretation rep={rep} />
        </div>
      </section>
    </>
  )
}
