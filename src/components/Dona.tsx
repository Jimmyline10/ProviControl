import { ST_COLOR } from '../constants'
import type { Indicators } from '../logic/indicators'

export function Dona({ r }: { r: Indicators }) {
  const parts: [string, number, string][] = [
    ['A tiempo', r.ontime, ST_COLOR.ontime], ['Tarde', r.late, ST_COLOR.late],
    ['No llegó', r.absent, ST_COLOR.absent], ['Programada', r.pending, ST_COLOR.pending]]
  const total = r.programadas, circ = 2 * Math.PI * 15.9155
  let off = 0
  return (
    <>
      <div className="dona-wrap">
        <svg viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="5" />
          {parts.map(([n, v, col]) => {
            if (!v || !total) return null
            const len = (v / total) * circ, o = off; off += len
            return <circle key={n} cx="21" cy="21" r="15.9155" fill="none" stroke={col} strokeWidth="5"
              strokeDasharray={`${len} ${circ - len}`} strokeDashoffset={-o}><title>{n}: {v}</title></circle>
          })}
        </svg>
        <div className="center"><div className="big">{total}</div><div className="lbl">Citas</div></div>
      </div>
      <div className="dona-legend">
        {parts.map(([n, v, col]) => (
          <div key={n} className="item"><span className="dot" style={{ background: col }} /><span>{n}</span>
            <span className="n">{v} <small>({total ? Math.round((v / total) * 100) : 0}%)</small></span></div>
        ))}
      </div>
    </>
  )
}
