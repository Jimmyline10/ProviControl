export type Status = 'ontime' | 'late' | 'absent' | 'pending'

export interface Appointment {
  id: string; provider: string; date: string; hour: number; slot: number
  status: Status; arrival: string; delay: number; notes: string; createdAt: string; demo: boolean
}
export interface Walkin {
  id: string; provider: string; date: string; arrival: string; notes: string; createdAt: string; demo: boolean
}
export interface AppData { appointments: Appointment[]; walkins: Walkin[] }
export interface Config {
  metaCump: number; metaPunt: number; maxAbs: number; maxImpr: number; maxDelay: number; slots: number
}
export type DateFilter = (d: string) => boolean
