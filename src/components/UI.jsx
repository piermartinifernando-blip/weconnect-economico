import { COLORS as C } from '../lib/constants'
import { ResponsiveContainer } from 'recharts'

// ============================================================
// KPI CARD
// ============================================================
export function KpiCard({ title, value, sub, icon, color, delta }) {
  return (
    <div style={{
      background: `linear-gradient(135deg,${C.sf},${C.sf2})`,
      border: `1px solid ${C.brd}`,
      borderRadius: 16,
      padding: '20px 22px',
      flex: '1 1 180px',
      minWidth: 170,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 600 }}>{title}</span>
        {icon && <span style={{ fontSize: 18, opacity: 0.8 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || C.tx, fontFamily: "'JetBrains Mono',monospace", letterSpacing: -1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: C.tx2, marginTop: 4 }}>{sub}</div>}
      {delta != null && (
        <div style={{ fontSize: 11, fontWeight: 700, color: parseFloat(delta) >= 0 ? C.grn : C.red, marginTop: 6 }}>
          {parseFloat(delta) >= 0 ? '▲' : '▼'} {Math.abs(parseFloat(delta))}%
        </div>
      )}
    </div>
  )
}

// ============================================================
// CHART CARD
// ============================================================
export function ChartCard({ title, height = 300, children, full }) {
  return (
    <div style={{
      background: `linear-gradient(135deg,${C.sf},${C.sf2})`,
      border: `1px solid ${C.brd}`,
      borderRadius: 16,
      padding: '22px 24px',
      gridColumn: full ? '1/-1' : undefined,
    }}>
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        {children}
      </ResponsiveContainer>
    </div>
  )
}

// ============================================================
// CLICKABLE CARD
// ============================================================
export function ActionCard({ title, children, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg,${C.sf},${C.sf2})`,
        border: `1px solid ${C.brd}`,
        borderRadius: 16,
        padding: '22px 24px',
        cursor: onClick ? 'pointer' : undefined,
        transition: 'border-color .2s',
      }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = C.acc }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = C.brd }}
    >
      {title && (
        <div style={{ fontSize: 13, fontWeight: 700, color: C.acc, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 0.8 }}>
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ============================================================
// DATA TABLE
// ============================================================
export function DataTable({ columns, data, onRowClick, maxHeight = 400 }) {
  if (!data || data.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', color: C.tx2, fontSize: 13 }}>Sin datos</div>
  }
  return (
    <div style={{ maxHeight, overflowY: 'auto', borderRadius: 12, border: `1px solid ${C.brd}` }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{
                padding: '10px 14px',
                textAlign: col.align || 'left',
                background: C.sf2,
                color: C.tx2,
                fontWeight: 600,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                position: 'sticky',
                top: 0,
                borderBottom: `1px solid ${C.brd}`,
              }}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, ri) => (
            <tr
              key={ri}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : undefined }}
              onMouseEnter={e => e.currentTarget.style.background = C.sf2}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {columns.map((col, ci) => (
                <td key={ci} style={{
                  padding: '8px 14px',
                  textAlign: col.align || 'left',
                  borderBottom: `1px solid ${C.brd}`,
                  color: col.color?.(row) || C.tx,
                  fontFamily: col.mono ? "'JetBrains Mono',monospace" : undefined,
                  fontWeight: col.bold ? 600 : 400,
                }}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ============================================================
// PROGRESS BAR
// ============================================================
export function ProgressBar({ value, max, color = C.pri, height = 6 }) {
  const pct = max > 0 ? (value / max * 100) : 0
  return (
    <div style={{ height, background: C.bg, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: height / 2, transition: 'width .3s' }} />
    </div>
  )
}

// ============================================================
// LOADING STATE
// ============================================================
export function LoadingState({ message = 'Cargando datos...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', color: C.tx2 }}>
      <div style={{
        width: 40, height: 40, border: `3px solid ${C.brd}`, borderTopColor: C.acc,
        borderRadius: '50%', animation: 'spin 1s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ marginTop: 16, fontSize: 14 }}>{message}</div>
    </div>
  )
}

// ============================================================
// ERROR STATE
// ============================================================
export function ErrorState({ message, onRetry }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', color: C.tx2,
    }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.tx, marginBottom: 8 }}>Error al cargar datos</div>
      <div style={{ fontSize: 13, marginBottom: 20, maxWidth: 400, textAlign: 'center' }}>{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: '10px 24px', background: C.pri, color: '#fff', border: 'none',
            borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

// ============================================================
// BREADCRUMB
// ============================================================
export function Breadcrumb({ items }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <span style={{ color: C.tx2 }}>›</span>}
          <span
            onClick={item.action}
            style={{
              color: i === items.length - 1 ? C.acc : C.tx2,
              cursor: item.action ? 'pointer' : 'default',
              fontWeight: i === items.length - 1 ? 700 : 400,
            }}
          >
            {item.label}
          </span>
        </span>
      ))}
    </div>
  )
}

// ============================================================
// ALERT BANNER
// ============================================================
export function AlertBanner({ type = 'warning', children }) {
  const colors = {
    warning: { bg: `${C.amb}15`, border: `${C.amb}33`, text: C.amb },
    danger: { bg: `${C.red}15`, border: `${C.red}33`, text: C.red },
    success: { bg: `${C.grn}15`, border: `${C.grn}33`, text: C.grn },
    info: { bg: `${C.pri}15`, border: `${C.pri}33`, text: C.acc },
  }
  const c = colors[type]
  return (
    <div style={{ padding: '14px 18px', background: c.bg, borderRadius: 12, border: `1px solid ${c.border}`, fontSize: 12, color: c.text, marginBottom: 24 }}>
      {children}
    </div>
  )
}

// ============================================================
// CUSTOM TOOLTIP (Recharts)
// ============================================================
export function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  const displayLabel = typeof label === 'string' && label.includes('-')
    ? (() => { const [y, mo] = label.split('-'); const ms = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']; return `${ms[parseInt(mo)]} ${y.slice(2)}` })()
    : label

  return (
    <div style={{
      background: C.sf2, border: `1px solid ${C.brd}`, borderRadius: 12,
      padding: '12px 16px', fontSize: 12, boxShadow: '0 8px 32px rgba(0,0,0,.6)', maxWidth: 300,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: C.tx }}>{displayLabel}</div>
      {payload.filter(p => p.value != null && p.value !== 0).map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: 3, display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>
            {formatter ? formatter(p.value) : `$${Math.round(p.value).toLocaleString('es-AR')}`}
          </span>
        </div>
      ))}
    </div>
  )
}
