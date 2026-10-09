import { supabase } from './supabase'
import { writeXlsx } from './exportExcel'
import { todayISO } from '../utils/date'

/** Producto de la base de rótulos: el estilo (código) y su descripción. */
export interface Product { code: string; description: string }

/** 'cloud' = tabla productos en Supabase; 'local' = la tabla aún no existe y se guarda en este navegador. */
export type ProductStore = 'cloud' | 'local'

const LS_KEY = 'provicontrol_productos'
const PAGE = 1000

const readLocal = (): Product[] => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] } }
const writeLocal = (list: Product[]) => localStorage.setItem(LS_KEY, JSON.stringify(list))
export const localCount = () => readLocal().length

/** La tabla no existe todavía (no se ejecutó supabase/productos.sql). */
const missingTable = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' || /does not exist|schema cache/i.test(e.message)

let store: ProductStore = 'cloud'
export const currentStore = () => store

/** Lee toda la base. Supabase entrega de a 1000 filas, así que se pide por páginas. */
export async function loadProducts(): Promise<{ list: Product[]; store: ProductStore }> {
  const out: Product[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from('productos').select('code,description').order('code').range(from, from + PAGE - 1)
    if (error) {
      if (missingTable(error)) { store = 'local'; return { list: readLocal(), store } }
      throw new Error(error.message)
    }
    out.push(...(data as Product[]))
    if (!data || data.length < PAGE) break
  }
  store = 'cloud'
  return { list: out, store }
}

/** Agrega o actualiza productos por código. */
export async function upsertProducts(items: Product[]) {
  if (store === 'local') {
    const m = new Map(readLocal().map(p => [p.code, p]))
    items.forEach(p => m.set(p.code, p)); writeLocal([...m.values()]); return
  }
  for (let i = 0; i < items.length; i += 500) {
    const { error } = await supabase.from('productos').upsert(items.slice(i, i + 500).map(p => ({ ...p, updated_at: new Date().toISOString() })))
    if (error) throw new Error(error.message)
  }
}

export async function deleteProduct(code: string) {
  if (store === 'local') { writeLocal(readLocal().filter(p => p.code !== code)); return }
  const { error } = await supabase.from('productos').delete().eq('code', code)
  if (error) throw new Error(error.message)
}

export async function clearProducts() {
  if (store === 'local') { writeLocal([]); return }
  const { error } = await supabase.from('productos').delete().not('code', 'is', null)
  if (error) throw new Error(error.message)
}

/** Sube a Supabase lo que quedó guardado en el navegador antes de crear la tabla. */
export async function pushLocalToCloud() {
  const local = readLocal()
  if (local.length) await upsertProducts(local)
  localStorage.removeItem(LS_KEY)
  return local.length
}

/* ---------- Importar / exportar Excel ---------- */

const key = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')
const CODE_H = new Set(['n', 'no', 'nro', 'num', 'numero', 'codigo', 'cod', 'estilo', 'item', 'sku', 'articulo', 'code'])
const isDescH = (k: string) => k.startsWith('descrip') || k === 'producto' || k === 'nombre' || k === 'detalle'

/** Lee un Excel/CSV y devuelve los productos. Busca la fila de títulos (N°/Código/Estilo y Descripción) en cualquier columna. */
export async function parseProductsFile(file: File): Promise<Product[]> {
  const XLSX = await import('xlsx')
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' })
  const out = new Map<string, Product>()
  for (const name of wb.SheetNames) {
    // raw:false conserva el texto tal como se ve (p. ej. los ceros a la izquierda de 010247)
    const rows: string[][] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' })
    let head = -1, ci = -1, di = -1
    for (let r = 0; r < Math.min(rows.length, 30) && head < 0; r++) {
      const ks = rows[r].map(key)
      const c = ks.findIndex(k => CODE_H.has(k)), d = ks.findIndex(isDescH)
      if (c >= 0 && d >= 0) { head = r; ci = c; di = d }
    }
    if (head < 0) {
      // Sin títulos: se toman las dos primeras columnas con datos
      const first = rows.find(r => r.filter(v => String(v).trim()).length >= 2)
      if (!first) continue
      const filled = first.map((v, i) => (String(v).trim() ? i : -1)).filter(i => i >= 0)
      ci = filled[0]; di = filled[1]
    }
    for (const r of rows.slice(head + 1)) {
      const code = String(r[ci] ?? '').trim(), description = String(r[di] ?? '').trim().replace(/\s+/g, ' ')
      if (code && description && !CODE_H.has(key(code))) out.set(code, { code, description })
    }
  }
  return [...out.values()]
}

export const exportProducts = (list: Product[]) =>
  writeXlsx([{ name: 'Productos', cols: [14, 70], aoa: [['N°', 'Descripcion'], ...list.map(p => [p.code, p.description])] }], `Base_productos_${todayISO()}`)

/** Busca un producto por estilo. Acepta el código con o sin ceros a la izquierda. */
export function findProduct(list: Product[], code: string) {
  const c = code.trim()
  if (!c) return undefined
  const strip = (s: string) => s.replace(/^0+(?=.)/, '').toUpperCase()
  return list.find(p => p.code === c) ?? list.find(p => strip(p.code) === strip(c))
}

/** "Marca" = primera palabra de la descripción (VIRUTEX, REY, SAPOLIO…), para filtrar. */
export const brandOf = (p: Product) => p.description.split(/\s+/)[0]?.toUpperCase() || ''
