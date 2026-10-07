import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { useUI } from '../../context/UIContext'
import type { Walkin } from '../../types'
import { mondayOf, nowHM, toMin, todayISO } from '../../utils/date'
import { uid } from '../../utils/format'
import { Modal } from '../Modal'
import { ProviderDatalist } from '../ProviderDatalist'

export function WalkForm({ w }: { w?: Walkin }) {
  const { saveWalkin, setWeek } = useApp()
  const { toast, closeDialog } = useUI()
  const [prov, setProv] = useState(w?.provider ?? '')
  const [date, setDate] = useState(w?.date ?? todayISO())
  const [arr, setArr] = useState(w?.arrival ?? nowHM())
  const [notes, setNotes] = useState(w?.notes ?? '')

  const save = () => {
    const provider = prov.trim()
    if (provider.length < 2) { toast('Escriba el nombre del proveedor.'); return false }
    if (!date || toMin(arr) == null) { toast('Complete el día y la hora de llegada.'); return false }
    saveWalkin({ id: w?.id ?? uid(), provider, date, arrival: arr, notes: notes.trim(),
      createdAt: w?.createdAt ?? new Date().toISOString(), demo: w?.demo ?? false })
    toast(w ? 'Registro actualizado.' : 'Sin cita registrado.')
    setWeek(mondayOf(date))
  }

  return (
    <Modal title={w ? 'Editar registro sin cita' : 'Registrar sin cita'} sub="Ingreso no programado. Reduce el cumplimiento de agenda."
      onClose={closeDialog} buttons={[{ label: 'Cancelar' }, { label: 'Guardar', cls: 'primary', onClick: save }]}>
      <ProviderDatalist />
      <div className="form-body" style={{ padding: 0 }}>
        <div className="field"><label htmlFor="wProv">Proveedor *</label>
          <input id="wProv" list="provList" maxLength={120} autoComplete="off" autoFocus value={prov}
            onChange={e => setProv(e.target.value)} placeholder="Nombre del proveedor" /></div>
        <div className="field"><label htmlFor="wDate">Día *</label>
          <input id="wDate" type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="wArr">Hora de llegada *</label>
          <input id="wArr" type="time" value={arr} onChange={e => setArr(e.target.value)} /></div>
        <div className="field"><label htmlFor="wNotes">Observaciones</label>
          <textarea id="wNotes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Motivo, incidencia…" /></div>
      </div>
    </Modal>
  )
}
