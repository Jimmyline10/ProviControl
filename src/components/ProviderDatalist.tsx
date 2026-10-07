import { useApp } from '../context/AppContext'
import { knownProviders } from '../logic/indicators'
export const ProviderDatalist = () => {
  const { data } = useApp()
  return <datalist id="provList">{knownProviders(data).map(p => <option key={p} value={p} />)}</datalist>
}
