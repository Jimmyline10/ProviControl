import { FormEvent, ReactNode, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Icon } from './Icon'
import '../styles/login.css'

const Brand = ({ light }: { light?: boolean }) => (
  <div className={'lg-brand' + (light ? ' light' : '')}>
    <div className="lg-mark">PC</div>
    <div><div className="lg-brand-name">ProviControl</div><div className="lg-brand-sub">Recepción de proveedores</div></div>
  </div>
)

const FEATS: [string, string, string][] = [
  ['calendar', 'Agenda de citas', 'Programe la recepción por día, hora y espacio disponible.'],
  ['clipboard', 'Bitácora de recepción', 'Registre llegadas a tiempo, tardanzas y entregas sin cita.'],
  ['chart', 'Indicadores y reportes', 'Cumplimiento, puntualidad y exportación a Excel.'],
]

/* ---------- estructura común: panel de marca + formulario ---------- */
function Shell({ title, sub, children }: { title: string; sub: string; children: ReactNode }) {
  return (
    <div className="lg">
      <aside className="lg-hero">
        <Brand light />
        <div className="lg-hero-body">
          <h1 className="lg-title">Control de recepción de proveedores para su almacén</h1>
          <ul className="lg-feats">
            {FEATS.map(([ico, t, d]) => (
              <li key={t}><span className="lg-feat-ico"><Icon name={ico} size={18} /></span>
                <div><b>{t}</b><span>{d}</span></div></li>))}
          </ul>
        </div>
        <p className="lg-hero-foot">© {new Date().getFullYear()} ProviControl</p>
      </aside>
      <main className="lg-panel">
        <div className="lg-form-wrap">
          <div className="lg-mobile-brand"><Brand /></div>
          <h2 className="lg-h2">{title}</h2>
          <p className="lg-sub">{sub}</p>
          {children}
        </div>
        <p className="lg-foot"><Icon name="shield" size={13} />Acceso exclusivo para personal autorizado</p>
      </main>
    </div>
  )
}

function Field({ id, label, icon, children, extra }: { id: string; label: string; icon: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="lg-field">
      <label className="lg-label" htmlFor={id}>{label}</label>
      <div className="lg-input"><Icon name={icon} size={16} />{children}{extra}</div>
    </div>
  )
}

const EyeBtn = ({ show, toggle }: { show: boolean; toggle: () => void }) => (
  <button type="button" className="lg-eye" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={toggle}>
    <Icon name={show ? 'eyeOff' : 'eye'} size={16} />
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
      sub={mode === 'login' ? 'Ingrese sus credenciales para acceder al sistema.' : 'Le enviaremos un enlace a su correo para crear una nueva contraseña.'}>
      <form onSubmit={submit}>
        <Field id="lgEmail" label="Correo electrónico" icon="mail">
          <input id="lgEmail" type="email" autoComplete="username" autoFocus required placeholder="usuario@empresa.com"
            value={email} onChange={e => setEmail(e.target.value)} />
        </Field>

        {mode === 'login' && <>
          <Field id="lgPass" label="Contraseña" icon="lock" extra={<EyeBtn show={show} toggle={() => setShow(s => !s)} />}>
            <input id="lgPass" type={show ? 'text' : 'password'} autoComplete="current-password" required placeholder="Ingrese su contraseña"
              value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <div className="lg-row">
            <label className="lg-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} />
              <span>Mantener sesión iniciada</span></label>
            <button type="button" className="lg-link" onClick={() => go('forgot')}>¿Olvidó su contraseña?</button>
          </div>
        </>}

        {error && <div className="lg-msg err" role="alert"><Icon name="alert" size={15} /><span>{error}</span></div>}
        {info && <div className="lg-msg ok" role="status"><Icon name="checkCircle" size={15} /><span>{info}</span></div>}

        <button className="lg-btn" type="submit" disabled={busy}>
          {busy ? <><span className="lg-spin" />Un momento…</> : mode === 'login' ? <>Ingresar<Icon name="arrowRight" size={16} /></> : 'Enviar enlace'}
        </button>
        {mode === 'forgot' && <button type="button" className="lg-link lg-back" onClick={() => go('login')}><Icon name="arrowLeft" size={14} />Volver a iniciar sesión</button>}
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
    <Shell title="Nueva contraseña" sub="Elija una contraseña segura de al menos 8 caracteres.">
      <form onSubmit={submit}>
        <Field id="npA" label="Nueva contraseña" icon="lock" extra={<EyeBtn show={show} toggle={() => setShow(s => !s)} />}>
          <input id="npA" type={show ? 'text' : 'password'} autoComplete="new-password" autoFocus required value={p1} onChange={e => setP1(e.target.value)} />
        </Field>
        <Field id="npB" label="Repita la contraseña" icon="lock">
          <input id="npB" type={show ? 'text' : 'password'} autoComplete="new-password" required value={p2} onChange={e => setP2(e.target.value)} />
        </Field>
        {error && <div className="lg-msg err" role="alert"><Icon name="alert" size={15} /><span>{error}</span></div>}
        <button className="lg-btn" type="submit" disabled={busy}>{busy ? <><span className="lg-spin" />Guardando…</> : 'Guardar contraseña'}</button>
      </form>
    </Shell>
  )
}
