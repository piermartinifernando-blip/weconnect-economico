import { useState, useEffect } from 'react'
import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip } from '../components/UI'
import { COLORS as C } from '../lib/constants'
import { fmtNum, ml } from '../lib/formatters'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ComposedChart, Line, PieChart, Pie, Cell } from 'recharts'

async function fetchAll() {
  const { data: churnMensual } = await supabase.from('vw_churn_mensual_real').select('*').order('mes')
  const { data: kpisRaw } = await supabase.from('vw_kpis_actuales').select('*')
  const { data: clientes } = await supabase.from('clientes_ispcube').select('estado, fecha_alta, fecha_bloqueo')

  const kpis = kpisRaw?.[0] || {}
  const rows = (clientes || []).filter(r => r.fecha_alta)

  // Cohortes trimestrales
  const qMap = {}
  rows.forEach(r => {
    const fa = r.fecha_alta.substring(0, 10)
    const year = parseInt(fa.substring(0, 4))
    const month = parseInt(fa.substring(5, 7))
    const q = `${year}-Q${Math.ceil(month / 3)}`
    if (q < '2024-Q3') return
    if (!qMap[q]) qMap[q] = { cohorte: q, total: 0, churned: 0, dias_sum: 0, dias_count: 0 }
    qMap[q].total++
    if (r.estado === 'Sin servicio') {
      qMap[q].churned++
      if (r.fecha_bloqueo) {
        const d1 = new Date(r.fecha_alta.substring(0, 10))
        const d2 = new Date(r.fecha_bloqueo.substring(0, 10))
        const dias = Math.round((d2 - d1) / 86400000)
        if (dias > 0) { qMap[q].dias_sum += dias; qMap[q].dias_count++ }
      }
    }
  })
  const cohortes = Object.values(qMap).sort((a, b) => a.cohorte.localeCompare(b.cohorte)).map(q => ({
    cohorte: q.cohorte, total: q.total, churned: q.churned,
    churn_pct: q.total > 0 ? Math.round(q.churned / q.total * 1000) / 10 : 0,
    vida_media_dias: q.dias_count > 0 ? Math.round(q.dias_sum / q.dias_count) : null,
  }))

  // Tramos de permanencia
  const t = { '0-1 mes': 0, '1-3 meses': 0, '3-6 meses': 0, '6-12 meses': 0, '+12 meses': 0 }
  let totalDias = 0, countDias = 0
  const allDias = []
  rows.filter(r => r.estado === 'Sin servicio' && r.fecha_bloqueo).forEach(r => {
    const dias = Math.round((new Date(r.fecha_bloqueo.substring(0, 10)) - new Date(r.fecha_alta.substring(0, 10))) / 86400000)
    if (dias <= 0) return
    totalDias += dias; countDias++; allDias.push(dias)
    if (dias <= 30) t['0-1 mes']++
    else if (dias <= 90) t['1-3 meses']++
    else if (dias <= 180) t['3-6 meses']++
    else if (dias <= 365) t['6-12 meses']++
    else t['+12 meses']++
  })
  const totalChurned = Object.values(t).reduce((a, b) => a + b, 0)
  const antes3 = t['0-1 mes'] + t['1-3 meses']
  allDias.sort((a, b) => a - b)
  const tramos = {
    data: Object.entries(t).map(([tramo, cantidad]) => ({ tramo, cantidad })),
    totalChurned,
    vidaMediaMeses: countDias > 0 ? Math.round(totalDias / countDias / 30 * 10) / 10 : 0,
    vidaMedianaMeses: allDias.length > 0 ? Math.round(allDias[Math.floor(allDias.length / 2)] / 30 * 10) / 10 : 0,
    pctAntes3: totalChurned > 0 ? Math.round(antes3 / totalChurned * 1000) / 10 : 0,
    pctEntre3y6: totalChurned > 0 ? Math.round(t['3-6 meses'] / totalChurned * 1000) / 10 : 0,
    pctMas12: totalChurned > 0 ? Math.round(t['+12 meses'] / totalChurned * 1000) / 10 : 0,
  }

  return { churnMensual: churnMensual || [], cohortes, tramos, kpis }
}

function CohorteBar({ label, pct, count, color }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ color: C.tx }}>{label}</span>
        <span style={{ color: C.tx2 }}>{fmtNum(count)} inact.</span>
      </div>
      <div style={{ flex: 1, height: 24, borderRadius: 6, background: C.bg, overflow: 'hidden' }}>
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

  const { churnMensual, cohortes, tramos, kpis } = data
  const totalClientes = Number(kpis.clientes_total || 0)
  const totalSS = Number(kpis.sin_servicio || 0)
  const churnAcum = totalClientes > 0 ? Math.round(totalSS / totalClientes * 1000) / 10 : 0

  const last12 = (churnMensual || []).slice(-12)
  const tasaProm = last12.length > 0 ? Math.round(last12.reduce((s, m) => s + Number(m.bajas || 0), 0) / last12.length) : 0

  const chartData = (churnMensual || []).filter(m => m.mes >= '2024-07').map(m => ({
    mes: m.mes, bajas: Number(m.bajas || 0), altas: Number(m.altas || 0), neto: Number(m.neto || 0),
  }))

  const cohorteColor = pct => pct >= 35 ? C.red : pct >= 25 ? '#f97316' : pct >= 15 ? C.amb : C.grn
  const pieColors = [C.red, '#f97316', C.amb, C.pri, C.grn]

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Churn acumulado" value={`${churnAcum}%`} icon="📉" sub={`${fmtNum(totalSS)} de ${fmtNum(totalClientes)}`} />
        <KpiCard title="Bajas prom/mes" value={fmtNum(tasaProm)} icon="📊" sub="últimos 12 meses" />
        <KpiCard title="Vida media" value={`${tramos.vidaMediaMeses} meses`} icon="⏱️" sub={`mediana: ${tramos.vidaMedianaMeses} meses`} />
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
                label={`${q.cohorte} (${q.vida_media_dias ? Math.round(q.vida_media_dias / 30) + 'm' : '—'})`}
                pct={q.churn_pct} count={q.churned} color={cohorteColor(q.churn_pct)} />
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
          <div style={{ fontSize: 32, fontWeight: 800, color: C.red }}>{tramos.pctAntes3}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>problema de onboarding</div>
        </div>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.amb}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Churnan entre mes 3-6</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.amb }}>{tramos.pctEntre3y6}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>primera renovación</div>
        </div>
        <div style={{ background: C.sf, borderRadius: 12, border: `2px solid ${C.grn}`, padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: C.tx2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Más de 12 meses activos</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: C.grn }}>{tramos.pctMas12}%</div>
          <div style={{ fontSize: 12, color: C.tx2, marginTop: 4 }}>los clientes "fieles"</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Distribución de permanencia al irse" height={280}>
          <BarChart data={tramos.data}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="tramo" tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="cantidad" name="Clientes" radius={[6, 6, 0, 0]}>
              {tramos.data.map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title="¿Cuándo se van?" height={280}>
          <PieChart>
            <Pie data={tramos.data.filter(t => t.cantidad > 0).map(t => ({ name: t.tramo, value: t.cantidad }))}
              cx="50%" cy="50%" outerRadius={95} innerRadius={55} dataKey="value"
              label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}
              labelLine={{ stroke: C.tx2 }}>
              {tramos.data.filter(t => t.cantidad > 0).map((_, i) => <Cell key={i} fill={pieColors[i]} />)}
            </Pie>
            <Tooltip formatter={v => fmtNum(v)} />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  )
}
