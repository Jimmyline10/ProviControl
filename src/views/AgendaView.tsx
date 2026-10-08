import { DAYS, DAYS_FULL, HOURS, ST } from '../constants'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { apps, capacityDay, inWeekF } from '../logic/indicators'
import { exportAgenda, notifyExport } from '../services/exportExcel'
import { addDays, fmtShort, hh, todayISO, weekEnd } from '../utils/date'
import { fmtP, pct } from '../utils/format'
import { Icon } from '../components/Icon'

export function AgendaView() {
  const { data, cfg, week, clearRange } = useApp()
  const { openDialog, confirm, toast } = useUI()
  const today = todayISO()
  const inW = inWeekF(week)

  const onClear = async () => {
    if (await confirm(`¿Borrar TODOS los registros de la semana ${fmtShort(week)} al ${fmtShort(weekEnd(week))}?`, 'Borrar semana')) {
      clearRange(week, weekEnd(week)); toast('Semana limpiada.')
    }
  }
  const onExport = () => notifyExport(exportAgenda(data, week), toast)

  return (
    <>
      <div className="view-head"><div><h1>Agenda semanal de recepción</h1>
        <p>Haga clic en un espacio libre para programar. Haga clic en una cita para registrar su llegada.</p></div></div>
      <div className="agenda-layout">
        <div className="agenda-panel">
          <table className="agenda">
            <thead><tr><th>HORA</th>
              {DAYS.map((d, i) => <th key={d}>{d}<br /><span>{fmtShort(addDays(week, i))}</span></th>)}
            </tr></thead>
            <tbody>
              {HOURS.map(hr => (
                <tr key={hr}>
                  <td className="hour">{hh(hr)}<br />– {hh(hr + 1)}</td>
                  {DAYS.map((_, di) => {
                    const date = addDays(week, di)
                    return (
                      <td key={date} style={date === today ? { background: '#F4F9FF' } : undefined}>
                        <div className="slots-cell" style={{ gridTemplateRows: `repeat(${Math.ceil(cfg.slots / 2)},1fr)` }}>
                          {Array.from({ length: cfg.slots }, (_, i) => i + 1).map(s => {
                            const a = data.appointments.find(x => x.date === date && x.hour === hr && x.slot === s)
                            return a ? (
                              <button key={s} type="button" className={`slot filled ${a.status}`}
                                title={`${a.provider} · ${fmtShort(a.date)} ${hh(hr)} · Espacio ${s}`}
                                onClick={() => openDialog({ kind: 'appt-actions', id: a.id })}>
                                <span className="num">#{s}</span><span className="prov">{a.provider}</span>
                                <span className="meta">{ST[a.status]}{a.status === 'late' ? ' +' + a.delay + 'm' : ''}
                                  {a.arrival && a.status !== 'absent' ? ' · ' + a.arrival : ''}</span>
                              </button>
                            ) : (
                              <button key={s} type="button" className="slot" title={`Programar ${DAYS_FULL[di]} ${hh(hr)} · Espacio ${s}`}
                                onClick={() => openDialog({ kind: 'appt-form', pre: { date, hour: hr, slot: s } })}>
                                <span className="num">#{s}</span><span style={{ fontSize: 14, lineHeight: 1 }}>＋</span>
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
          </table>
        </div>
        <div className="side-actions">
          <div className="card"><div className="card-h"><h3>Acciones</h3></div>
            <div className="card-b action-stack">
              <button className="btn primary block" onClick={() => openDialog({ kind: 'appt-form' })}><Icon name="calendar" size={15} />Nueva cita</button>
              <button className="btn green block" onClick={() => openDialog({ kind: 'pick' })}><Icon name="checkCircle" size={15} />Registrar llegada</button>
              <button className="btn ghost block" onClick={() => openDialog({ kind: 'walk-form' })}><Icon name="truck" size={15} />Registrar sin cita</button>
              <div className="action-sep" />
              <button className="btn ghost block" onClick={onExport}><Icon name="download" size={15} />Exportar agenda a Excel</button>
              <button className="btn danger-ghost block" onClick={onClear}><Icon name="trash" size={15} />Limpiar semana</button>
            </div></div>
          <div className="card card-b legend-box"><b>Leyenda</b>
            <div><span className="legend-swatch" style={{ background: '#548235' }} />Verde = A tiempo</div>
            <div><span className="legend-swatch" style={{ background: '#ED7D31' }} />Naranja = Tarde</div>
            <div><span className="legend-swatch" style={{ background: '#C00000' }} />Rojo = No llegó / Sin cita</div>
            <div><span className="legend-swatch" style={{ background: '#EFF4FB' }} />Azul claro = Programada</div>
            <div className="legend-note">Cada hora tiene <strong>{cfg.slots} espacios</strong>.
              Ocupación de la semana: <strong>{fmtP(pct(apps(data, inW).length, capacityDay(cfg) * 6))}</strong></div>
          </div>
        </div>
      </div>
    </>
  )
}
