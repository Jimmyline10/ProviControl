import { CSSProperties, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

export type Paper = 'A4' | 'letter'
export interface RotuloData { code: string; description: string; fv: string; qty: string }

/** Medidas de la hoja horizontal en mm (un poco menos de alto para que no salga una hoja en blanco). */
export const PAPER: Record<Paper, { w: number; h: number; label: string }> = {
  A4: { w: 297, h: 209, label: 'A4' },
  letter: { w: 279, h: 215, label: 'Carta' },
}

/** Texto que crece hasta el máximo que cabe en su casilla (búsqueda binaria del tamaño de letra). */
function Fit({ text, max, wrap }: { text: string; max: number; wrap?: boolean }) {
  const box = useRef<HTMLDivElement>(null), span = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const b = box.current, s = span.current
    if (!b || !s) return
    const fit = () => {
      let lo = 8, hi = max
      while (hi - lo > 1) {
        const mid = (lo + hi) / 2
        s.style.fontSize = mid + 'px'
        if (s.scrollWidth <= b.clientWidth && s.offsetHeight <= b.clientHeight) lo = mid; else hi = mid
      }
      s.style.fontSize = lo + 'px'
    }
    fit()
    document.fonts?.ready.then(fit)
  }, [text, max, wrap])
  return (
    <div ref={box} className="rt-fit">
      <span ref={span} style={{ whiteSpace: wrap ? 'normal' : 'nowrap' } as CSSProperties}>{text || ' '}</span>
    </div>
  )
}

/** dd/mm/aaaa a partir de aaaa-mm-dd */
export const fmtFV = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso
}

/** La hoja del rótulo, en tamaño real (mm). Igual que el formato de Excel: ESTILO, descripción, FV y CANT. */
export function RotuloSheet({ d, paper }: { d: RotuloData; paper: Paper }) {
  const P = PAPER[paper]
  return (
    <div className="rotulo-sheet" style={{ width: P.w + 'mm', height: P.h + 'mm' }}>
      <div className="rt-grid">
        <div className="rt-lbl"><Fit text="ESTILO" max={70} /></div>
        <div className="rt-val"><Fit text={d.code} max={230} /></div>
        <div className="rt-desc"><Fit text={d.description} max={230} wrap /></div>
        <div className="rt-lbl"><Fit text="FV:" max={90} /></div>
        <div className="rt-val"><Fit text={fmtFV(d.fv)} max={230} /></div>
        <div className="rt-lbl"><Fit text="CANT." max={90} /></div>
        <div className="rt-val rt-qty"><Fit text={d.qty} max={260} /></div>
      </div>
    </div>
  )
}

/** Copia oculta de la hoja que solo aparece al imprimir, con la página en horizontal. */
export function RotuloPrintPortal({ d, paper }: { d: RotuloData; paper: Paper }) {
  const P = PAPER[paper]
  return createPortal(
    <div className="rotulo-print">
      <style>{`@page rotulo { size: ${P.w}mm ${P.h + 1}mm; margin: 0 }`}</style>
      <RotuloSheet d={d} paper={paper} />
    </div>, document.body)
}

/** Imprime solo el rótulo: oculta la app mientras dura el diálogo de impresión. */
export function printRotulo() {
  document.body.classList.add('print-rotulo')
  const done = () => { document.body.classList.remove('print-rotulo'); window.removeEventListener('afterprint', done) }
  window.addEventListener('afterprint', done)
  window.print()
  setTimeout(done, 1000)
}
