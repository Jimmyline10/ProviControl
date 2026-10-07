import { useRef, useState } from 'react'
import { DEF_CFG } from '../constants'
import { useApp } from '../context/AppContext'
import { useUI } from '../context/UIContext'
import { makeDemo } from '../logic/demo'
import { downloadBackup, parseBackup } from '../services/backup'
import { exportAll } from '../services/exportExcel'
import { pad } from '../utils/date'

function CfgForm() {
  const { cfg, data, saveConfig } = useApp()
  const { toast } = useUI()
  const maxSlot = Math.max(1, ...data.appointments.map(a => a.slot))
  const [v, setV] = useState({ metaCump: cfg.metaCump, maxImpr: cfg.maxImpr, maxAbs: cfg.maxAbs, maxDelay: cfg.maxDelay, slots: cfg.slots })
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: +e.target.value })
  const save = () => {
    if (Object.values(v).some(x => !Number.isFinite(x) || x < 0) || v.slots < 1) return toast('Revise los valores.')
    if (v.slots < maxSlot) return toast(`Hay citas en el espacio ${maxSlot}. Mínimo ${maxSlot}.`)
    saveConfig({ ...cfg, ...v, metaPunt: v.metaCump }); toast('Metas guardadas.')
  }
  const field = (id: string, label: string, k: keyof typeof v, min: number, max: number) =>
    <div className="field"><label htmlFor={id}>{label}</label><input id={id} type="number" min={min} max={max} value={v[k]} onChange={set(k)} /></div>
  return (
    <>
      <div className="formgrid">
        {field('cMeta', 'Meta de cumplimiento / puntualidad (≥ %)', 'metaCump', 1, 100)}
        {field('cImpr', 'Improvisación máxima (≤ %)', 'maxImpr', 0, 100)}
        {field('cAbs', 'Inasistencia máxima (≤ %)', 'maxAbs', 0, 100)}
        {field('cDel', 'Retraso aceptable (≤ min)', 'maxDelay', 1, 240)}
        {field('cSlots', `Espacios por hora (mín. ${maxSlot})`, 'slots', maxSlot, 8)}
      </div>
      <div className="toolbar" style={{ margin: '14px 0 0' }}>
        <button className="btn navy" onClick={save}>Guardar metas</button>
        <button className="btn ghost" onClick={() => { saveConfig({ ...DEF_CFG }); toast('Valores restablecidos.') }}>Restablecer valores</button>
      </div>
    </>
  )
}

export function AjustesView() {
  const { data, cfg, status, addData, saveConfig, removeDemo, wipeAll, restore } = useApp()
  const { confirm, toast } = useUI()
  const file = useRef<HTMLInputElement>(null)
  const n = data.appointments.length + data.walkins.length
  const demo = data.appointments.filter(a => a.demo).length + data.walkins.filter(w => w.demo).length
  const ls = status.lastSaved

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return
    const b = parseBackup(await f.text())
    if (!b) return toast('El archivo no es un respaldo válido.')
    if (!(await confirm(`El respaldo trae ${b.data.appointments.length} citas y ${b.data.walkins.length} registros sin cita. Reemplazará los datos actuales.`, 'Restaurar'))) return
    restore(b.data, b.cfg); toast('Respaldo restaurado.')
  }
  const loadDemo = async () => {
    if (n && !(await confirm('Se agregarán datos de ejemplo junto a los registros actuales. Podrá quitarlos después sin perder los suyos.', 'Agregar ejemplo'))) return
    addData(makeDemo(cfg)); toast('Datos de ejemplo cargados.')
  }
  const wipe = async () => {
    if (await confirm('Se borrarán TODAS las citas y registros. Descargue un respaldo antes si lo necesita.', 'Borrar todo')) { wipeAll(); toast('Datos borrados.') }
  }
  const stat = (l: string, v: React.ReactNode, style?: React.CSSProperties) =>
    <div className="s"><div className="l">{l}</div><div className="v" style={style}>{v}</div></div>

  return (
    <>
      <div className="view-head"><div><h1>Datos y ajustes</h1><p>Respaldo, metas de los indicadores y herramientas de datos.</p></div></div>
      <div className="stack-v">
        <div className="card"><div className="card-h"><h3>💾 Guardado y respaldo</h3></div><div className="card-b">
          <div className="statgrid" style={{ marginBottom: 14 }}>
            {stat('Registros', n)}{stat('Citas', data.appointments.length)}{stat('Sin cita', data.walkins.length)}
            {stat('Último guardado', ls ? pad(ls.getHours()) + ':' + pad(ls.getMinutes()) : '—', { fontSize: 15 })}
            {stat('Base de datos', status.error ? 'Sin conexión' : 'Supabase', { fontSize: 15, color: status.error ? 'var(--red)' : 'var(--green)' })}
          </div>
          {status.error && <div className="banner warn">{status.error}</div>}
          <p className="note">Cada cambio se guarda en la <b>base de datos (Supabase)</b>, por lo que ya no depende de este navegador ni de este equipo. Aun así puede descargar un <b>respaldo</b> .json y restaurarlo cuando quiera.</p>
          <div className="toolbar" style={{ margin: '12px 0 0' }}>
            <button className="btn navy" onClick={() => { downloadBackup(data, cfg); toast('Respaldo descargado. Guárdelo en un lugar seguro.') }}>⬇️ Descargar respaldo (.json)</button>
            <button className="btn ghost" onClick={() => file.current?.click()}>⬆️ Restaurar respaldo…</button>
            <input ref={file} type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={onFile} />
            <button className="btn green" onClick={() => { exportAll(data); toast('Excel exportado.') }}>📥 Exportar todo a Excel</button>
          </div></div></div>

        <div className="card"><div className="card-h"><h3>🎯 Metas e indicadores</h3><span className="hint">Definen los colores y semáforos de toda la aplicación</span></div>
          <div className="card-b"><CfgForm key={JSON.stringify(cfg)} /></div></div>

        <div className="card"><div className="card-h"><h3>📐 Cómo se calculan los indicadores</h3></div><div className="card-b"><p className="note">
          <b>Cumplimiento general</b> = <code>a tiempo ÷ (programadas + sin cita)</code>. Los imprevistos lo reducen.<br />
          <b>Cumplimiento de cita</b> = <code>llegaron con cita ÷ (con cita + sin cita)</code>. Es el % de la hoja de control en Excel.<br />
          <b>Puntualidad</b> = <code>a tiempo ÷ llegaron con cita</code>.<br />
          <b>Improvisación</b> = <code>sin cita ÷ (programadas + sin cita)</code>. <b>Inasistencia</b> = <code>no llegaron ÷ programadas</code>.<br />
          <b>Retraso</b> = minutos desde el inicio de la hora agendada hasta la llegada real. <b>Ocupación</b> = <code>citas ÷ (espacios por hora × 7 horas × 6 días)</code>.</p></div></div>

        <div className="card"><div className="card-h"><h3>🧪 Datos de prueba y limpieza</h3></div><div className="card-b">
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn ghost" onClick={loadDemo}>Cargar datos de ejemplo (6 semanas)</button>
            <button className="btn ghost" disabled={!demo} onClick={() => { removeDemo(); toast('Datos de ejemplo quitados.') }}>Quitar datos de ejemplo ({demo})</button>
            <button className="btn danger" onClick={wipe}>🗑 Borrar todos los datos</button>
          </div>
          <p className="note" style={{ marginTop: 10 }}>Los datos de ejemplo se marcan aparte: puede quitarlos sin perder sus registros reales.</p></div></div>
      </div>
    </>
  )
}
