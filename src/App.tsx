import { useEffect, useState } from 'react'
import { DialogHost } from './components/dialogs/DialogHost'
import { Icon } from './components/Icon'
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
import { addDays, fmtShort, mondayOf, pad, todayISO, weekEnd } from './utils/date'

const fromHash = () => { const h = location.hash.slice(1); return VIEWS.some(v => v[0] === h) ? h : 'resumen' }
const GROUPS = [...new Set(VIEWS.map(v => v[3]))]

export default function App() {
  const [view, setView] = useState(fromHash)
  const [menuOpen, setMenuOpen] = useState(false)
  const { week, setWeek, status } = useApp()
  const { session, signOut } = useAuth()
  useEffect(() => {
    const f = () => { setView(fromHash()); setMenuOpen(false) }
    window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f)
  }, [])
  const ls = status.lastSaved
  const saveLabel = status.error ? 'No se está guardando' : ls ? `Guardado ${pad(ls.getHours())}:${pad(ls.getMinutes())}` : 'Conectado'
  const current = VIEWS.find(v => v[0] === view)!
  const email = session?.user.email || ''
  const isThisWeek = week === mondayOf(todayISO())

  return (
    <div className={'shell' + (menuOpen ? ' menu-open' : '')}>
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-mark">PC</div>
          <div><div className="sb-name">ProviControl</div><div className="sb-sub">Recepción de proveedores</div></div>
        </div>
        <nav className="sb-nav">
          {GROUPS.map(g => (
            <div key={g} className="sb-group">
              <div className="sb-group-l">{g}</div>
              {VIEWS.filter(v => v[3] === g).map(([k, l, ico]) => (
                <a key={k} href={`#${k}`} className={'sb-link' + (view === k ? ' active' : '')} aria-current={view === k ? 'page' : undefined}>
                  <Icon name={ico} />{l}
                </a>))}
            </div>))}
        </nav>
        <div className="sb-user">
          <div className="sb-avatar">{email.slice(0, 1).toUpperCase() || 'U'}</div>
          <div className="sb-user-info"><div className="sb-user-name" title={email}>{email || 'Usuario'}</div><div className="sb-user-role">Sesión activa</div></div>
          <button className="sb-logout" onClick={signOut} title="Cerrar sesión" aria-label="Cerrar sesión"><Icon name="logout" size={16} /></button>
        </div>
      </aside>
      <div className="sb-overlay" onClick={() => setMenuOpen(false)} />

      <div className="main-col">
        <header className="appbar">
          <button className="appbar-menu" onClick={() => setMenuOpen(o => !o)} aria-label="Abrir menú"><Icon name="menu" /></button>
          <div className="crumbs"><span>ProviControl</span><Icon name="right" size={14} /><b>{current[1]}</b></div>
          <div className="appbar-r">
            <div className="weekpick" title="Semana visualizada">
              <button onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><Icon name="left" size={16} /></button>
              <label className="weekpick-l">
                <span>Semana</span><b>{fmtShort(week)} – {fmtShort(weekEnd(week))}</b>
                <input type="date" value={week} onChange={e => e.target.value && setWeek(mondayOf(e.target.value))} aria-label="Elegir semana" />
              </label>
              <button onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><Icon name="right" size={16} /></button>
            </div>
            <button className="btn ghost sm" disabled={isThisWeek} onClick={() => setWeek(mondayOf(todayISO()))}>Hoy</button>
            <div className={'savechip' + (status.error ? ' bad' : '')} title={status.error || 'Los cambios se guardan en Supabase'}>
              <Icon name={status.error ? 'alert' : ls ? 'check' : 'cloud'} size={14} />{saveLabel}
            </div>
          </div>
        </header>
        <main className="wrap">
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
    </div>
  )
}
