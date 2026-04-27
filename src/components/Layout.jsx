import { useState, useEffect } from 'react'
import { COLORS as C, NAV_ITEMS } from '../lib/constants'
import { signOut } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function Layout({ currentPage, onNavigate, children }) {
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) setUserEmail(data.user.email)
    })
  }, [])

  const handleLogout = async () => {
    await signOut()
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg, color: C.tx, fontFamily: "'Inter',system-ui,sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, background: C.sf, borderRight: `1px solid ${C.brd}`,
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px', borderBottom: `1px solid ${C.brd}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ background: 'linear-gradient(135deg,#9333ea,#d946ef,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WeConnect
            </span>
          </div>
          <div style={{ fontSize: 10, color: C.tx2, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 }}>
            Control 360
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => {
            const active = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 12px', marginBottom: 2, border: 'none', borderRadius: 10,
                  background: active ? `${C.pri}22` : 'transparent',
                  color: active ? C.acc : C.tx2,
                  fontSize: 13, fontWeight: active ? 600 : 400,
                  cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${C.brd}44` }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* Footer sidebar */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.brd}` }}>
          {userEmail && (
            <div style={{ fontSize: 11, color: C.acc, marginBottom: 8, padding: '6px 8px', background: `${C.pri}15`, borderRadius: 6, textAlign: 'center', wordBreak: 'break-all' }}>
              {userEmail}
            </div>
          )}
          <button
            onClick={handleLogout}
            style={{
              width: '100%', padding: '8px 12px', background: 'transparent',
              border: `1px solid ${C.brd}`, borderRadius: 8, color: C.tx2,
              fontSize: 12, cursor: 'pointer',
            }}
          >
            Cerrar sesión
          </button>
          <div style={{ fontSize: 10, color: C.tx2, textAlign: 'center', marginTop: 8, opacity: 0.6 }}>
            Grupo Netsharing
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, marginLeft: 220 }}>
        {/* Top bar */}
        <header style={{
          padding: '14px 28px', borderBottom: `1px solid ${C.brd}`, background: C.sf,
          position: 'sticky', top: 0, zIndex: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            {NAV_ITEMS.find(n => n.id === currentPage)?.icon}{' '}
            {NAV_ITEMS.find(n => n.id === currentPage)?.label}
          </div>
          <div style={{
            fontSize: 11, color: C.tx2, fontFamily: "'JetBrains Mono',monospace",
            background: C.bg, padding: '6px 14px', borderRadius: 10, border: `1px solid ${C.brd}`,
          }}>
            Supabase dinámico
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: '28px', maxWidth: 1200 }}>
          {children}
        </div>
      </main>
    </div>
  )
}
