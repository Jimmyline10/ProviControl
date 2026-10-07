import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import { ConfirmBox } from '../ConfirmBox'
import { ActionDialogs } from './index'

export function DialogHost() {
  const { dialog } = useUI()
  const { data } = useApp()
  const A = (id?: string) => data.appointments.find(a => a.id === id)
  const W = (id?: string) => data.walkins.find(w => w.id === id)
  let node = null
  if (dialog) switch (dialog.kind) {
    case 'arrival': { const a = A(dialog.id); node = a && <ActionDialogs.Arrival key={a.id} a={a} /> ; break }
    case 'appt-actions': { const a = A(dialog.id); node = a && <ActionDialogs.Actions a={a} />; break }
    case 'walk-actions': { const w = W(dialog.id); node = w && <ActionDialogs.WalkActions w={w} />; break }
    case 'appt-form': node = <ActionDialogs.ApptForm key={dialog.id ?? 'new'} a={A(dialog.id)} pre={dialog.pre} />; break
    case 'walk-form': node = <ActionDialogs.WalkForm key={dialog.id ?? 'new'} w={W(dialog.id)} />; break
    case 'provider': node = <ActionDialogs.Provider pkey={dialog.key} />; break
    case 'pick': node = <ActionDialogs.Pick />; break
  }
  return <>{node}<ConfirmBox /></>
}
