import { useState, useEffect } from 'react'
import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip } from '../components/UI'
import { COLORS as C } from '../lib/constants'
import { fmt, fmtN, fmtNum, ml, delta } from '../lib/formatters'
import { supabase } from '../lib/supabase'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'

async function fetchDashboard() {
  const [r1, r2, r3, r4, r5, r6, r7, r8] = await Promise.all([
    supabase.from('vw_cobranza_mensual').select('*').order('mes'),
    supabase.from('vw_facturacion_mensual').select('*').order('mes'),
    supabase.from('vw_egresos_mensual_normalizado').select('*').order('mes'),
    supabase.from('vw_clientes_por_region').select('*'),
    supabase.from('vw_churn_mensual_real').select('*').order('mes'),
    supabase.from('vw_kpis_actuales').select('*'),
    supabase.from('vw_mora_actual').select('*'),
    supabase.from('egresos').select('estado_control'),
  ])
  return {
    cobranza: r1.data || [], facturacion: r2.data || [], egresos: r3.data || [],
    regiones: r4.data || [], churn: r5.data || [], kpis: r6.data?.[0] || {},
    mora: r7.data?.[0] || {}, egresosAll: r8.data || [],
  }
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchDashboard().then(d => { setData(d); setLoading(false) }) }, [])

  if (loading) return <LoadingState />
  if (!data) return <ErrorState message="Error cargando datos" />

  const { cobranza, facturacion, egresos, regiones, churn, kpis, mora, egresosAll } = data

  // KPIs
  const cobr = cobranza.slice(-2)
  const lastCob = cobr[cobr.length - 1]
  const prevCob = cobr[cobr.length - 2]
  const lastFact = facturacion[facturacion.length - 1]
  const totalHab = Number(kpis.habilitados || 0)
  const totalBloq = Number(kpis.bloqueados || 0)
  const totalSS = Number(kpis.sin_servicio || 0)
  const totalClientes = Number(kpis.clientes_total || 0)
  const arpu = totalHab > 0 ? Math.round(Number(lastCob?.cobrado || 0) / totalHab) : 0

  // Churn last month
  const lastChurn = churn[churn.length - 1]
  const prevChurn = churn[churn.length - 2]

  // Mora
  const moraOp = Number(mora.deuda_vencida_habilitados || 0) + Number(mora.deuda_vencida_bloqueados || 0)

  // Clasificación egresos
  const totalEg = egresosAll.length
  const egOk = egresosAll.filter(e => e.estado_control === 'ok').length
  const pctClasif = totalEg > 0 ? Math.round(egOk / totalEg * 100) : 0

  // Break-even chart (last 12 months)
  const monthly = cobranza.slice(-12).map(c => {
    const f = facturacion.find(x => x.mes === c.mes)
    const e = egresos.find(x => x.mes === c.mes)
    return {
      mes: c.mes,
      cobrado: Number(c.cobrado || 0),
      facturado: Number(f?.facturado || 0),
      opex: Number(e?.opex || 0),
      capex: Number(e?.capex || 0),
      sin_clasif: Number(e?.sin_clasificar || 0),
      egresos_total: Number(e?.total || 0),
    }
  })

  // Altas vs bajas (last 12)
  const churnChart = churn.slice(-12).map(c => ({
    mes: c.mes, altas: Number(c.altas || 0), bajas: Number(c.bajas || 0), neto: Number(c.neto || 0),
  }))

  // Insights automáticos
  const insights = []

  // Insight: tendencia de cobranza
  if (cobr.length >= 2) {
    const diff = Number(lastCob?.cobrado || 0) - Number(prevCob?.cobrado || 0)
    const pct = Number(prevCob?.cobrado) > 0 ? Math.round(diff / Number(prevCob.cobrado) * 100) : 0
    if (pct > 5) insights.push({ icon: '📈', color: C.grn, text: `Cobranza creció ${pct}% vs mes anterior (+${fmt(diff)})` })
    else if (pct < -5) insights.push({ icon: '📉', color: C.red, text: `Cobranza cayó ${Math.abs(pct)}% vs mes anterior (${fmt(diff)})` })
  }

  // Insight: churn
  if (lastChurn) {
    const neto = Number(lastChurn.neto || 0)
    if (neto > 0) insights.push({ icon: '🟢', color: C.grn, text: `Crecimiento neto +${neto} clientes en ${ml(lastChurn.mes)} (${lastChurn.altas} altas - ${lastChurn.bajas} bajas)` })
    else if (neto < 0) insights.push({ icon: '🔴', color: C.red, text: `Pérdida neta de ${Math.abs(neto)} clientes en ${ml(lastChurn.mes)} (${lastChurn.altas} altas - ${lastChurn.bajas} bajas)` })
  }

  // Insight: ARPU
  if (arpu > 0) {
    insights.push({ icon: '💰', color: C.amb, text: `ARPU real $${arpu.toLocaleString()} (cobrado ${ml(lastCob?.mes)} / ${fmtNum(totalHab)} habilitados)` })
  }

  // Insight: mora
  if (moraOp > 0) {
    const pctMora = totalHab > 0 ? Math.round(Number(mora.hab_con_deuda_vencida || 0) / totalHab * 100) : 0
    insights.push({ icon: '⚠️', color: C.amb, text: `Mora operativa ${fmt(moraOp)} — ${pctMora}% de habilitados con deuda vencida` })
  }

  // Insight: egresos sin clasificar
  if (totalEg > 0 && pctClasif < 100) {
    insights.push({ icon: '✏️', color: C.pur, text: `${totalEg - egOk} egresos pendientes de clasificar (${pctClasif}% completado)` })
  }

  // Insight: bloqueados
  if (totalBloq > 20) {
    insights.push({ icon: '🔒', color: C.red, text: `${fmtNum(totalBloq)} clientes bloqueados — potencial de recupero si se gestiona la mora` })
  }

  // Insight: resultado neto
  const lastMonth = monthly[monthly.length - 1]
  if (lastMonth && lastMonth.egresos_total > 0) {
    const resultado = lastMonth.cobrado - lastMonth.egresos_total
    if (resultado > 0) insights.push({ icon: '✅', color: C.grn, text: `Resultado neto positivo ${fmt(resultado)} en ${ml(lastMonth.mes)}` })
    else insights.push({ icon: '❌', color: C.red, text: `Resultado neto negativo ${fmt(resultado)} en ${ml(lastMonth.mes)}` })
  }

  // Zonas data
  const zonas = regiones.map(r => ({
    zona: r.zona, hab: Number(r.habilitados || 0), bloq: Number(r.bloqueados || 0), ss: Number(r.sin_servicio || 0),
    total: Number(r.total || 0),
  })).sort((a, b) => b.total - a.total)

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Cobrado" value={fmt(lastCob?.cobrado)} icon="💵" sub={ml(lastCob?.mes)} delta={delta(lastCob?.cobrado, prevCob?.cobrado)} />
        <KpiCard title="Habilitados" value={fmtNum(totalHab)} icon="👥" sub={`${(totalHab / Math.max(totalClientes, 1) * 100).toFixed(1)}% del padrón`} />
        <KpiCard title="ARPU" value={`$${arpu.toLocaleString()}`} icon="📈" sub="Cobrado / Habilitados" />
        <KpiCard title="Churn mes" value={fmtNum(Number(lastChurn?.bajas || 0))} icon="📉" sub={`Neto: ${lastChurn?.neto > 0 ? '+' : ''}${lastChurn?.neto || 0}`} />
        <KpiCard title="Mora operativa" value={fmt(moraOp)} icon="⚠️" sub="Hab + Bloq" />
      </div>

      {/* GRÁFICOS */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <ChartCard title="Break-even — Ingresos vs Egresos" height={320}>
          <ComposedChart data={monthly}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="opex" name="OPEX" fill={C.amb} stackId="eg" opacity={0.85} />
            <Bar dataKey="capex" name="CAPEX" fill={C.red} stackId="eg" opacity={0.85} />
            <Bar dataKey="sin_clasif" name="Sin clasificar" fill={C.tx2} stackId="eg" opacity={0.5} radius={[4, 4, 0, 0]} />
            <Line dataKey="cobrado" name="Cobrado" stroke={C.grn} strokeWidth={3} dot={{ r: 4, fill: C.grn }} />
            <Legend />
          </ComposedChart>
        </ChartCard>

        <ChartCard title="Altas vs Bajas — últimos 12 meses" height={320}>
          <ComposedChart data={churnChart}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 10 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="altas" name="Altas" fill={C.grn} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Bar dataKey="bajas" name="Bajas" fill={C.red} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line dataKey="neto" name="Neto" stroke={C.amb} strokeWidth={2.5} dot={{ r: 3, fill: C.amb }} />
            <Legend />
          </ComposedChart>
        </ChartCard>
      </div>

      {/* INSIGHTS */}
      <div style={{ background: C.sf, borderRadius: 12, border: `1px solid ${C.brd}`, padding: 20, marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.tx, marginBottom: 14 }}>🧠 Insights del negocio</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((ins, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: C.bg }}>
              <span style={{ fontSize: 18 }}>{ins.icon}</span>
              <span style={{ fontSize: 13, color: ins.color, fontWeight: 500 }}>{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FILA 3: Clasificación + Resultado + Zonas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Clasificación de egresos */}
        <div style={{ background: C.sf, borderRadius: 12, border: `1px solid ${C.brd}`, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 12 }}>✏️ Clasificación egresos</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: C.bg, marginBottom: 8 }}>
            <div style={{ width: `${pctClasif}%`, background: C.grn, borderRadius: 6, transition: 'width .5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
            <span style={{ color: C.grn, fontWeight: 700 }}>{pctClasif}% completo</span>
            <span style={{ color: C.tx2 }}>{egOk}/{totalEg}</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 24, fontWeight: 800, color: pctClasif === 100 ? C.grn : C.amb }}>
            {totalEg - egOk} <span style={{ fontSize: 12, fontWeight: 400, color: C.tx2 }}>pendientes</span>
          </div>
        </div>

        {/* Resultado neto */}
        <div style={{ background: C.sf, borderRadius: 12, border: `1px solid ${C.brd}`, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 12 }}>💰 Resultado último mes</div>
          {lastMonth ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: C.tx2 }}>
                <span>Cobrado</span><span style={{ color: C.grn, fontWeight: 600 }}>{fmt(lastMonth.cobrado)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', color: C.tx2 }}>
                <span>Egresos</span><span style={{ color: C.red, fontWeight: 600 }}>{fmt(lastMonth.egresos_total)}</span>
              </div>
              <div style={{ borderTop: `1px solid ${C.brd}`, marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
                <span>Resultado</span>
                <span style={{ color: lastMonth.cobrado - lastMonth.egresos_total >= 0 ? C.grn : C.red }}>
                  {fmt(lastMonth.cobrado - lastMonth.egresos_total)}
                </span>
              </div>
              <div style={{ fontSize: 11, color: C.tx2, marginTop: 4 }}>{ml(lastMonth.mes)}</div>
            </>
          ) : (
            <div style={{ color: C.tx2, fontSize: 13 }}>Sin datos de egresos</div>
          )}
        </div>

        {/* Clientes por zona */}
        <div style={{ background: C.sf, borderRadius: 12, border: `1px solid ${C.brd}`, padding: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.tx, marginBottom: 12 }}>📍 Clientes por zona</div>
          {zonas.map((z, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: C.tx }}>{z.zona}</span>
                <span style={{ color: C.tx2 }}>{fmtNum(z.hab)} hab</span>
              </div>
              <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: C.bg }}>
                <div style={{ width: `${z.hab / Math.max(zonas[0].total, 1) * 100}%`, background: C.grn, borderRadius: 4 }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 8, fontSize: 11, color: C.tx2, textAlign: 'center' }}>
            Total: {fmtNum(totalHab)} habilitados · {fmtNum(totalBloq)} bloqueados · {fmtNum(totalSS)} SS
          </div>
        </div>
      </div>
    </div>
  )
}
