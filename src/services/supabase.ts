import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el archivo .env')
}

const REMEMBER_KEY = 'provicontrol_remember'
/** Define si la sesión se recuerda (localStorage) o dura solo mientras esté abierta la pestaña. */
export const setRemember = (v: boolean) => localStorage.setItem(REMEMBER_KEY, v ? '1' : '0')

const authStorage = {
  getItem: (k: string) => localStorage.getItem(k) ?? sessionStorage.getItem(k),
  setItem: (k: string, v: string) => {
    const remember = localStorage.getItem(REMEMBER_KEY) !== '0'
    localStorage.removeItem(k); sessionStorage.removeItem(k)
    ;(remember ? localStorage : sessionStorage).setItem(k, v)
  },
  removeItem: (k: string) => { localStorage.removeItem(k); sessionStorage.removeItem(k) },
}

export const supabase = createClient(url, key, { auth: { storage: authStorage } })