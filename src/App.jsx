import { useState, useEffect } from 'react'
import { getSession, onAuthChange } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ingresos from './pages/Ingresos'
import Clientes from './pages/Clientes'
import Churn from './pages/Churn'
import Mora from './pages/Mora'
import Egresos from './pages/Egresos'
import PnL from './pages/PnL'
import Clasificacion from './pages/Clasificacion'
import { Catalogos, Auditoria } from './pages/Placeholders'

const PAGES = {
  dashboard: Dashboard,
  ingresos: Ingresos,
  clientes: Clientes,
  churn: Churn,
  mora: Mora,
  egresos: Egresos,
  pnl: PnL,
  carga: Clasificacion,
  catalogos: Catalogos,
  auditoria: Auditoria,
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [page, setPage] = useState('dashboard')

  useEffect(() => {
    getSession().then(setSession)
    const { data: { subscription } } = onAuthChange(setSession)
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  const Page = PAGES[page] || Dashboard

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      <Page />
    </Layout>
  )
}
