import type { Session } from '@supabase/supabase-js'
import { createContext, ReactNode, useContext, useEffect, useState } from 'react'
import { setRemember, supabase } from '../services/supabase'

interface Auth {
  session: Session | null
  loading: boolean
  recovering: boolean
  signIn: (email: string, password: string, remember: boolean) => Promise<string | null>
  sendReset: (email: string) => Promise<string | null>
  updatePassword: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
}
const Ctx = createContext<Auth>(null!)
export const useAuth = () => useContext(Ctx)

const friendly = (m: string) =>
  /invalid login/i.test(m) ? 'Correo o contraseña incorrectos.'
  : /rate limit|too many/i.test(m) ? 'Demasiados intentos. Espere un momento e intente de nuevo.'
  : /email not confirmed/i.test(m) ? 'El correo aún no está confirmado.'
  : 'No se pudo completar la acción: ' + m

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  /** Devuelve null si todo salió bien, o el mensaje de error en español. */
  const signIn = async (email: string, password: string, remember: boolean) => {
    setRemember(remember)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    return error ? friendly(error.message) : null
  }
  const sendReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
    return error ? friendly(error.message) : null
  }
  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return friendly(error.message)
    setRecovering(false)
    return null
  }
  const signOut = async () => { await supabase.auth.signOut() }

  return <Ctx.Provider value={{ session, loading, recovering, signIn, sendReset, updatePassword, signOut }}>{children}</Ctx.Provider>
}