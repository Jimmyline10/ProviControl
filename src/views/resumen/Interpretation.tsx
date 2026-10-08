import { Fragment } from 'react'
import { Icon } from '../../components/Icon'
import type { Report } from '../../logic/interpretation'
import { fmtShort } from '../../utils/date'
import { fmtP } from '../../utils/format'

/** Resalta los fragmentos marcados con **…** */
const Rich = ({ t }: { t: string }) => <>{t.split('**').map((x, i) => (i % 2 ? <b key={i}>{x}</b> : <Fragment key={i}>{x}</Fragment>))}</>

const TONE_LBL = { g: 'Cumple', o: 'Observación', r: 'Crítico', n: 'Sin datos' } as const
const TONE_PILL = { g: 'g', o: 'o', r: 'r', n: 's' } as const
const STATE_LBL = { none: 'Sin datos', pending: 'Pendiente', prelim: 'Preliminar', ok: '' } as const

export function Interpretation({ rep }: { rep: Report }) {
  return (
    <div className="report">
      <div className={'report-verdict ' + rep.verdict.tone}>
        <div className="rv-label"><span className="status-dot" />{rep.verdict.label}</div>
        <p><Rich t={rep.verdict.text} /></p>
      </div>

      {!rep.empty && <>
        <h4 className="report-h">1. Indicadores clave</h4>
        <div className="tblwrap"><table className="t report-kpis">
          <thead><tr><th>Indicador</th><th className="r">Resultado</th><th className="r">IC 95%</th><th className="r">Meta</th><th className="c">Estado</th>
            <th className="r">Var. sem. ant.</th><th className="r">Histórico</th><th>Lectura</th></tr></thead>
          <tbody>{rep.kpis.map(k => (
            <tr key={k.name}><td className="prov">{k.name}</td><td className="r"><b>{k.value}</b></td><td className="r muted">{k.ci}</td>
              <td className="r muted">{k.meta}</td><td className="c"><span className={'pill ' + TONE_PILL[k.tone]}>{TONE_LBL[k.tone]}</span></td>
              <td className="r">{k.delta}</td><td className="r muted">{k.hist}</td><td className="reading">{k.reading}</td></tr>))}
          </tbody>
        </table></div>

        <h4 className="report-h">2. Análisis</h4>
        <div className="report-sections">
          {rep.sections.map(sec => (
            <div key={sec.title} className="report-sec"><h5>{sec.title}</h5>{sec.paras.map((t, i) => <p key={i}><Rich t={t} /></p>)}</div>))}
        </div>
      </>}

      <h4 className="report-h">{rep.empty ? 'Interpretación por día' : '3. Interpretación por día'}</h4>
      <div className="tblwrap"><table className="t report-days">
        <thead><tr><th>Día</th><th className="r">Citas</th><th className="r">Sin cita</th><th className="r">Recibidos</th>
          <th className="r">Cumplimiento</th><th className="r">Puntualidad</th><th className="r">Inasistencia</th><th>Interpretación</th></tr></thead>
        <tbody>{rep.days.map(d => (
          <tr key={d.date} className={d.state === 'none' ? 'is-empty' : ''}>
            <td className="prov nowrap">{d.label}<small>{fmtShort(d.date)}</small></td>
            <td className="r">{d.prog}</td><td className="r">{d.sc}</td><td className="r">{d.recib}</td>
            <td className="r">{d.cump == null ? '—' : <span className={'pill ' + TONE_PILL[d.tone]}>{d.cump}%</span>}</td>
            <td className="r">{fmtP(d.punt)}</td><td className="r">{fmtP(d.inas)}</td>
            <td className="reading">{STATE_LBL[d.state] && <span className="state-tag">{STATE_LBL[d.state]}</span>}<Rich t={d.text} /></td>
          </tr>))}
        </tbody>
      </table></div>
      <p className="report-note"><Rich t={rep.dayNote} /></p>

      {!rep.empty && <>
        <h4 className="report-h">4. Conclusiones y recomendaciones</h4>
        <ol className="report-recs">{rep.recs.map((t, i) => <li key={i}><Rich t={t} /></li>)}</ol>
      </>}

      <details className="report-method">
        <summary><Icon name="info" size={14} />Nota metodológica</summary>
        <ul>{rep.method.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </details>
    </div>
  )
}
