import { useState } from 'react'
import { HOURS, ST } from '../../constants'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import { applyArrival, pickSlot, slotTaken } from '../../logic/appointments'
import type { Appointment, Status } from '../../types'
import { hh, mondayOf, todayISO } from '../../utils/date'
import { uid } from '../../utils/format'
import { Modal } from '../Modal'
import { ProviderDatalist } from '../ProviderDatalist'

interface Props { a?: Appointment; pre?: { date?: string; hour?: number; slot?: number } }

export function ApptForm({ a, pre }: Props) {
  const { data, cfg, saveAppointment, setWeek } = useApp()
  const { toast, closeDialog } = useUI()
  const isNew = !a
  const want = a ? `${a.hour}:${a.slot}` : pre?.hour ? `${pre.hour}:${pre.slot}` : ''
  const [prov, setProv] = useState(a?.provider ?? '')
  const [date, setDate] = useState(a?.date ?? pre?.date ?? todayISO())
  const [slot, setSlot] = useState(() => pickSlot(data, cfg, date, want, a?.id))
  const [status, setStatus] = useState<Status>(a?.status ?? 'pending')
  const [arr, setArr] = useState(a?.arrival ?? '')
  const [notes, setNotes] = useState(a?.notes ?? '')

  const onDate = (d: string) => { setDate(d); setSlot(pickSlot(data, cfg, d, want, a?.id)) }

  const save = () => {
    const provider = prov.trim(), [h, s] = slot.split(':').map(Number)
    if (provider.length < 2) { toast('Escriba el nombre del proveedor.'); return false }
    if (!date) { toast('Elija el día.'); return false }
    if (!slot || slotTaken(data, date, h, s, a?.id)) { toast('Ese espacio ya está ocupado.'); return false }
    if (!a) {
      saveAppointment({ id: uid(), provider, date, hour: h, slot: s, status: 'pending', arrival: '', delay: 0,
        notes: notes.trim(), createdAt: new Date().toISOString(), demo: false })
      toast('Cita programada.')
    } else {
      const base = { ...a, provider, date, hour: h, slot: s, notes: notes.trim() }
      saveAppointment(status === 'ontime' || status === 'late'
        ? applyArrival(base, status, arr || hh(h)) : { ...base, status, arrival: '', delay: 0 })
      toast('Cita actualizada.')
    }
    setWeek(mondayOf(date))
  }

  return (
    <Modal title={isNew ? 'Programar proveedor' : 'Editar cita'} sub={isNew ? 'Solo se necesita el nombre del proveedor.' : ''}
      onClose={closeDialog} buttons={[{ label: 'Cancelar' }, { label: 'Guardar', cls: 'primary', onClick: save }]}>
      <ProviderDatalist />
      <div className="form-body" style={{ padding: 0 }}>
        <div className="field"><label htmlFor="mProv">Proveedor *</label>
          <input id="mProv" list="provList" maxLength={120} autoComplete="off" autoFocus value={prov}
            onChange={e => setProv(e.target.value)} placeholder="Ej. ALICORP" /></div>
        <div className="field"><label htmlFor="mDate">Día *</label>
          <input id="mDate" type="date" value={date} onChange={e => onDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="mSlot">Hora y espacio *</label>
          <select id="mSlot" value={slot} onChange={e => setSlot(e.target.value)}>
            {HOURS.flatMap(h => Array.from({ length: cfg.slots }, (_, i) => i + 1).map(s => {
              const occ = slotTaken(data, date, h, s, a?.id)
              return <option key={`${h}:${s}`} value={`${h}:${s}`} disabled={occ}>{hh(h)} · Espacio {s}{occ ? ' (ocupado)' : ''}</option>
            }))}
          </select></div>
        {!isNew && <>
          <div className="field"><label htmlFor="mStatus">Estado</label>
            <select id="mStatus" value={status} onChange={e => setStatus(e.target.value as Status)}>
              {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select></div>
          <div className="field"><label htmlFor="mArr">Hora de llegada</label>
            <input id="mArr" type="time" value={arr} onChange={e => setArr(e.target.value)} /></div>
        </>}
        <div className="field"><label htmlFor="mNotes">Observación (opcional)</label>
          <textarea id="mNotes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
      </div>
    </Modal>
  )
}
