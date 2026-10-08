import { DAYS, DAYS_FULL } from '../../constants'
import { useApp } from '../../context/AppContext'
import { apps, calc, capacityDay, inWeekF, providerStats } from '../../logic/indicators'
import type { Indicators } from '../../logic/indicators'
import { addDays, fmtShort, todayISO } from '../../utils/date'
import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'

interface Item { pre?: boolean; cls: string; body: ReactNode; go?: string; label?: string }

export function Alerts({ r }: { r: Indicators }) {
  const { data, cfg, week, setHist } = useApp()
  const out: Item[] = [], today = todayISO(), cap = capacityDay(cfg)
  const past = data.appointments.filter(a => a.status === 'pending' && a.date < today).length
  if (past) out.push({ pre: true, cls: 'bad', go: 'historial', label: 'Revisar',
    body: <><b>{past}</b> cita(s) de días anteriores siguen como «Programada». Registre si llegaron o no para que las estadísticas sean reales.</> })
  const pv = providerStats(data, inWeekF(week)).filter(e => e.late + e.absent >= 2).sort((a, b) => (b.late + b.absent) - (a.late + a.absent))
  if (pv.length) out.push({ cls: '', go: 'proveedores', label: 'Ver proveedores',
    body: <>Proveedores con 2 o más tardanzas/inasistencias esta semana: <b>{pv.slice(0, 4).map(e => e.name).join(', ')}</b>{pv.length > 4 ? ' y ' + (pv.length - 4) + ' más' : ''}.</> })
  DAYS.forEach((_, i) => {
    const d = addDays(week, i), x = calc(data, dd => dd === d)
    if (x.esperados >= 3 && (x.impr ?? 0) >= 30) out.push({ cls: '', go: 'bitacora', label: 'Ver bitácora',
      body: <>{DAYS_FULL[i]} {fmtShort(d)}: <b>{x.impr}%</b> de sin cita ({x.sc} de {x.esperados}). Operación reactiva ese día.</> })
  })
  DAYS.forEach((_, i) => {
    const d = addDays(week, i), n = apps(data, dd => dd === d).length
    if (n >= cap * 0.9) out.push({ cls: '', go: 'agenda', label: 'Ver agenda',
      body: <>{DAYS_FULL[i]} {fmtShort(d)} al <b>{Math.round((n / cap) * 100)}%</b> de su capacidad ({n}/{cap}). Poco margen para imprevistos.</> })
  })
  if (r.cumpGen != null && r.cumpGen < cfg.metaCump && r.esperados >= 5) out.push({ cls: r.cumpGen < 60 ? 'bad' : '', go: 'analisis', label: 'Analizar',
    body: <>Cumplimiento general <b>{r.cumpGen}%</b>, por debajo de la meta ({cfg.metaCump}%).</> })
  if (!out.length) out.push({ cls: 'ok', body: 'Sin alertas para esta semana. Todo dentro de las metas configuradas.' })
  return (
    <div className="alert-list">
      {out.map((a, i) => (
        <div key={i} className={'alert ' + a.cls}>
          <Icon name={a.cls === 'ok' ? 'checkCircle' : a.cls === 'bad' ? 'alert' : 'info'} size={16} className="alert-ico" /><span>{a.body}</span>
          {a.go && <button className="btn sm ghost go" onClick={() => { if (a.pre) setHist({ from: '', to: addDays(today, -1), st: 'pending', type: 'Con cita', q: '', page: 1 }); location.hash = '#' + a.go }}>{a.label}</button>}
        </div>
      ))}
    </div>
  )
}
