import { useState } from 'react'
import { signIn } from '../lib/auth'
import { COLORS as C } from '../lib/constants'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg, fontFamily: "'Inter',system-ui,sans-serif",
    }}>
      <div style={{
        background: C.sf, border: `1px solid ${C.brd}`, borderRadius: 20,
        padding: '48px 40px', width: '100%', maxWidth: 400,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>
            <span style={{ background: 'linear-gradient(135deg,#9333ea,#d946ef,#ec4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              WeConnect
            </span>
          </div>
          <div style={{ fontSize: 13, color: C.tx2 }}>Control 360 — Grupo Netsharing</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: C.tx2, marginBottom: 6, fontWeight: 500 }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', background: C.bg, border: `1px solid ${C.brd}`,
                borderRadius: 10, color: C.tx, fontSize: 14, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = C.acc}
              onBlur={e => e.target.style.borderColor = C.brd}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', fontSize: 12, color: C.tx2, marginBottom: 6, fontWeight: 500 }}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%', padding: '12px 14px', background: C.bg, border: `1px solid ${C.brd}`,
                borderRadius: 10, color: C.tx, fontSize: 14, outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = C.acc}
              onBlur={e => e.target.style.borderColor = C.brd}
            />
          </div>

          {error && (
            <div style={{
              padding: '10px 14px', background: `${C.red}15`, border: `1px solid ${C.red}33`,
              borderRadius: 8, color: C.red, fontSize: 12, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px', background: loading ? C.brd : C.pri,
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 14,
              fontWeight: 600, cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
