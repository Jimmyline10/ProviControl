import { DAYS_SHORT } from '../constants'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { EMPTY_HIST, histEvents, pillOf, stLabel } from '../logic/history'
import { exportHistorial, notifyExport } from '../services/exportExcel'
import { dow, fmtShort } from '../utils/date'
import { Icon } from '../components/Icon'

const PS = 40
const STATES: [string, string][] = [['ontime', 'A tiempo'], ['late', 'Tarde'], ['absent', 'No llegó'], ['pending', 'Programada'], ['sc', 'Sin cita']]

export function HistorialView() {
  const { data, hist, setHist, removeAppointment, removeWalkin } = useApp()
  const { openDialog, confirm, toast } = useUI()
  const ev = histEvents(data, hist)
  const pages = Math.max(1, Math.ceil(ev.length / PS)), page = Math.min(hist.page, pages)
  const rows = ev.slice((page - 1) * PS, page * PS)
  const set = (p: Partial<typeof hist>) => setHist({ ...hist, ...p, page: 1 })

  const del = async (kind: 'a' | 'w', id: string) => {
    if (!(await confirm('¿Eliminar este registro?', 'Eliminar'))) return
    kind === 'a' ? removeAppointment(id) : removeWalkin(id); toast('Registro eliminado.')
  }
  const edit = (kind: 'a' | 'w', id: string) => openDialog(kind === 'a' ? { kind: 'appt-form', id } : { kind: 'walk-form', id })

  return (
    <>
      <div className="view-head"><div><h1>Historial de registros</h1><p>Todas las citas y llegadas sin cita guardadas. Edite, corrija o elimine cualquier registro.</p></div>
        <div className="no-print"><button className="btn green" onClick={() => notifyExport(exportHistorial(ev), toast)}><Icon name="download" size={15} />Exportar filtro a Excel</button></div></div>
      <div className="toolbar">
        <label>Desde <input type="date" value={hist.from} onChange={e => set({ from: e.target.value })} /></label>
        <label>Hasta <input type="date" value={hist.to} onChange={e => set({ to: e.target.value })} /></label>
        <select value={hist.type} onChange={e => set({ type: e.target.value })}>
          <option value="">Todos los tipos</option><option>Con cita</option><option>Sin cita</option></select>
        <select value={hist.st} onChange={e => set({ st: e.target.value })}>
          <option value="">Todos los estados</option>{STATES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <label className="search grow"><Icon name="search" size={15} /><input placeholder="Proveedor u observación…" value={hist.q} onChange={e => set({ q: e.target.value })} /></label>
        <button className="btn ghost sm" onClick={() => setHist(EMPTY_HIST)}>Quitar filtros</button>
      </div>
      <div className="card">
        <div className="card-h"><h3>{ev.length} registro(s)</h3><span className="hint">Más recientes primero</span></div>
        <div className="tblwrap"><table className="t">
          <thead><tr><th>Fecha</th><th>Día</th><th>Hora</th><th>Proveedor</th><th>Tipo</th><th>Estado</th><th>Llegada</th>
            <th className="r">Retraso</th><th>Observación</th><th className="c">Acciones</th></tr></thead>
          <tbody>
            {rows.length ? rows.map(e => (
              <tr key={e.kind + e.id}>
                <td>{fmtShort(e.date)}</td><td>{DAYS_SHORT[dow(e.date)] || 'Dom'}</td><td>{e.time}</td><td className="prov">{e.provider}</td>
                <td>{e.type}</td><td><span className={'pill ' + pillOf(e.st)}>{stLabel(e.st)}</span></td><td>{e.arr || '—'}</td>
                <td className="r">{e.delay ? '+' + e.delay + ' min' : '—'}</td>
                <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.notes}>{e.notes}</td>
                <td className="c" style={{ whiteSpace: 'nowrap' }}>
                  <button className="btn ghost sm" onClick={() => edit(e.kind, e.id)}>✎</button>{' '}
                  <button className="btn ghost sm" onClick={() => del(e.kind, e.id)} title="Eliminar" aria-label="Eliminar"><Icon name="trash" size={14} /></button></td>
              </tr>)) : <tr><td colSpan={10} className="empty">No hay registros con estos filtros.</td></tr>}
          </tbody>
        </table></div>
        <div className="pager">
          <button className="btn ghost sm" disabled={page <= 1} onClick={() => setHist({ ...hist, page: page - 1 })} aria-label="Página anterior"><Icon name="left" size={14} /></button>
          {' '}Página {page} de {pages}{' '}
          <button className="btn ghost sm" disabled={page >= pages} onClick={() => setHist({ ...hist, page: page + 1 })} aria-label="Página siguiente"><Icon name="right" size={14} /></button>
        </div>
      </div>
    </>
  )
}
