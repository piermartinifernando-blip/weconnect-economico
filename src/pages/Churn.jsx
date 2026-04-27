import { useState, useEffect } from 'react'
import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip } from '../components/UI'
import { COLORS as C, PALETTE as PC } from '../lib/constants'
import { fmtNum, ml } from '../lib/formatters'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ComposedChart, Line, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

async function fetchChurnData() {
  const { data, error } = await supabase.from('clientes_ispcube').select('estado, fecha_alta, fecha_bloqueo')
  if (error) return { error: error.message }

  const rows = (data || []).filter(r => r.fecha_alta)

  // Monthly cohorts
  const monthly = {}
  rows.forEach(r => {
    const mes = r.fecha_alta?.substring(0, 7)
    if (!mes || mes < '2024-07') return
    if (!monthly[mes]) monthly[mes] = { mes, total: 0, churned: 0, activos: 0, bloqueados: 0 }
    monthly[mes].total++
    if (r.estado === 'Sin servicio') monthly[mes].churned++
    else if (r.estado === 'Habilitado') monthly[mes].activos++
    else if (r.estado === 'Bloqueado') monthly[mes].bloqueados++
  })
  const monthlyArr = Object.values(monthly).sort((a, b) => a.mes.localeCompare(b.mes))

  // Quarterly cohorts
  const quarterly = {}
  rows.forEach(r => {
    const d = new Date(r.fecha_alta)
    if (isNaN(d)) return
    const q = `${d.getFullYear()}-Q${Math.ceil((d.getMonth() + 1) / 3)}`
    if (q < '2024-Q2') return
    if (!quarterly[q]) quarterly[q] = { cohorte: q, total: 0, churned: 0, dias: [] }
    quarterly[q].total++
    if (r.estado === 'Sin servicio') {
      quarterly[q].churned++
      if (r.fecha_bloqueo) {
        const dias = Math.round((new Date(r.fecha_bloqueo) - d) / 86400000)
        if (dias > 0) quarterly[q].dias.push(dias)
      }
    }
  })
  const quarterlyArr = Object.values(quarterly).sort((a, b) => a.cohorte.localeCompare(b.cohorte)).map(q => ({
    ...q,
    churn_pct: q.total > 0 ? Math.round(q.churned / q.total * 1000) / 10 : 0,
    vida_media: q.dias.length > 0 ? Math.round(q.dias.reduce((a, b) => a + b, 0) / q.dias.length) : null,
  }))

  // Lifecycle distribution
  const tramos = { '0-1 mes': 0, '1-3 meses': 0, '3-6 meses': 0, '6-12 meses': 0, '+12 meses': 0 }
  rows.filter(r => r.estado === 'Sin servicio' && r.fecha_bloqueo).forEach(r => {
    const dias = Math.round((new Date(r.fecha_bloqueo) - new Date(r.fecha_alta)) / 86400000)
    if (dias <= 30) tramos['0-1 mes']++
    else if (dias <= 90) tramos['1-3 meses']++
    else if (dias <= 180) tramos['3-6 meses']++
    else if (dias <= 365) tramos['6-12 meses']++
    else tramos['+12 meses']++
  })
  const tramosArr = Object.entries(tramos).map(([tramo, cantidad]) => ({ tramo, cantidad }))
  const totalChurned = Object.values(tramos).reduce((a, b) => a + b, 0)

  // Global KPIs
  const totalClientes = rows.length
  const totalSS = rows.filter(r => r.estado === 'Sin servicio').length
  const churnAcum = totalClientes > 0 ? Math.round(totalSS / totalClientes * 1000) / 10 : 0
  const last12 = monthlyArr.slice(-12)
  const tasaProm = last12.length > 0 ? Math.round(last12.reduce((s, m) => s + (m.total > 0 ? m.churned / m.total * 100 : 0), 0) / last12.length * 10) / 10 : 0
  const churnAnual = Math.round((1 - Math.pow(1 - tasaProm / 100, 12)) * 1000) / 10

  // Vida media global
  const allDias = rows.filter(r => r.estado === 'Sin servicio' && r.fecha_bloqueo).map(r => {
    return Math.round((new Date(r.fecha_bloqueo) - new Date(r.fecha_alta)) / 86400000)
  }).filter(d => d > 0)
  const vidaMediaDias = allDias.length > 0 ? Math.round(allDias.reduce((a, b) => a + b, 0) / allDias.length) : 0
  const vidaMediaMeses = Math.round(vidaMediaDias / 30 * 10) / 10
  const vidaMedianaDias = allDias.sort((a, b) => a - b)[Math.floor(allDias.length / 2)] || 0
  const vidaMedianaMeses = Math.round(vidaMedianaDias / 30 * 10) / 10

  // Monthly churn rate
  const monthlyRate = monthlyArr.map(m => ({
    mes: m.mes,
    tasa: m.total > 0 ? Math.round(m.churned / m.total * 1000) / 10 : 0,
    churned: m.churned,
    total: m.total,
  }))

  // Early churn analysis
  const antes3 = tramos['0-1 mes'] + tramos['1-3 meses']
  const entre3y6 = tramos['3-6 meses']
  const mas12 = tramos['+12 meses']
  const pctAntes3 = totalChurned > 0 ? Math.round(antes3 / totalChurned * 1000) / 10 : 0
  const pctEntre3y6 = totalChurned > 0 ? Math.round(entre3y6 / totalChurned * 1000) / 10 : 0
  const pctMas12 = totalChurned > 0 ? Math.round(mas12 / totalChurned * 1000) / 10 : 0

  return {
    data: {
      kpis: { churnAcum, totalSS, totalClientes, tasaProm, churnAnual, vidaMediaMeses, vidaMedianaMeses },
      monthlyRate, quarterlyArr, tramosArr, totalChurned,
      earlyChurn: { antes3, entre3y6, mas12, pctAntes3, pctEntre3y6, pctMas12 },
    },
    error: null,
  }
}

function CohorteBar({ label, pct, count, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: C.tx }}>{label}</span>
        <span style={{ color: C.tx2 }}>{count} inact.</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 24, borderRadius: 6, background: C.bg, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', borderRadius: 6, background: color, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff' }}>
            {pct}%
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Churn() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchChurnData().then(res => {
      if (res.error) setError(res.error)
      else setData(res.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const { kpis, monthlyRate, quarterlyArr, tramosArr, totalChurned, earlyChurn } = data
  const pieColors = [C.red, C.amb, '#f97316', C.pri, C.grn]

  const cohorteColors = q => {
    const pct = q.churn_pct
    if (pct >= 35) return C.red
    if (pct >= 25) return '#f97316'
    if (pct >= 15) return C.amb
    return C.grn
  }

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Churn acumulado" value={`${kpis.churnAcum}%`} icon="📉" sub={`${fmtNum(kpis.totalSS)} de ${fmtNum(kpis.totalClientes)}`} />
        <KpiCard title="Tasa mensual prom." value={`${kpis.tasaProm}%`} icon="📊" sub={`~${Math.round(kpis.totalSS / Math.max(monthlyRate.length, 1))} clientes/mes`} />
        <KpiCard title="Churn anual implícito" value={`${kpis.churnAnual}%`} icon="🔴" sub="1 de cada 3 / año" />
        <KpiCard title="Vida media" value={`${kpis.vidaMediaMeses} meses`} icon="⏱️" sub={`mediana: ${kpis.vidaMedianaMeses} meses`} />
      </div>

      {/* TASA MENSUAL + COHORTES */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Tasa de churn mensual (%)" height={300}>
          <ComposedChart data={monthlyRate}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 10 }} unit="%" />
            <Tooltip content={<CustomTooltip formatter={v => `${v}%`} />} />
            <Line dataKey="tasa" name="Tasa churn" stroke={C.red} strokeWidth={2.5} dot={{ r: 4, fill: C.red }} />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Churn acumulado por cohorte" height="auto">
          <div style={{ padding: '8px 0' }}>
            {quarterlyArr.map((q, i) => (
              <CohorteBar key={i} label={`${q.cohorte} (${q.vida_media ? Math.round(q.vida_media / 30) + 'm' : '—'})`}
                pct={q.churn_pct} count={q.churned} color={cohorteColors(q)} />
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: 8, fontSize: 11, color: C.tx2 }}>
            Las cohortes maduras convergen al 33-40%: <strong style={{ color: C.red }}>churn estructural ~35% anual</strong>.
            Cohortes Q4 2025+ muestran mejora (13-17%).
          </div>
        </ChartCard>
      </div>

      {/* EARLY CHURN + DISTRIBUCIÓN */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.red}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Churnan antes del mes 3</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.red }}>{earlyChurn.pctAntes3}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>problema de onboarding</div>
        </div>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.amb}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Churnan entre mes 3-6</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.amb }}>{earlyChurn.pctEntre3y6}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>primera renovación</div>
        </div>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.grn}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Más de 12 meses activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.grn }}>{earlyChurn.pctMas12}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>los clientes "fieles"</div>
        </div>
      </div>

      {/* DISTRIBUCIÓN VIDA */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Distribución de permanencia al irse" height={280}>
          <BarChart data={tramosArr}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="tramo" tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cantidad" name="Clientes" radius={[6, 6, 0, 0]}>
              {tramosArr.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="¿Cuándo se van?" height={280}>
          <PieChart>
            <Pie data={tramosArr.filter(t => t.cantidad > 0).map(t => ({ name: t.tramo, value: t.cantidad }))}
              cx="50%" cy="50%" outerRadius={95} innerRadius={55} dataKey="value"
              label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              labelLine={{ stroke: C.tx2 }}>
              {tramosArr.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Pie>
            <Tooltip formatter={v => fmtNum(v)} />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  )
}
