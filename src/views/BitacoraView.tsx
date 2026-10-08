import { useMemo } from 'react'
import { DAYS, ST } from '../constants'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { bitColumns, bitRows } from '../logic/bitacora'
import { calc, inWeekF, TCOL, tone } from '../logic/indicators'
import { exportBitacora, notifyExport } from '../services/exportExcel'
import { addDays, fmtShort, hh } from '../utils/date'
import { fmtP, pct } from '../utils/format'
import { Icon } from '../components/Icon'

export function BitacoraView() {
  const { data, cfg, week } = useApp()
  const { openDialog, toast } = useUI()
  const cols = useMemo(() => bitColumns(data, week), [data, week])
  const rows = bitRows(cols)
  const r = calc(data, inWeekF(week))

  return (
    <>
      <div className="view-head"><div><h1>Bitácora de recepción</h1>
        <p>Registro de lo que realmente llegó, igual que el Excel: con cita a la izquierda, sin cita a la derecha. Solo se muestra el nombre del proveedor.</p></div>
        <div className="no-print">
          <button className="btn green" onClick={() => notifyExport(exportBitacora(data, week), toast)}><Icon name="download" size={15} />Exportar a Excel</button>{' '}
          <button className="btn ghost" onClick={() => openDialog({ kind: 'walk-form' })}>+ Sin cita</button>
        </div>
      </div>
      <div className="card" style={{ overflow: 'hidden' }}><div className="tblwrap">
        <table className="bitacora" style={{ minWidth: 900 }}>
          <thead>
            <tr>{DAYS.map((d, i) => <th key={d} colSpan={2}>{d}<br /><span>{fmtShort(addDays(week, i))}</span></th>)}</tr>
            <tr>{DAYS.map(d => <><th key={d + 'c'} className="cc">CON CITA</th><th key={d + 's'} className="sc">SIN CITA</th></>)}</tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                {cols.flatMap(c => {
                  const a = c.citas[i], w = c.walks[i]
                  return [
                    a ? <td key={c.date + 'a'} className={'cell ' + (a.status === 'ontime' ? 'cc-ontime' : 'cc-late')}
                          title={`${a.provider} · ${hh(a.hour)} · ${ST[a.status]}${a.arrival ? ' · llegó ' + a.arrival : ''}${a.status === 'late' ? ` (+${a.delay} min)` : ''}`}
                          onClick={() => openDialog({ kind: 'appt-actions', id: a.id })}>
                          {a.provider}{a.status === 'late' && <small> (+{a.delay}m)</small>}</td>
                      : <td key={c.date + 'a'} className="cell">&nbsp;</td>,
                    w ? <td key={c.date + 'w'} className="cell sc" title={'Sin cita · ' + w.arrival}
                          onClick={() => openDialog({ kind: 'walk-actions', id: w.id })}>{w.provider}</td>
                      : <td key={c.date + 'w'} className="cell">&nbsp;</td>,
                  ]
                })}
              </tr>
            ))}
            <tr className="cnt">{cols.flatMap(c => [<td key={c.date + 'a'}>{c.citas.length}</td>, <td key={c.date + 'w'}>{c.walks.length}</td>])}</tr>
            <tr className="tot">{cols.map(c => <td key={c.date} colSpan={2}>{c.citas.length + c.walks.length}</td>)}</tr>
            <tr className="pc">{cols.map(c => {
              const p = pct(c.citas.length, c.citas.length + c.walks.length)
              return <td key={c.date} colSpan={2} className={p == null ? '' : p >= cfg.metaCump ? 'hi' : p >= 60 ? 'mid' : 'lo'}>{p == null ? 'Sin datos' : p + '%'}</td>
            })}</tr>
          </tbody>
        </table>
      </div></div>
      <div className="insights" style={{ marginTop: 14 }}>
        <div className="insight-card">
          <div className="l">% Cumplimiento de cita (con cita ÷ recibidos)</div>
          <div className="v" style={{ color: TCOL[tone(r.cumpCita, cfg.metaCump, 60)] }}>{fmtP(r.cumpCita)}</div>
          <div className="s">{r.atendCC} con cita · {r.sc} sin cita · meta {cfg.metaCump}%</div></div>
        <div className="insight-card">
          <div className="l">Puntualidad (a tiempo ÷ con cita)</div>
          <div className="v" style={{ color: TCOL[tone(r.punt, cfg.metaPunt, 60)] }}>{fmtP(r.punt)}</div>
          <div className="s">{r.ontime} a tiempo · {r.late} tarde{r.late ? ' · retraso prom. ' + r.delayProm + ' min' : ''}</div></div>
        <div className="insight-card">
          <div className="l">Pendientes e inasistencias de la semana</div>
          <div className="v">{r.pending} pend. · {r.absent} no llegó</div>
          <div className="s">No aparecen en la bitácora hasta que lleguen.</div></div>
      </div>
      <p className="note" style={{ marginTop: 10 }}>El % por día se calcula como <code>con cita ÷ (con cita + sin cita)</code>, igual que la hoja de control de Excel. Verde ≥ meta, amarillo ≥ 60%, rojo menor.</p>
    </>
  )
}
