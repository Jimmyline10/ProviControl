import { DAYS_SHORT, ST } from '../../constants'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import { allEvents, pillOf, stLabel } from '../../logic/history'
import { level, providerStats } from '../../logic/indicators'
import { dow, fmtLong, fmtShort } from '../../utils/date'
import { fmtP, norm } from '../../utils/format'
import { Modal } from '../Modal'

export function ProviderSheet({ pkey }: { pkey: string }) {
  const { data, cfg } = useApp()
  const { closeDialog } = useUI()
  const e = providerStats(data, () => true).find(x => x.key === pkey)
  const evs = allEvents(data).filter(v => norm(v.provider) === pkey)
  if (!e || !evs.length) return null
  const byDay = DAYS_SHORT.map((_, i) => evs.filter(v => dow(v.date) === i).length), mx = Math.max(1, ...byDay)
  const L = level(e, cfg)
  const stat = (l: string, v: React.ReactNode, color?: string) =>
    <div className="s" key={l}><div className="l">{l}</div><div className="v" style={color ? { color } : undefined}>{v}</div></div>
  return (
    <Modal wide title={e.name} onClose={closeDialog} buttons={[{ label: 'Cerrar' }]}
      sub={<>Ficha histórica · primer registro {fmtLong(evs[evs.length - 1].date)} · <span className={'pill ' + L[1]}>{L[0]}</span></>}>
      <div className="statgrid">
        {stat('Citas', e.prog)}{stat('A tiempo', e.ontime, 'var(--green)')}{stat('Tarde', e.late, 'var(--orange)')}
        {stat('No llegó', e.absent, 'var(--red)')}{stat('Sin cita', e.sc)}{stat('Puntualidad', fmtP(e.punt))}
        {stat('Cumplimiento', fmtP(e.cump))}{stat('Retraso prom.', e.late ? e.delayProm + 'm' : '—')}
      </div>
      <h4 className="sub-h">Visitas por día de la semana</h4>
      <div className="cols-chart" style={{ height: 90 }}>
        {byDay.map((n, i) => <div key={i} className="c"><span className="t">{n || ''}</span><div className="b" style={{ height: `${(n / mx) * 70}%`, background: 'var(--sub)' }} /></div>)}
      </div>
      <div className="cols-lab">{DAYS_SHORT.map(d => <span key={d}>{d}</span>)}</div>
      <h4 className="sub-h">Últimos movimientos</h4>
      <div className="tblwrap"><table className="t">
        <thead><tr><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Estado</th><th>Llegada</th><th className="r">Retraso</th></tr></thead>
        <tbody>{evs.slice(0, 15).map(v => (
          <tr key={v.kind + v.id}><td>{fmtShort(v.date)}</td><td>{v.time}</td><td>{v.type}</td>
            <td><span className={'pill ' + pillOf(v.st)}>{v.st === 'sc' ? 'Sin cita' : ST[v.st]}</span></td>
            <td>{v.arr || '—'}</td><td className="r">{v.delay ? '+' + v.delay + ' min' : '—'}</td></tr>))}</tbody>
      </table></div>
    </Modal>
  )
}
