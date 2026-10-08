import { useMemo, useState } from 'react'
import { DAYS, DAYS_FULL, HOURS, ST } from '../constants'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { apps, capacityDay, inWeekF } from '../logic/indicators'
import { exportAgenda, notifyExport } from '../services/exportExcel'
import { exportAgendaPdf } from '../services/exportPdf'
import { addDays, fmtShort, hh, mondayOf, todayISO, weekEnd } from '../utils/date'
import { fmtP, pct } from '../utils/format'
import { Icon } from '../components/Icon'
import type { Status } from '../types'

/** Turnos para filtrar las filas de horas */
const TURNOS: Record<string, [string, (h: number) => boolean]> = {
  all: ['Todos', () => true],
  am: ['Mañana (08:00 – 12:00)', h => h < 12],
  pm: ['Tarde (12:00 – 15:00)', h => h >= 12],
}
const ESTADOS: Status[] = ['pending', 'ontime', 'late', 'absent']

export function AgendaView() {
  const { data, cfg, week, setWeek, clearRange } = useApp()
  const { openDialog, confirm, toast } = useUI()
  const [fProv, setFProv] = useState('')
  const [fEst, setFEst] = useState<'' | Status>('')
  const [fTurno, setFTurno] = useState('all')
  const today = todayISO()
  const inW = inWeekF(week)
  const cap = capacityDay(cfg)
  const hours = HOURS.filter(TURNOS[fTurno][1])
  const filtering = !!(fProv || fEst)
  const matches = (p: string, st: Status) => (!fProv || p === fProv) && (!fEst || st === fEst)

  const providers = useMemo(() => [...new Set(data.appointments.map(a => a.provider))].sort((a, b) => a.localeCompare(b)), [data.appointments])
  /* contador por día: citas agendadas y su desglose por estado */
  const perDay = DAYS.map((_, i) => {
    const date = addDays(week, i), A = data.appointments.filter(a => a.date === date)
    const by = (st: string) => A.filter(a => a.status === st).length
    return { date, n: A.length, ontime: by('ontime'), late: by('late'), absent: by('absent'), pending: by('pending') }
  })
  const weekTotal = perDay.reduce((n, d) => n + d.n, 0)
  const nMatch = filtering ? data.appointments.filter(a => inW(a.date) && matches(a.provider, a.status)).length : 0

  const onClear = async () => {
    if (await confirm(`¿Borrar TODOS los registros de la semana ${fmtShort(week)} al ${fmtShort(weekEnd(week))}?`, 'Borrar semana')) {
      clearRange(week, weekEnd(week)); toast('Semana limpiada.')
    }
  }
  const onExport = () => notifyExport(exportAgenda(data, week), toast)
  const onPdf = () => {
    const label = [fProv && 'Proveedor: ' + fProv, fEst && 'Estado: ' + ST[fEst], fTurno !== 'all' && 'Turno: ' + TURNOS[fTurno][0]].filter(Boolean).join(' · ')
    exportAgendaPdf(data, cfg, week, { hours, match: a => matches(a.provider, a.status), filterLabel: label })
      .then(() => toast('PDF exportado.'), () => toast('No se pudo generar el PDF. Revise su conexión e intente de nuevo.'))
  }
  const resetFilters = () => { setFProv(''); setFEst(''); setFTurno('all') }

  return (
    <>
      <div className="ag-board">
        <div className="ag-top">
          <div className="ag-title">
            <span className="ag-title-ico"><Icon name="calendar" size={22} /></span>
            <div><h1>Agenda semanal de recepción</h1>
              <p>Clic en un espacio libre para programar · clic en una cita para registrar su llegada</p></div>
          </div>
          <div className="ag-nav">
            <button onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
            <span>{fmtShort(week)} – {fmtShort(weekEnd(week))}</span>
            <button onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><Icon name="right" size={16} /></button>
          </div>
          <button className="ag-btn" onClick={() => setWeek(mondayOf(today))}>Hoy</button>
        </div>
        <div className="ag-actions">
          <button className="btn primary sm" onClick={() => openDialog({ kind: 'appt-form' })}><Icon name="calendar" size={14} />Nueva cita</button>
          <button className="btn green sm" onClick={() => openDialog({ kind: 'pick' })}><Icon name="checkCircle" size={14} />Registrar llegada</button>
          <button className="btn ghost sm" onClick={() => openDialog({ kind: 'walk-form' })}><Icon name="truck" size={14} />Sin cita</button>
          <span className="ag-occ">{cfg.slots} espacios por hora · Ocupación semanal <b>{fmtP(pct(apps(data, inW).length, cap * 6))}</b></span>
          <button className="btn ghost sm" onClick={onExport}><Icon name="download" size={14} />Exportar Excel</button>
          <button className="btn ghost sm" onClick={onPdf}><Icon name="fileText" size={14} />Exportar PDF</button>
          <button className="btn danger-ghost sm" onClick={onClear}><Icon name="trash" size={14} />Limpiar semana</button>
        </div>

        <div className="ag-filters">
          <label className="ag-f"><span>Proveedor</span>
            <select value={fProv} onChange={e => setFProv(e.target.value)}>
              <option value="">Todos</option>
              {providers.map(p => <option key={p} value={p}>{p}</option>)}
            </select></label>
          <label className="ag-f"><span>Estado</span>
            <select value={fEst} onChange={e => setFEst(e.target.value as '' | Status)}>
              <option value="">Todos</option>
              {ESTADOS.map(s => <option key={s} value={s}>{ST[s]}</option>)}
            </select></label>
          <label className="ag-f"><span>Turno</span>
            <select value={fTurno} onChange={e => setFTurno(e.target.value)}>
              {Object.entries(TURNOS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
            </select></label>
          {(filtering || fTurno !== 'all') && (
            <button className="ag-reset" onClick={resetFilters}><Icon name="x" size={13} />Quitar filtros
              {filtering && <b>{nMatch} coincidencia{nMatch !== 1 ? 's' : ''}</b>}</button>)}
          <div className="ag-legend">
            <span><i className="pending" />Programado</span>
            <span><i className="ontime" />A tiempo</span>
            <span><i className="late" />Tarde</span>
            <span><i className="absent" />No llegó</span>
          </div>
        </div>
      </div>

      <div className="agenda-wrap">
        <div className="agenda-panel">
          <table className={'agenda' + (filtering ? ' filtering' : '')}>
            <thead><tr><th className="hour">Hora</th>
              {DAYS.map((d, i) => (
                <th key={d} className={perDay[i].date === today ? 'today' : undefined}>{d}<span>{fmtShort(perDay[i].date)}
                  <b className={'day-count' + (perDay[i].n ? '' : ' zero')} title={`${perDay[i].n} cita(s) agendada(s)`}>{perDay[i].n}</b></span></th>))}
            </tr></thead>
            <tbody>
              {hours.map(hr => (
                <tr key={hr}>
                  <td className="hour">{hh(hr)} – {hh(hr + 1)}</td>
                  {DAYS.map((_, di) => {
                    const date = perDay[di].date
                    return (
                      <td key={date} className={date === today ? 'today' : undefined}>
                        <div className="slots-cell">
                          {Array.from({ length: cfg.slots }, (_, i) => i + 1).map(s => {
                            const a = data.appointments.find(x => x.date === date && x.hour === hr && x.slot === s)
                            return a ? (
                              <button key={s} type="button" className={`slot filled ${a.status}${filtering && !matches(a.provider, a.status) ? ' dim' : ''}`}
                                title={`${a.provider} · ${fmtShort(a.date)} ${hh(hr)} · Espacio ${s} · ${ST[a.status]}`}
                                onClick={() => openDialog({ kind: 'appt-actions', id: a.id })}>
                                <Icon name="truck" size={13} className="ico" />
                                <span className="txt"><span className="prov">{a.provider}</span>
                                  <span className="meta">{ST[a.status]}{a.status === 'late' ? ' +' + a.delay + 'm' : ''}
                                    {a.arrival && a.status !== 'absent' ? ' · ' + a.arrival : ''}</span></span>
                              </button>
                            ) : (
                              <button key={s} type="button" className="slot" title={`Programar ${DAYS_FULL[di]} ${hh(hr)} · Espacio ${s}`}
                                onClick={() => openDialog({ kind: 'appt-form', pre: { date, hour: hr, slot: s } })}>
                                <span className="num">#{s}</span><span className="plus">+</span>
                              </button>
                            )
                          })}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="day-total">
                <td className="hour"><b>{weekTotal}</b><span>citas en la semana</span></td>
                {perDay.map(d => {
                  const p = pct(d.n, cap) ?? 0
                  return (
                    <td key={d.date}>
                      <div className="dt-head"><b>{d.n}</b> agendada{d.n !== 1 ? 's' : ''}<span>{p}%</span></div>
                      <div className="dt-bar" title={`Ocupación ${p}% (${d.n} de ${cap} espacios)`}><i style={{ width: `${Math.min(100, p)}%` }} className={p >= 90 ? 'hi' : ''} /></div>
                      <div className="dt-break">
                        {d.n ? <>
                          {d.ontime > 0 && <span className="ontime">{d.ontime} a tiempo</span>}
                          {d.late > 0 && <span className="late">{d.late} tarde</span>}
                          {d.absent > 0 && <span className="absent">{d.absent} no llegó</span>}
                          {d.pending > 0 && <span className="pending">{d.pending} programada{d.pending !== 1 ? 's' : ''}</span>}
                        </> : <span>Sin citas</span>}
                      </div>
                    </td>)
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  )
}
