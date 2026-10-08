import { ReactNode } from 'react'
import type { delta } from '../logic/indicators'
import { Icon } from './Icon'

export function DeltaTag({ d, unit = ' pp' }: { d: ReturnType<typeof delta>; unit?: string }) {
  if (d.kind === 'none') return <span className="trend flat">sin comparativo</span>
  if (d.kind === 'same') return <span className="trend flat">= igual que sem. ant.</span>
  return <span className={'trend ' + (d.good ? 'up' : 'down')}>{d.up ? '▲' : '▼'} {d.abs}{unit} vs sem. ant.</span>
}

/** Tarjeta KPI. `c` es el tono: g (bien), o (alerta), r (crítico), n (neutro), purple. `ico` es un nombre de <Icon>. */
export function Kpi({ c, ico, lbl, val, sub, extra }: { c: string; ico: string; lbl: string; val: ReactNode; sub: ReactNode; extra?: ReactNode }) {
  return (
    <div className={'exec-kpi ' + c}>
      <div className="kpi-top"><span className="lbl">{lbl}</span><span className="ico"><Icon name={ico} size={16} /></span></div>
      <div className="val">{val}</div><div className="sub">{sub}</div>{extra}
    </div>
  )
}
