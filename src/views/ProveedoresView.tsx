import { useState } from 'react'
import { ScopeSeg } from '../components/ScopeSeg'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { level, providerStats, ProviderStat, scopeFilter, scopeLabel } from '../logic/indicators'
import { fmtShort } from '../utils/date'
import { fmtP, norm } from '../utils/format'
import { Icon } from '../components/Icon'

type SortKey = 'name' | 'total' | 'prog' | 'ontime' | 'late' | 'absent' | 'sc' | 'punt' | 'delayProm' | 'cump' | 'last'
const val = (k: SortKey, e: ProviderStat): string | number =>
  k === 'punt' ? (e.punt ?? -1) : k === 'cump' ? (e.cump ?? -1) : k === 'last' ? e.last || '' : e[k]
const COLS: [SortKey, string, string][] = [
  ['name', 'Proveedor', ''], ['prog', 'Citas', 'r'], ['ontime', 'A tiempo', 'r'], ['late', 'Tarde', 'r'], ['absent', 'No llegó', 'r'],
  ['sc', 'Sin cita', 'r'], ['punt', 'Puntualidad', 'r'], ['delayProm', 'Retraso prom.', 'r'], ['cump', 'Cumplimiento', 'r'], ['last', 'Última visita', 'c']]

export function ProveedoresView() {
  const { data, cfg, week, scope } = useApp()
  const { openDialog } = useUI()
  const [sort, setSort] = useState<{ k: SortKey; d: 1 | -1 }>({ k: 'total', d: -1 })
  const [q, setQ] = useState('')

  let list = providerStats(data, scopeFilter(scope, week))
  const nq = norm(q); if (nq) list = list.filter(e => e.key.includes(nq))
  list.sort((a, b) => {
    const x = val(sort.k, a), y = val(sort.k, b)
    return (x > y ? 1 : x < y ? -1 : 0) * sort.d || a.name.localeCompare(b.name)
  })
  const lv = list.map(e => level(e, cfg))
  const count = (t: string) => lv.filter(x => x[1] === t).length
  const toggle = (k: SortKey) => setSort(s => ({ k, d: s.k === k ? (s.d === 1 ? -1 : 1) : (k === 'name' ? 1 : -1) }))

  return (
    <>
      <div className="view-head"><div><h1>Proveedores</h1><p>Comportamiento de cada proveedor en el periodo: {scopeLabel(scope, week)}.</p></div><ScopeSeg /></div>
      <div className="insights" style={{ marginBottom: 14 }}>
        <div className="insight-card"><div className="l">Proveedores</div><div className="v">{list.length}</div><div className="s">con movimiento en el periodo</div></div>
        <div className="insight-card"><div className="l">Excelentes</div><div className="v" style={{ color: 'var(--green)' }}>{count('g')}</div><div className="s">cumplimiento ≥ {cfg.metaCump}%</div></div>
        <div className="insight-card"><div className="l">Regulares</div><div className="v" style={{ color: 'var(--orange)' }}>{count('o')}</div><div className="s">entre 60% y {cfg.metaCump - 1}%</div></div>
        <div className="insight-card"><div className="l">Críticos</div><div className="v" style={{ color: 'var(--red)' }}>{count('r')}</div><div className="s">menos de 60%</div></div>
      </div>
      <div className="toolbar"><label className="search grow"><Icon name="search" size={15} /><input placeholder="Buscar proveedor…" value={q} onChange={e => setQ(e.target.value)} /></label></div>
      <div className="card"><div className="tblwrap"><table className="t">
        <thead><tr><th className="c">#</th>
          {COLS.map(([k, l, c]) => <th key={k} className={'sortable ' + c} onClick={() => toggle(k)}>{l}{sort.k === k ? (sort.d > 0 ? ' ▲' : ' ▼') : ''}</th>)}
          <th className="c">Nivel</th></tr></thead>
        <tbody>
          {list.length ? list.map((e, i) => {
            const L = lv[i]
            return (
              <tr key={e.key} className="click" onClick={() => openDialog({ kind: 'provider', key: e.key })}>
                <td className="c">{i + 1}</td><td className="prov">{e.name}</td><td className="r">{e.prog}</td><td className="r">{e.ontime}</td>
                <td className="r">{e.late}</td><td className="r">{e.absent}</td><td className="r">{e.sc}</td><td className="r">{fmtP(e.punt)}</td>
                <td className="r">{e.late ? e.delayProm + ' min' : '—'}</td><td className="r"><b>{fmtP(e.cump)}</b></td>
                <td className="c">{e.last ? fmtShort(e.last) : '—'}</td><td className="c"><span className={'pill ' + L[1]}>{L[0]}</span></td>
              </tr>)
          }) : <tr><td colSpan={12} className="empty">No hay proveedores con movimiento en este periodo.</td></tr>}
        </tbody>
      </table></div></div>
      <p className="note" style={{ marginTop: 10 }}>Cumplimiento = a tiempo ÷ (citas + sin cita). Puntualidad = a tiempo ÷ llegadas con cita. Haga clic en un proveedor para ver su ficha e historial.</p>
    </>
  )
}
