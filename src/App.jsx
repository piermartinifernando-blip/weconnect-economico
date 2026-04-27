import { useState, useEffect } from 'react'
import { getSession, onAuthChange } from './lib/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Ingresos from './pages/Ingresos'
import Clientes from './pages/Clientes'
import Mora from './pages/Mora'
import Egresos from './pages/Egresos'
import PnL from './pages/PnL'
import { CargaManual, Catalogos, Auditoria } from './pages/Placeholders'

const PAGES = {
  dashboard: Dashboard,
  ingresos: Ingresos,
  clientes: Clientes,
  mora: Mora,
  egresos: Egresos,
  pnl: PnL,
  carga: CargaManual,
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
