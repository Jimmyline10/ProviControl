import { FormEvent, ReactNode, useId, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icon'
import '../styles/login.css'

/** Logo: cubo isométrico en tres tonos de azul. */
/* ids únicos por instancia: si se repiten, un SVG oculto (display:none) rompe los degradados del visible */
const Cube = ({ size = 76 }: { size?: number }) => {
  const id = useId().replace(/:/g, '')
  return (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id={id + "t"} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#7cc8ff" /><stop offset="1" stopColor="#3aa0ff" /></linearGradient>
      <linearGradient id={id + "l"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b9cff" /><stop offset="1" stopColor="#1f7be8" /></linearGradient>
      <linearGradient id={id + "r"} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a86f2" /><stop offset="1" stopColor="#1560c9" /></linearGradient>
    </defs>
    <path d="M32 4 58 17.5 32 31 6 17.5Z" fill={`url(#${id}t)`} />
    <path d="M5 21.5 30 34.5V61L5 48Z" fill={`url(#${id}l)`} />
    <path d="M34 34.5 59 21.5V48L34 61Z" fill={`url(#${id}r)`} />
  </svg>
  )
}

const Brand = ({ compact }: { compact?: boolean }) => (
  <div className={'lg-brand' + (compact ? ' compact' : '')}>
    <Cube size={compact ? 44 : 76} />
    <div>
      <div className="lg-brand-name">Provi<span>Control</span></div>
      <div className="lg-brand-sub">Sistema de Gestión de Proveedores</div>
    </div>
  </div>
)

const FEATS: [string, string, string][] = [
  ['clipboardCheck', 'Agenda de citas', 'Programa reuniones y coordinaciones.'],
  ['handshake', 'Bitácora de recepción', 'Registra llegadas, tiempos y entregas.'],
  ['barChart', 'Indicadores y reportes', 'Toma decisiones con información real.'],
]

/* ---------- estructura común: panel de marca + tarjeta de acceso ---------- */
function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  const [help, setHelp] = useState(false)
  return (
    <div className="lg">
      <aside className="lg-hero">
        <div className="lg-hero-in">
          <Brand />
          <div className="lg-hero-body">
            <h1 className="lg-title">Conectamos tu empresa<br />con los <span>mejores proveedores</span></h1>
            <p className="lg-lead">Gestiona, controla y da seguimiento a tus proveedores de forma rápida, segura y eficiente.</p>
            <ul className="lg-feats">
              {FEATS.map(([ico, t, d]) => (
                <li key={t}><span className="lg-feat-ico"><Icon name={ico} size={26} /></span>
                  <div><b>{t}</b><span>{d}</span></div></li>))}
            </ul>
          </div>
          <p className="lg-trust"><Icon name="shieldCheck" size={20} />Seguro<i />Confiable<i />Eficiente</p>
        </div>
      </aside>

      <main className="lg-panel">
        <p className="lg-secure"><Icon name="shield" size={18} />Acceso seguro al sistema</p>
        <div className="lg-card">
          <div className="lg-mobile-brand"><Brand compact /></div>
          <span className="lg-accent" />
          <h2 className="lg-h2">{title}</h2>
          <p className="lg-sub">{sub}</p>
          {children}
          <div className="lg-help">
            <span className="lg-help-sep">¿Necesitas ayuda?</span>
            <button type="button" className="lg-help-link" onClick={() => setHelp(h => !h)} aria-expanded={help}>
              <Icon name="headset" size={20} />Contacta al administrador del sistema<Icon name="arrowRight" size={16} />
            </button>
            {help && <p className="lg-help-msg">Solicite al administrador de ProviControl la creación de su cuenta o el restablecimiento de su acceso.</p>}
          </div>
        </div>
        <p className="lg-copy">© {new Date().getFullYear()} ProviControl. Todos los derechos reservados.</p>
      </main>
    </div>
  )
}

function Field({ id, label, icon, children, extra }: { id: string; label: string; icon: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="lg-field">
      <label className="lg-label" htmlFor={id}>{label}</label>
      <div className="lg-input"><span className="lg-input-ico"><Icon name={icon} size={18} /></span>{children}{extra}</div>
    </div>
  )
}

const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
  <button type="button" className="lg-eye" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={toggle}>
    <Icon name={show ? 'eye' : 'eyeOff'} size={18} />
  </button>
)

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
    <Shell title={mode === 'login' ? 'Iniciar sesión' : 'Recuperar contraseña'}
      sub={mode === 'login' ? 'Ingresa tus credenciales para acceder al sistema de gestión de proveedores.' : 'Te enviaremos un enlace a tu correo para crear una nueva contraseña.'}>
      <form onSubmit={submit}>
        <Field id="lgEmail" label="Correo electrónico" icon="mail">
          <input id="lgEmail" type="email" autoComplete="username" autoFocus required placeholder="usuario@empresa.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </Field>

        {mode === 'login' && <>
          <Field id="lgPass" label="Contraseña" icon="lock" extra={<EyeBtn show={show} toggle={() => setShow(s => !s)} />}>
            <input id="lgPass" type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder="Ingresa tu contraseña"
              value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <div className="lg-row">
            <label className="lg-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Mantener sesión iniciada</span></label>
            <button type="button" className="lg-link" onClick={() => go('forgot')}>¿Olvidó su contraseña?</button>
          </div>
        </>}

        {error && <div className="lg-msg err" role="alert"><Icon name="alert" size={16} /><span>{error}</span></div>}
        {info && <div className="lg-msg ok" role="status"><Icon name="checkCircle" size={16} /><span>{info}</span></div>}

        <button className="lg-btn" type="submit" disabled={busy}>
          {busy ? <><span className="lg-spin" />Un momento…</>
            : mode === 'login' ? <><Icon name="logIn" size={20} />Ingresar<Icon name="arrowRight" size={18} /></>
            : <>Enviar enlace<Icon name="arrowRight" size={18} /></>}
        </button>
        {mode === 'forgot' && <button type="button" className="lg-link lg-back" onClick={() => go('login')}><Icon name="arrowLeft" size={15} />Volver a iniciar sesión</button>}
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
    <Shell title="Nueva contraseña" sub="Elige una contraseña segura de al menos 8 caracteres.">
      <form onSubmit={submit}>
        <Field id="npA" label="Nueva contraseña" icon="lock" extra={<EyeBtn show={show} toggle={() => setShow(s => !s)} />}>
          <input id="npA" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus required value={p1} onChange={e => setP1(e.target.value)} />
        </Field>
        <Field id="npB" label="Repite la contraseña" icon="lock">
          <input id="npB" type={show ? 'text' : 'password'} autoComplete="new-password" required value={p2} onChange={e => setP2(e.target.value)} />
        </Field>
        {error && <div className="lg-msg err" role="alert"><Icon name="alert" size={16} /><span>{error}</span></div>}
        <button className="lg-btn" type="submit" disabled={busy}>{busy ? <><span className="lg-spin" />Guardando…</> : 'Guardar contraseña'}</button>
      </form>
    </Shell>
  )
}
