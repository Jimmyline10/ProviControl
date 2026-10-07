import { useApp } from '../context/AppContext'
import type { Scope } from '../logic/indicators'

const OPTS: [Scope, string][] = [['week', 'Semana'], ['4w', '4 semanas'], ['all', 'Todo']]
export function ScopeSeg() {
  const { scope, setScope } = useApp()
  return (
    <div className="seg" role="group">
      {OPTS.map(([k, l]) => <button key={k} className={scope === k ? 'on' : ''} onClick={() => setScope(k)}>{l}</button>)}
    </div>
  )
}
