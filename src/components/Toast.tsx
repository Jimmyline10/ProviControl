import { useUI } from '../context/UIContext'
export const Toast = () => {
  const { toastMsg, toastOn } = useUI()
  return <div className={'toast' + (toastOn ? ' show' : '')} role="status" aria-live="polite">{toastMsg}</div>
}
