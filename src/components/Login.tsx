import { FormEvent, useState } from 'react'
import { useAuth } from '../context/AuthContext'

export function Login() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [error, setError] = useState(''), [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setBusy(true); setError('')
    const msg = await signIn(email, password)
    if (msg) setError(msg)
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 16 }}>
      <form onSubmit={submit} className="card card-b" style={{ width: '100%', maxWidth: 380 }}>
        <h1 style={{ margin: 0, color: 'var(--navy)', fontSize: 24 }}>ProviControl</h1>
        <p className="note" style={{ margin: '4px 0 16px' }}>Inicie sesión para continuar.</p>
        <div className="field"><label htmlFor="lEmail">Correo</label>
          <input id="lEmail" type="email" autoComplete="username" autoFocus required value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div className="field" style={{ marginTop: 10 }}><label htmlFor="lPass">Contraseña</label>
          <input id="lPass" type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
        {error && <div className="banner warn" style={{ marginTop: 12 }}>{error}</div>}
        <button className="btn navy" type="submit" disabled={busy} style={{ marginTop: 16, width: '100%' }}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </div>
  )
}
