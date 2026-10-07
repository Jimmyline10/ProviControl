import { useApp } from '../../context/AppContext'
import { inWeekF, providerStats } from '../../logic/indicators'
import type { Indicators } from '../../logic/indicators'
import { fmtLong, weekEnd } from '../../utils/date'
import { fmtP } from '../../utils/format'

export function SummaryText({ r }: { r: Indicators }) {
  const { data, cfg, week } = useApp()
  const state = r.cumpGen == null ? 'sin datos' : r.cumpGen >= cfg.metaCump ? 'buen desempeño' : r.cumpGen >= 60 ? 'desempeño aceptable' : 'desempeño crítico'
  const pv = providerStats(data, inWeekF(week)).filter(e => e.total > 0).sort((a, b) => b.total - a.total)[0]
  return (
    <>
      Durante la semana del <b>{fmtLong(week)}</b> al <b>{fmtLong(weekEnd(week))}</b> se planificaron <b>{r.programadas}</b> citas y se registraron <b>{r.sc}</b> ingresos sin cita. El cumplimiento general fue de <b>{fmtP(r.cumpGen)}</b> ({state}).<br /><br />
      <b>Recepción:</b> llegaron <b>{r.atendCC}</b> proveedores con cita ({r.ontime} a tiempo, {r.late} con tardanza) y <b>{r.sc}</b> sin cita.{' '}
      {r.absent ? <>Hubo <span className="hl-red">{r.absent} inasistencia(s)</span> ({r.inas}% de las citas). </> : r.programadas ? <><span className="hl-green">No hubo inasistencias</span>. </> : null}
      {r.pending ? <>Quedan <b>{r.pending}</b> cita(s) sin registrar llegada. </> : null}
      {r.sc ? <>La improvisación fue del <b>{r.impr}%</b>{(r.impr ?? 0) > 30 ? ', lo que indica una operación reactiva: conviene reforzar la planificación con los proveedores.' : (r.impr ?? 0) > cfg.maxImpr ? '; se sugiere reforzar la comunicación para reducir ingresos no programados.' : ', dentro de lo esperado.'} </> : null}
      {r.delayProm ? <>El retraso promedio fue de <b>{r.delayProm} min</b> (máximo {r.delayMax} min).</> : null}
      {pv ? <><br /><br /><b>Proveedor con más movimiento:</b> {pv.name} ({pv.total} atenciones).</> : null}
    </>
  )
}
