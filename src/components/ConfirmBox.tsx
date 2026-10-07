import { useUI } from '../context/UIContext'
import { Modal } from './Modal'

export function ConfirmBox() {
  const { confirmState, resolveConfirm } = useUI()
  if (!confirmState) return null
  return (
    <Modal title="Confirmar" onClose={() => resolveConfirm(false)} buttons={[
      { label: 'Cancelar', cls: 'light', onClick: () => resolveConfirm(false) },
      { label: confirmState.okLabel, cls: 'danger', onClick: () => resolveConfirm(true) }]}>
      <p style={{ margin: '4px 0', fontSize: 14 }}>{confirmState.msg}</p>
    </Modal>
  )
}
