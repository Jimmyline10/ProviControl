import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/Icon'
import { Modal } from '../components/Modal'
import { Paper, PAPER, printRotulo, RotuloData, RotuloPrintPortal, RotuloSheet } from '../components/Rotulo'
import { useAuth } from '../context/AuthContext'
import { useUI } from '../context/UIContext'
import { notifyExport } from '../services/exportExcel'
import {
  brandOf, clearProducts, deleteProduct, exportProducts, findProduct, loadProducts, localCount,
  parseProductsFile, Product, ProductStore, pushLocalToCloud, upsertProducts,
} from '../services/products'

const PER_PAGE = 50
const PAPER_KEY = 'provicontrol_rotulo_papel'
const savedPaper = (): Paper => { try { return localStorage.getItem(PAPER_KEY) === 'letter' ? 'letter' : 'A4' } catch { return 'A4' } }

/* ---------- Formulario: crear rótulo ---------- */
function RotuloForm({ list, pre, onClose }: { list: Product[]; pre?: string; onClose: () => void }) {
  const { toast } = useUI()
  const [code, setCode] = useState(pre || '')
  const [fv, setFv] = useState('')
  const [qty, setQty] = useState('')
  const [manual, setManual] = useState('')
  const [paper, setPaper] = useState<Paper>(savedPaper)
  const [open, setOpen] = useState(false)
  const p = findProduct(list, code)
  const description = p?.description || manual
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [onClose])

  // Sugerencias: por estilo (empieza con) o por descripción (contiene)
  const sug = useMemo(() => {
    const q = code.trim().toUpperCase()
    if (!q || p) return []
    return list.filter(x => x.code.toUpperCase().startsWith(q) || x.description.toUpperCase().includes(q)).slice(0, 8)
  }, [code, list, p])

  const d: RotuloData = { code: p?.code || code.trim(), description, fv, qty }
  const print = () => {
    if (!d.code) return toast('Ingrese el estilo.')
    if (!description.trim()) return toast('El estilo no está en la base. Escriba la descripción.')
    if (!fv) return toast('Ingrese la fecha de vencimiento.')
    if (!qty.trim()) return toast('Ingrese la cantidad.')
    try { localStorage.setItem(PAPER_KEY, paper) } catch { /* sin almacenamiento */ }
    printRotulo()
  }
  const P = PAPER[paper], scale = 520 / (P.w * 3.7795)

  return (
    <div className="backdrop open" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal rotulo-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div><h2>Crear rótulo</h2><p>La descripción se completa sola desde la base de productos.</p></div>
          <button type="button" className="close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="modal-body rt-body">
          <div className="rt-form">
            <div className="field rt-code">
              <label htmlFor="rtCode">Estilo (N°)</label>
              <input id="rtCode" autoFocus autoComplete="off" placeholder="Ej. 134160 o parte de la descripción" value={code}
                onChange={e => { setCode(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)}
                onKeyDown={e => { if (e.key === 'Enter' && sug[0]) { setCode(sug[0].code); setOpen(false) } }} />
              {open && sug.length > 0 && (
                <div className="rt-sug">{sug.map(s => (
                  <button key={s.code} type="button" onMouseDown={() => { setCode(s.code); setOpen(false) }}>
                    <b>{s.code}</b><span>{s.description}</span></button>))}</div>)}
            </div>
            <div className={'rt-found' + (p ? ' ok' : code.trim() ? ' no' : '')}>
              {p ? <><Icon name="checkCircle" size={16} /><span>{p.description}</span></>
                : code.trim() ? <><Icon name="alert" size={16} /><span>No está en la base de productos.</span></>
                : <><Icon name="search" size={16} /><span>Escriba el estilo para traer la descripción.</span></>}
            </div>
            {!p && code.trim() && (
              <div className="field"><label htmlFor="rtDesc">Descripción (manual)</label>
                <input id="rtDesc" value={manual} onChange={e => setManual(e.target.value.toUpperCase())} placeholder="Solo si el estilo no está en la base" /></div>)}
            <div className="formgrid" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div className="field"><label htmlFor="rtFv">Fecha de vencimiento (FV)</label><input id="rtFv" type="date" value={fv} onChange={e => setFv(e.target.value)} /></div>
              <div className="field"><label htmlFor="rtQty">Cantidad</label><input id="rtQty" type="number" min={0} inputMode="numeric" value={qty} onChange={e => setQty(e.target.value)} /></div>
            </div>
            <div className="field"><label>Papel (horizontal)</label>
              <div className="seg">{(['A4', 'letter'] as Paper[]).map(k =>
                <button key={k} type="button" className={paper === k ? 'on' : ''} onClick={() => setPaper(k)}>{PAPER[k].label}</button>)}</div></div>
            <p className="note" style={{ margin: 0 }}>En el cuadro de impresión elija la impresora y deje la escala en <b>100%</b> (o "Tamaño real").</p>
          </div>
          <div className="rt-preview">
            <div className="rt-preview-l">Vista previa · hoja completa horizontal</div>
            <div className="rt-preview-box" style={{ width: P.w * 3.7795 * scale, height: P.h * 3.7795 * scale }}>
              <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}><RotuloSheet d={d} paper={paper} /></div>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn light" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn primary" onClick={print}><Icon name="printer" size={15} />Imprimir rótulo</button>
        </div>
      </div>
      <RotuloPrintPortal d={d} paper={paper} />
    </div>
  )
}

/* ---------- Formulario: agregar / editar producto ---------- */
function ProductForm({ p, list, onSave, onClose }: { p?: Product; list: Product[]; onSave: (x: Product) => Promise<void>; onClose: () => void }) {
  const { toast } = useUI()
  const [code, setCode] = useState(p?.code || ''), [desc, setDesc] = useState(p?.description || '')
  return (
    <Modal title={p ? 'Editar producto' : 'Agregar producto'} onClose={onClose} buttons={[
      { label: 'Cancelar' },
      { label: 'Guardar', cls: 'primary', onClick: async () => {
        const c = code.trim(), ds = desc.trim().replace(/\s+/g, ' ')
        if (!c || !ds) { toast('Complete estilo y descripción.'); return false }
        if (!p && list.some(x => x.code === c)) { toast('Ese estilo ya existe.'); return false }
        await onSave({ code: c, description: ds })
      } }]}>
      <div className="form-body" style={{ padding: 0 }}>
        <div className="field"><label htmlFor="pCode">Estilo (N°)</label><input id="pCode" value={code} disabled={!!p} onChange={e => setCode(e.target.value)} /></div>
        <div className="field"><label htmlFor="pDesc">Descripción</label><input id="pDesc" value={desc} onChange={e => setDesc(e.target.value.toUpperCase())} /></div>
      </div>
    </Modal>
  )
}

/* ---------- Vista ---------- */
export function RotulosView() {
  const { toast, confirm } = useUI()
  const { readOnly } = useAuth()
  const [list, setList] = useState<Product[]>([])
  const [store, setStore] = useState<ProductStore>('cloud')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState(''), [brand, setBrand] = useState(''), [sort, setSort] = useState<'code' | 'desc'>('code')
  const [page, setPage] = useState(1)
  const [rotulo, setRotulo] = useState<{ pre?: string } | null>(null)
  const [edit, setEdit] = useState<{ p?: Product } | null>(null)
  const [pending, setPending] = useState(0)
  const file = useRef<HTMLInputElement>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try { const r = await loadProducts(); setList(r.list); setStore(r.store); setError(''); setPending(r.store === 'cloud' ? localCount() : 0) }
    catch (e: any) { setError(e.message) }
    setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const run = async (op: () => Promise<unknown>, msg: string) => {
    try { await op(); toast(msg) } catch (e: any) { toast('No se pudo guardar: ' + e.message) }
    reload()
  }

  const brands = useMemo(() => {
    const m = new Map<string, number>()
    list.forEach(p => { const b = brandOf(p); m.set(b, (m.get(b) || 0) + 1) })
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [list])

  const shown = useMemo(() => {
    const words = q.trim().toUpperCase().split(/\s+/).filter(Boolean)
    return list
      .filter(p => (!brand || brandOf(p) === brand) && words.every(w => p.code.toUpperCase().includes(w) || p.description.toUpperCase().includes(w)))
      .sort((a, b) => sort === 'code' ? a.code.localeCompare(b.code, undefined, { numeric: true }) : a.description.localeCompare(b.description))
  }, [list, q, brand, sort])
  const pages = Math.max(1, Math.ceil(shown.length / PER_PAGE))
  useEffect(() => { setPage(1) }, [q, brand, sort])
  const rows = shown.slice((page - 1) * PER_PAGE, page * PER_PAGE)
  const cols = readOnly ? 3 : 4

  const onImport = async (f?: File) => {
    if (!f) return
    try {
      const items = await parseProductsFile(f)
      if (!items.length) return toast('No se encontraron productos. El archivo debe tener columnas N° (o Código/Estilo) y Descripción.')
      const known = new Set(list.map(p => p.code)), nuevos = items.filter(p => !known.has(p.code)).length
      if (!(await confirm(`Se encontraron ${items.length} productos en "${f.name}": ${nuevos} nuevos y ${items.length - nuevos} que se actualizarán. ¿Importar?`, 'Importar'))) return
      await run(() => upsertProducts(items), `${items.length} productos importados.`)
    } catch (e: any) { toast('No se pudo leer el archivo: ' + e.message) }
    finally { if (file.current) file.current.value = '' }
  }
  const onClear = async () => {
    if (await confirm(`¿Borrar los ${list.length} productos de la base? Puede volver a importarlos desde Excel.`, 'Borrar base')) run(clearProducts, 'Base de productos vaciada.')
  }
  const onDelete = async (p: Product) => {
    if (await confirm(`¿Eliminar ${p.code} · ${p.description}?`, 'Eliminar')) run(() => deleteProduct(p.code), 'Producto eliminado.')
  }

  return (
    <>
      <div className="view-head"><span className="vh-ico"><Icon name="tag" size={24} /></span>
        <div><h1>Rótulos</h1><p>Base de productos e impresión de rótulos de recepción a hoja completa.</p></div>
        {!readOnly && <div className="view-actions no-print">
          <button className="btn primary" onClick={() => setRotulo({})} disabled={loading}><Icon name="printer" size={15} />Crear rótulo</button>
        </div>}
      </div>

      {store === 'local' && !loading && !readOnly && (
        <div className="banner warn"><span><b>Los productos se están guardando solo en este navegador.</b> Para tenerlos en todos los equipos, ejecute el archivo <code>supabase/productos.sql</code> en Supabase (SQL Editor) y recargue la página.</span></div>)}
      {pending > 0 && store === 'cloud' && !readOnly && (
        <div className="banner"><span>Hay <b>{pending}</b> productos guardados en este navegador de antes. ¿Subirlos a Supabase?</span>
          <button className="btn navy sm" onClick={() => run(pushLocalToCloud, 'Productos subidos a Supabase.')}>Subir a Supabase</button></div>)}
      {error && <div className="banner warn"><span><b>No se pudo leer la base de productos:</b> {error}</span><button className="btn ghost sm" onClick={reload}>Reintentar</button></div>}

      <div className="insights" style={{ marginBottom: 14 }}>
        <div className="insight-card"><div className="l">Productos en la base</div><div className="v">{list.length.toLocaleString('es-PE')}</div><div className="s">{store === 'cloud' ? 'Guardados en Supabase' : 'Guardados en este navegador'}</div></div>
        <div className="insight-card"><div className="l">Marcas</div><div className="v">{brands.length}</div><div className="s">primera palabra de la descripción</div></div>
        <div className="insight-card"><div className="l">Resultado del filtro</div><div className="v" style={{ color: 'var(--accent)' }}>{shown.length.toLocaleString('es-PE')}</div><div className="s">{q || brand ? 'coinciden con la búsqueda' : 'sin filtros aplicados'}</div></div>
      </div>

      <div className="toolbar">
        <label className="search grow"><Icon name="search" size={15} /><input placeholder="Buscar por estilo o descripción…" value={q} onChange={e => setQ(e.target.value)} /></label>
        <select value={brand} onChange={e => setBrand(e.target.value)} aria-label="Marca">
          <option value="">Todas las marcas</option>
          {brands.map(([b, n]) => <option key={b} value={b}>{b} ({n})</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value as 'code' | 'desc')} aria-label="Ordenar">
          <option value="code">Ordenar por estilo</option><option value="desc">Ordenar por descripción</option>
        </select>
        {(q || brand) && <button className="btn ghost sm" onClick={() => { setQ(''); setBrand('') }}><Icon name="x" size={13} />Quitar filtros</button>}
      </div>

      <div className="card">
        <div className="card-h"><h3><Icon name="database" size={16} />Base de productos</h3>
          {!readOnly && <div className="view-actions">
            <input ref={file} type="file" accept=".xlsx,.xls,.csv" hidden onChange={e => onImport(e.target.files?.[0])} />
            <button className="btn green sm" onClick={() => file.current?.click()}><Icon name="upload" size={14} />Importar Excel</button>
            <button className="btn ghost sm" disabled={!list.length} onClick={() => notifyExport(exportProducts(shown), toast)}><Icon name="download" size={14} />Exportar Excel</button>
            <button className="btn ghost sm" onClick={() => setEdit({})}><Icon name="plus" size={14} />Agregar</button>
            <button className="btn danger-ghost sm" disabled={!list.length} onClick={onClear}><Icon name="trash" size={14} />Vaciar base</button>
          </div>}</div>
        <div className="tblwrap"><table className="t">
          <thead><tr><th style={{ width: 130 }}>N° / Estilo</th><th>Descripción</th><th style={{ width: 140 }}>Marca</th>{!readOnly && <th className="c" style={{ width: 200 }}>Acciones</th>}</tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={cols} className="empty">Cargando base de productos…</td></tr>
              : rows.length ? rows.map(p => (
                <tr key={p.code}>
                  <td><b className="mono">{p.code}</b></td><td className="prov">{p.description}</td>
                  <td><span className="pill b">{brandOf(p)}</span></td>
                  {!readOnly && <td className="c"><div className="row-actions">
                    <button className="btn primary sm" onClick={() => setRotulo({ pre: p.code })}><Icon name="printer" size={13} />Rótulo</button>
                    <button className="btn ghost sm" title="Editar" aria-label="Editar" onClick={() => setEdit({ p })}><Icon name="edit" size={13} /></button>
                    <button className="btn danger-ghost sm" title="Eliminar" aria-label="Eliminar" onClick={() => onDelete(p)}><Icon name="trash" size={13} /></button>
                  </div></td>}
                </tr>))
              : <tr><td colSpan={cols} className="empty">{list.length ? 'Ningún producto coincide con la búsqueda.'
                : readOnly ? 'La base de productos está vacía.'
                : <>La base está vacía. <br /><button className="btn green" onClick={() => file.current?.click()}><Icon name="upload" size={15} />Importar Excel de productos</button></>}</td></tr>}
          </tbody>
        </table></div>
        {pages > 1 && (
          <div className="pager">
            <span>{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, shown.length)} de {shown.length.toLocaleString('es-PE')}</span>
            <button className="btn ghost sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><Icon name="left" size={14} /></button>
            <span>Página {page} de {pages}</span>
            <button className="btn ghost sm" disabled={page === pages} onClick={() => setPage(p => p + 1)}><Icon name="right" size={14} /></button>
          </div>)}
      </div>
      <p className="note" style={{ marginTop: 10 }}>El Excel debe tener una columna <b>N°</b> (o Código / Estilo) y otra <b>Descripción</b>; la fila de títulos puede estar en cualquier parte de la hoja. Si un estilo ya existe, se actualiza su descripción.</p>

      {rotulo && <RotuloForm list={list} pre={rotulo.pre} onClose={() => setRotulo(null)} />}
      {edit && <ProductForm p={edit.p} list={list} onClose={() => setEdit(null)}
        onSave={x => run(() => upsertProducts([x]), edit.p ? 'Producto actualizado.' : 'Producto agregado.')} />}
    </>
  )
}
