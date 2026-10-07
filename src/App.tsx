import { useEffect, useState } from 'react'
import { DialogHost } from './components/dialogs/DialogHost'
import { Toast } from './components/Toast'
import { VIEWS } from './constants'
import { useApp } from './context/AppContext'
import { useAuth } from './context/AuthContext'
import { AgendaView } from './views/AgendaView'
import { BitacoraView } from './views/BitacoraView'
import { AjustesView } from './views/AjustesView'
import { AnalisisView } from './views/AnalisisView'
import { HistorialView } from './views/HistorialView'
import { ProveedoresView } from './views/ProveedoresView'
import { ResumenView } from './views/ResumenView'
import { addDays, fmtLong, mondayOf, pad, todayISO, weekEnd } from './utils/date'

const fromHash = () => { const h = location.hash.slice(1); return VIEWS.some(v => v[0] === h) ? h : 'resumen' }

export default function App() {
  const [view, setView] = useState(fromHash)
  const { week, setWeek, status } = useApp()
  const { signOut } = useAuth()
  useEffect(() => {
    const f = () => setView(fromHash())
    window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f)
  }, [])
  const ls = status.lastSaved
  const chip = status.error ? '⚠ No se está guardando' : ls ? `💾 Guardado ${pad(ls.getHours())}:${pad(ls.getMinutes())}` : '☁️ Supabase'

  return (
    <>
      <header className="topbar"><div className="topbar-in">
        <div className="logo">ProviControl<small>Recepción de proveedores</small></div>
        <nav className="nav">
          {VIEWS.map(([k, l]) => <a key={k} href={`#${k}`} className={view === k ? 'active' : ''}>{l}</a>)}
        </nav>
        <div className={'savechip' + (status.error ? ' bad' : '')} title={status.error}>{chip}</div>
        <button className="btn light sm" style={{ marginLeft: 8 }} onClick={signOut}>Salir</button>
      </div></header>
      <div className="wrap">
        <div className="week-bar">
          <div className="info">Semana visualizada: <b>{fmtLong(week)} → {fmtLong(weekEnd(week))}</b></div>
          <div className="controls">
            <button className="week-nav" onClick={() => setWeek(addDays(week, -7))}>◀</button>
            <input type="date" value={week} onChange={e => e.target.value && setWeek(mondayOf(e.target.value))} />
            <button className="week-nav" onClick={() => setWeek(addDays(week, 7))}>▶</button>
            <button className="btn light" onClick={() => setWeek(mondayOf(todayISO()))}>Hoy</button>
          </div>
        </div>
        <main>
          {view === 'resumen' ? <ResumenView />
            : view === 'agenda' ? <AgendaView />
            : view === 'bitacora' ? <BitacoraView />
            : view === 'proveedores' ? <ProveedoresView />
            : view === 'analisis' ? <AnalisisView />
            : view === 'historial' ? <HistorialView />
            : view === 'ajustes' ? <AjustesView />
            : null}
        </main>
      </div>
      <Toast />
      <DialogHost />
    </>
  )
}
