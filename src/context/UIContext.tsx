import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'

export type DialogState =
  | { kind: 'arrival'; id: string }
  | { kind: 'appt-actions'; id: string }
  | { kind: 'walk-actions'; id: string }
  | { kind: 'appt-form'; id?: string; pre?: { date?: string; hour?: number; slot?: number } }
  | { kind: 'walk-form'; id?: string }
  | { kind: 'pick' }
  | { kind: 'provider'; key: string }

interface ConfirmState { msg: string; okLabel: string }
interface UI {
  toastMsg: string; toastOn: boolean; toast: (m: string) => void
  dialog: DialogState | null; openDialog: (d: DialogState) => void; closeDialog: () => void
  confirmState: ConfirmState | null
  confirm: (msg: string, okLabel?: string) => Promise<boolean>
  resolveConfirm: (v: boolean) => void
}
const Ctx = createContext<UI>(null!)
export const useUI = () => useContext(Ctx)

export function UIProvider({ children }: { children: ReactNode }) {
  const [toastMsg, setToastMsg] = useState(''), [toastOn, setToastOn] = useState(false)
  const timer = useRef<number>()
  const toast = useCallback((m: string) => {
    setToastMsg(m); setToastOn(true)
    clearTimeout(timer.current); timer.current = window.setTimeout(() => setToastOn(false), 2600)
  }, [])

  const [dialog, setDialog] = useState<DialogState | null>(null)
  const openDialog = useCallback((d: DialogState) => setDialog(d), [])
  const closeDialog = useCallback(() => setDialog(null), [])

  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null)
  const resolver = useRef<((v: boolean) => void) | null>(null)
  const resolveConfirm = useCallback((v: boolean) => {
    const r = resolver.current; resolver.current = null; setConfirmState(null); r?.(v)
  }, [])
  const confirm = useCallback((msg: string, okLabel = 'Confirmar') =>
    new Promise<boolean>(res => { resolver.current = res; setConfirmState({ msg, okLabel }) }), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (resolver.current) resolveConfirm(false); else setDialog(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [resolveConfirm])

  return <Ctx.Provider value={{ toastMsg, toastOn, toast, dialog, openDialog, closeDialog, confirmState, confirm, resolveConfirm }}>{children}</Ctx.Provider>
}
