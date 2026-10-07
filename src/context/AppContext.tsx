import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { DEF_CFG } from '../constants'
import * as repo from '../services/repository'
import type { AppData, Appointment, Config, Walkin } from '../types'
import { EMPTY_HIST, HistFilters } from '../logic/history'
import type { Scope } from '../logic/indicators'
import { mondayOf, todayISO } from '../utils/date'
import { useUI } from './UIContext'

export interface SaveStatus { saving: boolean; error: string; lastSaved: Date | null }
interface AppCtx {
  data: AppData; cfg: Config; week: string; setWeek: (w: string) => void; status: SaveStatus
  reload: () => Promise<void>
  saveAppointment: (a: Appointment) => void; removeAppointment: (id: string) => void
  saveWalkin: (w: Walkin) => void; removeWalkin: (id: string) => void
  clearRange: (from: string, to: string) => void
  addData: (d: AppData) => void
  saveConfig: (c: Config) => void; removeDemo: () => void; wipeAll: () => void; restore: (d: AppData, c?: Config) => void
  scope: Scope; setScope: (s: Scope) => void
  hist: HistFilters; setHist: (h: HistFilters) => void
}
const Ctx = createContext<AppCtx>(null!)
export const useApp = () => useContext(Ctx)

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some(x => x.id === item.id) ? list.map(x => (x.id === item.id ? item : x)) : [...list, item]

export function AppProvider({ children }: { children: ReactNode }) {
  const { toast } = useUI()
  const [data, setData] = useState<AppData>({ appointments: [], walkins: [] })
  const [cfg, setCfg] = useState<Config>(DEF_CFG)
  const [week, setWeek] = useState(mondayOf(todayISO()))
  const [scope, setScope] = useState<Scope>('week')
  const [hist, setHist] = useState<HistFilters>(EMPTY_HIST)
  const [status, setStatus] = useState<SaveStatus>({ saving: false, error: '', lastSaved: null })

  const reload = useCallback(async () => {
    try { const r = await repo.loadAll(); setData(r.data); setCfg(r.cfg); setStatus(s => ({ ...s, error: '' })) }
    catch (e: any) { setStatus(s => ({ ...s, error: e.message })) }
  }, [])
  useEffect(() => { reload() }, [reload])

  /** Guarda en Supabase; si falla avisa y vuelve a leer la BD para no mostrar datos falsos. */
  const run = async (op: () => Promise<void>) => {
    setStatus(s => ({ ...s, saving: true }))
    try { await op(); setStatus({ saving: false, error: '', lastSaved: new Date() }) }
    catch (e: any) { setStatus(s => ({ ...s, saving: false, error: e.message })); toast('No se pudo guardar: ' + e.message); reload() }
  }

  const saveAppointment = (a: Appointment) => { setData(d => ({ ...d, appointments: upsert(d.appointments, a) })); run(() => repo.saveAppointment(a)) }
  const removeAppointment = (id: string) => { setData(d => ({ ...d, appointments: d.appointments.filter(x => x.id !== id) })); run(() => repo.deleteAppointment(id)) }
  const saveWalkin = (w: Walkin) => { setData(d => ({ ...d, walkins: upsert(d.walkins, w) })); run(() => repo.saveWalkin(w)) }
  const removeWalkin = (id: string) => { setData(d => ({ ...d, walkins: d.walkins.filter(x => x.id !== id) })); run(() => repo.deleteWalkin(id)) }

  const clearRange = (from: string, to: string) => {
    const out = (d: string) => d < from || d > to
    setData(d => ({ appointments: d.appointments.filter(a => out(a.date)), walkins: d.walkins.filter(w => out(w.date)) }))
    run(() => repo.deleteRange(from, to))
  }

  const addData = (d: AppData) => {
    setData(p => ({ appointments: [...p.appointments, ...d.appointments], walkins: [...p.walkins, ...d.walkins] }))
    run(() => repo.insertMany(d))
  }

  const saveConfig = (c: Config) => { setCfg(c); run(() => repo.saveConfig(c)) }
  const removeDemo = () => {
    setData(d => ({ appointments: d.appointments.filter(a => !a.demo), walkins: d.walkins.filter(w => !w.demo) }))
    run(() => repo.deleteDemo())
  }
  const wipeAll = () => { setData({ appointments: [], walkins: [] }); run(() => repo.wipeAll()) }
  const restore = (d: AppData, c?: Config) => {
    setData(d); if (c) setCfg(c)
    run(async () => { await repo.replaceAll(d); if (c) await repo.saveConfig(c) })
  }

  return <Ctx.Provider value={{ data, cfg, week, setWeek, status, reload, saveAppointment, removeAppointment, saveWalkin, removeWalkin, clearRange, addData, saveConfig, removeDemo, wipeAll, restore, scope, setScope, hist, setHist }}>{children}</Ctx.Provider>
}
