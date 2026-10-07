import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { Login } from './components/Login'
import { AppProvider } from './context/AppContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UIProvider } from './context/UIContext'
import './styles/styles.css'

/** Sin sesión solo se ve el login; los datos se cargan únicamente cuando hay sesión. */
function Gate() {
  const { session, loading } = useAuth()
  if (loading) return null
  if (!session) return <Login />
  return <UIProvider><AppProvider><App /></AppProvider></UIProvider>
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><AuthProvider><Gate /></AuthProvider></React.StrictMode>)
