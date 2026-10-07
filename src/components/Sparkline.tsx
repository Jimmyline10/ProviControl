interface Props { vals: (number | null)[]; color: string; fmt: (v: number) => string; labels?: string[] }

export function Sparkline({ vals, color, fmt, labels }: Props) {
  const W = 300, H = 90, pl = 8, pr = 8, pt = 14, pb = 8
  const max = Math.max(1, ...vals.filter((v): v is number => v != null))
  const x = (i: number) => pl + (vals.length === 1 ? 0 : (i * (W - pl - pr)) / (vals.length - 1))
  const y = (v: number) => pt + (H - pt - pb) * (1 - v / (max || 1))
  const pts = vals.flatMap((v, i) => (v != null ? [{ x: x(i), y: y(v), v, i }] : []))
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ')
  const last = pts[pts.length - 1]
  const area = pts.length ? `${line} L${last.x.toFixed(1)} ${H - pb} L${pts[0].x.toFixed(1)} ${H - pb} Z` : ''
  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Tendencia">
      <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke="#d6dce4" />
      {area && <path d={area} fill={color} opacity=".12" />}
      {line && <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinejoin="round" />}
      {pts.map(p => (
        <circle key={p.i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill="#fff" stroke={color} strokeWidth="2">
          <title>{labels ? labels[p.i] + ': ' : ''}{fmt(p.v)}</title></circle>))}
      {last && <text x={Math.min(W - pr, last.x)} y={Math.max(11, last.y - 7)} textAnchor="end" fontSize="11" fontWeight="800" fill={color}>{fmt(last.v)}</text>}
    </svg>
  )
}
