import { useState } from 'react'
import { DAYS_FULL, DAYS_SHORT, ST } from '../../constants'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import { applyArrival, markAbsent, resetAppt } from '../../logic/appointments'
import { inWeekF } from '../../logic/indicators'
import type { Appointment, Walkin } from '../../types'
import { dow, fmtShort, hh, nowHM, toMin, todayISO } from '../../utils/date'
import { Modal } from '../Modal'

export function ArrivalDialog({ a }: { a: Appointment }) {
  const { saveAppointment } = useApp()
  const { toast, closeDialog } = useUI()
  const def = a.date === todayISO() ? nowHM() : hh(a.hour)
  const [t, setT] = useState(a.arrival || def)
  return (
    <Modal title={'Registrar llegada · ' + a.provider} onClose={closeDialog}
      sub={`${DAYS_FULL[dow(a.date)] || ''} ${fmtShort(a.date)} · cita de las ${hh(a.hour)} · espacio ${a.slot}`}
      buttons={[
        { label: 'Cancelar' },
        { label: '🔴 No llegó', cls: 'danger', onClick: () => { saveAppointment(markAbsent(a)); toast('Inasistencia registrada.') } },
        { label: '🟠 Llegó tarde', onClick: () => {
          if (toMin(t) == null) { toast('Indique la hora de llegada.'); return false }
          const n = applyArrival(a, 'late', t); saveAppointment(n); toast(`Tarde · ${n.delay} min de retraso.`) } },
        { label: '🟢 Llegó a tiempo', cls: 'primary', onClick: () => { saveAppointment(applyArrival(a, 'ontime', t || def)); toast('Registrado: A TIEMPO.') } },
      ]}>
      <div className="field"><label htmlFor="arrT">Hora real de llegada</label>
        <input id="arrT" type="time" autoFocus value={t} onChange={e => setT(e.target.value)} /></div>
      <p className="note" style={{ marginTop: 10 }}>«Tarde» calcula el retraso desde el inicio de la hora agendada ({hh(a.hour)}).</p>
    </Modal>
  )
}

export function ApptActions({ a }: { a: Appointment }) {
  const { saveAppointment, removeAppointment } = useApp()
  const { toast, closeDialog, openDialog, confirm } = useUI()
  const acts: [string, string, () => void][] = [
    ['🟢 Registrar llegada…', 'primary', () => openDialog({ kind: 'arrival', id: a.id })],
    ['🔴 No llegó', 'danger', () => { saveAppointment(markAbsent(a)); toast('Inasistencia registrada.') }],
    ['↺ Restablecer a «Programada»', 'light', () => saveAppointment(resetAppt(a))],
    ['✎ Editar cita', 'light', () => openDialog({ kind: 'appt-form', id: a.id })],
    ['🗑 Eliminar', 'light', async () => { if (await confirm(`¿Eliminar la cita de ${a.provider}?`, 'Eliminar')) { removeAppointment(a.id); toast('Cita eliminada.') } }],
  ]
  return (
    <Modal onClose={closeDialog} title={a.provider} sub={<>{fmtShort(a.date)} · {hh(a.hour)} · Espacio {a.slot} · <b>{ST[a.status]}</b>
      {a.arrival ? ' · llegó ' + a.arrival : ''}{a.status === 'late' ? ` (+${a.delay} min)` : ''}</>}>
      <div className="action-list">
        {acts.map(([l, c, fn]) => <button key={l} type="button" className={'btn ' + c} onClick={() => { closeDialog(); fn() }}>{l}</button>)}
      </div>
    </Modal>
  )
}

export function WalkActions({ w }: { w: Walkin }) {
  const { removeWalkin } = useApp()
  const { closeDialog, openDialog, confirm } = useUI()
  const acts: [string, () => void][] = [
    ['✎ Editar registro', () => openDialog({ kind: 'walk-form', id: w.id })],
    ['🗑 Eliminar', async () => { if (await confirm(`¿Eliminar el registro de ${w.provider}?`, 'Eliminar')) removeWalkin(w.id) }],
  ]
  return (
    <Modal onClose={closeDialog} title={w.provider} sub={`Sin cita · ${fmtShort(w.date)} · ${w.arrival || ''}`}>
      <div className="action-list">
        {acts.map(([l, fn]) => <button key={l} type="button" className="btn light" onClick={() => { closeDialog(); fn() }}>{l}</button>)}
      </div>
    </Modal>
  )
}

export function PickDialog() {
  const { data, week } = useApp()
  const { closeDialog, openDialog } = useUI()
  const inW = inWeekF(week)
  const pend = data.appointments.filter(a => a.status === 'pending' && inW(a.date))
    .sort((a, b) => a.date.localeCompare(b.date) || a.hour - b.hour || a.slot - b.slot)
  return (
    <Modal onClose={closeDialog} title="Registrar llegada" sub="Elija la cita del proveedor que llegó.">
      <div className="action-list">
        {pend.length === 0 && <p className="note">No hay citas pendientes esta semana.</p>}
        {pend.map(a => (
          <button key={a.id} type="button" className="btn light" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
            onClick={() => openDialog({ kind: 'arrival', id: a.id })}>
            <b>{a.provider}</b>&nbsp;· {DAYS_SHORT[dow(a.date)] || ''} {fmtShort(a.date)} · {hh(a.hour)} #{a.slot}
          </button>
        ))}
      </div>
    </Modal>
  )
}
