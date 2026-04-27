import { useState, useEffect } from 'react'
import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip } from '../components/UI'
import { COLORS as C } from '../lib/constants'
import { fmtNum, ml } from '../lib/formatters'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Line, PieChart, Pie, Cell } from 'recharts'

async function fetchAll() {
  const [r1, r2, r3, r4, r5] = await Promise.all([
    supabase.from('vw_churn_mensual_real').select('*').order('mes'),
    supabase.from('vw_churn_tramos').select('*'),
    supabase.from('vw_churn_cohortes').select('*'),
    supabase.from('vw_churn_kpis').select('*'),
    supabase.from('vw_kpis_actuales').select('*'),
  ])
  return {
    mensual: r1.data || [],
    tramos: r2.data || [],
    cohortes: r3.data || [],
    churnKpis: r4.data?.[0] || {},
    kpis: r5.data?.[0] || {},
  }
}

function CohorteBar({ label, pct, count, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: C.tx }}>{label}</span>
        <span style={{ color: C.tx2 }}>{fmtNum(count)} inact.</span>
      </div>
      <div style={{ height: 24, borderRadius: 6, background: C.bg, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct * 2.5, 100)}%`, height: '100%', borderRadius: 6, background: color,
          display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff',
          minWidth: pct > 0 ? 50 : 0 }}>
          {pct}%
        </div>
      </div>
    </div>
  )
}

export default function Churn() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchAll().then(d => { setData(d); setLoading(false) }) }, [])

  if (loading) return <LoadingState />
  if (!data) return <ErrorState message="Error cargando datos" />

  const { mensual, tramos, cohortes, churnKpis, kpis } = data

  const totalClientes = Number(kpis.clientes_total || 0)
  const totalSS = Number(kpis.sin_servicio || 0)
  const churnAcum = totalClientes > 0 ? Math.round(totalSS / totalClientes * 1000) / 10 : 0
  const vidaMediaMeses = churnKpis.vida_media_dias ? Math.round(Number(churnKpis.vida_media_dias) / 30 * 10) / 10 : 0
  const vidaMedianaMeses = churnKpis.vida_mediana_dias ? Math.round(Number(churnKpis.vida_mediana_dias) / 30 * 10) / 10 : 0

  const last12 = mensual.slice(-12)
  const tasaProm = last12.length > 0 ? Math.round(last12.reduce((s, m) => s + Number(m.bajas || 0), 0) / last12.length) : 0

  const chartData = mensual.filter(m => m.mes >= '2024-07').map(m => ({
    mes: m.mes, bajas: Number(m.bajas || 0), altas: Number(m.altas || 0),
  }))

  // Tramos
  const totalChurned = tramos.reduce((s, t) => s + Number(t.cantidad || 0), 0)
  const antes3 = tramos.filter(t => t.tramo === '0-1 mes' || t.tramo === '1-3 meses').reduce((s, t) => s + Number(t.cantidad || 0), 0)
  const entre3y6 = tramos.filter(t => t.tramo === '3-6 meses').reduce((s, t) => s + Number(t.cantidad || 0), 0)
  const mas12 = tramos.filter(t => t.tramo === '+12 meses').reduce((s, t) => s + Number(t.cantidad || 0), 0)
  const pctAntes3 = totalChurned > 0 ? Math.round(antes3 / totalChurned * 1000) / 10 : 0
  const pctEntre3y6 = totalChurned > 0 ? Math.round(entre3y6 / totalChurned * 1000) / 10 : 0
  const pctMas12 = totalChurned > 0 ? Math.round(mas12 / totalChurned * 1000) / 10 : 0

  const cohorteColor = pct => Number(pct) >= 35 ? C.red : Number(pct) >= 25 ? '#f97316' : Number(pct) >= 15 ? C.amb : C.grn
  const pieColors = [C.red, '#f97316', C.amb, C.pri, C.grn]

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Churn acumulado" value={`${churnAcum}%`} icon="📉" sub={`${fmtNum(totalSS)} de ${fmtNum(totalClientes)}`} />
        <KpiCard title="Bajas prom/mes" value={fmtNum(tasaProm)} icon="📊" sub="últimos 12 meses" />
        <KpiCard title="Vida media" value={`${vidaMediaMeses} meses`} icon="⏱️" sub={`mediana: ${vidaMedianaMeses} meses`} />
        <KpiCard title="Churn anual" value={`${churnAcum}%`} icon="🔴" sub={`${fmtNum(totalSS)} sin servicio`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Bajas mensuales (Sin servicio)" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="bajas" name="Bajas" fill={C.red} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line dataKey="altas" name="Altas" stroke={C.grn} strokeWidth={2} dot={{ r: 3, fill: C.grn }} />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Churn acumulado por cohorte" height="auto">
          <div style={{ padding: '8px 0' }}>
            {cohortes.map((q, i) => (
              <CohorteBar key={i}
                label={`${q.cohorte} (${q.vida_media_dias ? Math.round(Number(q.vida_media_dias) / 30) + 'm' : '—'})`}
                pct={Number(q.churn_pct)} count={Number(q.churned)} color={cohorteColor(q.churn_pct)} />
            ))}
          </div>
          <div style={{ marginTop: 12, padding: 12, background: C.bg, borderRadius: 8, fontSize: 11, color: C.tx2 }}>
            Las cohortes maduras convergen al 33-40%: <strong style={{ color: C.red }}>churn estructural ~35% anual</strong>.
            Cohortes Q4 2025+ muestran mejora (13-17%).
          </div>
        </ChartCard>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.red}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Churnan antes del mes 3</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.red }}>{pctAntes3}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>problema de onboarding</div>
        </div>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.amb}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Churnan entre mes 3-6</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.amb }}>{pctEntre3y6}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>primera renovación</div>
        </div>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.grn}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Más de 12 meses activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.grn }}>{pctMas12}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>los clientes "fieles"</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Distribución de permanencia al irse" height={280}>
          <BarChart data={tramos.map(t => ({ tramo: t.tramo, cantidad: Number(t.cantidad) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="tramo" tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cantidad" name="Clientes" radius={[6, 6, 0, 0]}>
              {tramos.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="¿Cuándo se van?" height={280}>
          <PieChart>
            <Pie data={tramos.filter(t => Number(t.cantidad) > 0).map(t => ({ name: t.tramo, value: Number(t.cantidad) }))}
              cx="50%" cy="50%" outerRadius={95} innerRadius={55} dataKey="value"
              label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              labelLine={{ stroke: C.tx2 }}>
              {tramos.filter(t => Number(t.cantidad) > 0).map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Pie>
            <Tooltip formatter={v => fmtNum(v)} />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  )
}
