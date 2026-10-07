import { ReactNode } from 'react'

export interface ModalButton { label: string; cls?: string; onClick?: () => boolean | void | Promise<boolean | void> }
interface Props { title: string; sub?: ReactNode; wide?: boolean; onClose: () => void; buttons?: ModalButton[]; children?: ReactNode }

export function Modal({ title, sub, wide, onClose, buttons, children }: Props) {
  return (
    <div className="backdrop open" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <div className="modal-head">
          <div><h2>{title}</h2>{sub ? <p>{sub}</p> : null}</div>
          <button type="button" className="close" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {buttons?.length ? (
          <div className="modal-foot">
            {buttons.map(b => (
              <button key={b.label} type="button" className={'btn ' + (b.cls || 'light')}
                onClick={async () => { const r = await b.onClick?.(); if (r !== false) onClose() }}>{b.label}</button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
