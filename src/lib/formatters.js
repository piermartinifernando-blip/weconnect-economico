export const fmt = (n) => {
  if (n == null) return '$0'
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1)}B`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`
  if (abs >= 1e3) return `$${(n / 1e3).toFixed(0)}K`
  return `$${Math.round(n)}`
}

export const fmtN = (n) => `$${Math.round(n || 0).toLocaleString('es-AR')}`

export const fmtPct = (n) => `${(n || 0).toFixed(1)}%`

export const fmtNum = (n) => (n || 0).toLocaleString('es-AR')

export const ml = (m) => {
  if (!m || !m.includes('-')) return m || ''
  const [y, mo] = m.split('-')
  const ms = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${ms[parseInt(mo)]} ${y.slice(2)}`
}

export const delta = (curr, prev) => {
  if (!prev || prev === 0) return null
  return ((curr - prev) / prev * 100).toFixed(1)
}
