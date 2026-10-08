import { FormEvent, ReactNode, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import '../styles/login.css'

/* ---------- iconos ---------- */
const Svg = ({ children, size = 20 }: { children: ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)
const Truck = ({ size }: { size?: number }) => <Svg size={size}><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></Svg>
const Mail = () => <Svg><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Svg>
const Lock = () => <Svg><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Svg>
const Eye = ({ off }: { off?: boolean }) => <Svg><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{off && <path d="M3 3l18 18" />}</Svg>
const Arrow = () => <Svg><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>
const Calendar = () => <Svg><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></Svg>
const Bars = () => <Svg><path d="M5 20V12M12 20V5M19 20v-9" /></Svg>

const Brand = ({ dark }: { dark?: boolean }) => (
  <div className={'lg-brand' + (dark ? ' dark' : '')}>
    <Truck size={46} />
    <div><div className="lg-brand-name">SGP</div><div className="lg-brand-sub">Sistema de Gestión de Proveedores</div></div>
  </div>
)

/* ---------- estructura común: panel azul + tarjeta ---------- */
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="lg">
      <section className="lg-hero">
        <Brand />
        <div>
          <h1 className="lg-title">Conectamos <span>proveedores</span><br />y operaciones<br />en un solo lugar</h1>
          <p className="lg-lead">Controla, gestiona y optimiza todo el proceso<br />de tus proveedores de forma simple y eficiente.</p>
          <div className="lg-feats">
            <div className="lg-feat"><i><Truck size={26} /></i><span>Recepción<br />de proveedores</span></div>
            <div className="lg-feat"><i><Calendar /></i><span>Agendamiento<br />de citas</span></div>
            <div className="lg-feat"><i><Bars /></i><span>Reportes y<br />estadísticas</span></div>
          </div>
        </div>
        <p className="lg-quote">Más control, mejores decisiones<br />para tu cadena de suministro.</p>
      </section>
      <section className="lg-panel">
        <div className="lg-card">
          <Brand dark />
          {children}
          <div className="lg-foot">Sistema exclusivo para personal autorizado</div>
        </div>
      </section>
    </div>
  )
}

/* ---------- iniciar sesión / recuperar contraseña ---------- */
export function Login() {
  const { signIn, sendReset } = useAuth()
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [show, setShow] = useState(false), [remember, setRemember] = useState(true)
  const [error, setError] = useState(''), [info, setInfo] = useState(''), [busy, setBusy] = useState(false)

  const go = (m: 'login' | 'forgot') => { setMode(m); setError(''); setInfo('') }

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setInfo('')
    if (mode === 'login') {
      const msg = await signIn(email, password, remember)
      if (msg) setError(msg)
    } else {
      const msg = await sendReset(email)
      if (msg) setError(msg); else setInfo('Si el correo está registrado, le enviamos un enlace para crear una nueva contraseña.')
    }
    setBusy(false)
  }

  return (
    <Shell>
      <h2 className="lg-h2">{mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}</h2>
      <p className="lg-sub">{mode === 'login' ? 'Accede a tu cuenta para continuar' : 'Te enviaremos un enlace a tu correo'}</p>
      <form onSubmit={submit} noValidate={false}>
        <label className="lg-label" htmlFor="lgEmail">Correo electrónico</label>
        <div className="lg-input"><Mail />
          <input id="lgEmail" type="email" autoComplete="username" autoFocus required placeholder="ejemplo@correo.com"
            value={email} onChange={e => setEmail(e.target.value)} /></div>

        {mode === 'login' && <>
          <label className="lg-label" htmlFor="lgPass">Contraseña</label>
          <div className="lg-input"><Lock />
            <input id="lgPass" type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)} />
            <button type="button" className="lg-eye" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setShow(s => !s)}><Eye off={show} /></button></div>
          <div className="lg-row">
            <label className="lg-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Recordar mi sesión</span></label>
            <button type="button" className="lg-link" onClick={() => go('forgot')}>¿Olvidaste tu contraseña?</button>
          </div>
        </>}

        {error && <div className="lg-msg err" role="alert">{error}</div>}
        {info && <div className="lg-msg ok" role="status">{info}</div>}

        <button className="lg-btn" type="submit" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'login' ? <><Arrow /> Ingresar</> : 'Enviar enlace'}
        </button>
        {mode === 'forgot' && <button type="button" className="lg-link center" onClick={() => go('login')}>← Volver a iniciar sesión</button>}
      </form>
    </Shell>
  )
}

/* ---------- nueva contraseña (se abre desde el enlace del correo) ---------- */
export function NewPassword() {
  const { updatePassword } = useAuth()
  const [p1, setP1] = useState(''), [p2, setP2] = useState('')
  const [show, setShow] = useState(false), [error, setError] = useState(''), [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError('')
    if (p1.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (p1 !== p2) return setError('Las contraseñas no coinciden.')
    setBusy(true)
    const msg = await updatePassword(p1)
    if (msg) setError(msg)
    setBusy(false)
  }

  return (
    <Shell>
      <h2 className="lg-h2">Nueva contraseña</h2>
      <p className="lg-sub">Elige una contraseña segura para tu cuenta</p>
      <form onSubmit={submit}>
        <label className="lg-label" htmlFor="npA">Nueva contraseña</label>
        <div className="lg-input"><Lock />
          <input id="npA" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus required value={p1} onChange={e => setP1(e.target.value)} />
          <button type="button" className="lg-eye" aria-label="Mostrar u ocultar" onClick={() => setShow(s => !s)}><Eye off={show} /></button></div>
        <label className="lg-label" htmlFor="npB">Repite la contraseña</label>
        <div className="lg-input"><Lock />
          <input id="npB" type={show ? 'text' : 'password'} autoComplete="new-password" required value={p2} onChange={e => setP2(e.target.value)} /></div>
        {error && <div className="lg-msg err" role="alert">{error}</div>}
        <button className="lg-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contraseña'}</button>
      </form>
    </Shell>
  )
}