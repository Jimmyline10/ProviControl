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
import { RotulosView } from './views/RotulosView'
import { addDays, fmtShort, mondayOf, pad, todayISO, weekEnd } from './utils/date'

const fromHash = () => { const h = location.hash.slice(1); return VIEWS.some(v => v[0] === h) ? h : 'resumen' }
const GROUPS = [...new Set(VIEWS.map(v => v[3]))]

/** Logo del menú: cubo isométrico en verdes */
const LogoCube = () => (
  <svg className="sb-mark" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="sbc-t" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9ef5c4" /><stop offset="1" stopColor="#3ddc84" /></linearGradient>
      <linearGradient id="sbc-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#36cf78" /><stop offset="1" stopColor="#17a457" /></linearGradient>
      <linearGradient id="sbc-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1fb565" /><stop offset="1" stopColor="#0e7a40" /></linearGradient>
    </defs>
    <path d="M32 4 58 17.5 32 31 6 17.5Z" fill="url(#sbc-t)" />
    <path d="M5 21.5 30 34.5V61L5 48Z" fill="url(#sbc-l)" />
    <path d="M34 34.5 59 21.5V48L34 61Z" fill="url(#sbc-r)" />
  </svg>
)

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
          <LogoCube />
          <div><div className="sb-name">Provi<em>Control</em></div><div className="sb-sub">Recepción de proveedores</div></div>
        </div>
        <nav className="sb-nav">
          {GROUPS.map(g => (
            <div key={g} className="sb-group">
              {VIEWS.filter(v => v[3] === g).map(([k, l, ico]) => (
                <a key={k} href={`#${k}`} className={'sb-link' + (view === k ? ' active' : '')} aria-current={view === k ? 'page' : undefined}>
                  <Icon name={ico} />{l}
                </a>))}
            </div>))}
        </nav>
        <div className="sb-tagline"><Icon name="truck" size={26} />Juntos por una cadena de suministro más eficiente</div>
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
          <button className="appbar-back" onClick={() => history.back()} title="Volver" aria-label="Volver"><Icon name="arrowLeft" size={18} /></button>
          <div className="crumbs"><b>{current[1]}</b></div>
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
            : view === 'rotulos' ? <RotulosView />
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
