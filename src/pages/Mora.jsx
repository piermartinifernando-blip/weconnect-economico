import { useState } from 'react'
import { KpiCard, ChartCard, LoadingState, ErrorState } from '../components/UI'
import { useMultiQuery } from '../lib/hooks'
import { getMoraActual, getBloqueadosTramos } from '../lib/queries'
import { fmt, fmtN, fmtNum } from '../lib/formatters'
import { COLORS as C, PALETTE as PC } from '../lib/constants'
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'

// Query directa para mora por zona con detalle por estado
import { supabase } from '../lib/supabase'
const getMoraPorZona = async () => {
  try {
    const { data, error } = await supabase.from('vw_mora_por_zona').select('*')
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err.message }
  }
}

export default function Mora() {
  const [vista, setVista] = useState('total')
  const { mora, zonas, tramos, loading, error, retry } = useMultiQuery({
    mora: getMoraActual,
    zonas: getMoraPorZona,
    tramos: getBloqueadosTramos,
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const rows = zonas || []

  // Agrupar por zona
  const zonasMap = {}
  rows.forEach(r => {
    const z = r.zona
    if (!zonasMap[z]) zonasMap[z] = { zona: z, hab: 0, bloq: 0, ss: 0, deuda_hab: 0, deuda_bloq: 0, deuda_ss: 0, deuda_total: 0 }
    const dv = Number(r.deuda_vencida || 0)
    const cant = Number(r.cantidad || 0)
    if (r.estado === 'Habilitado') { zonasMap[z].hab = cant; zonasMap[z].deuda_hab = dv }
    if (r.estado === 'Bloqueado') { zonasMap[z].bloq = cant; zonasMap[z].deuda_bloq = dv }
    if (r.estado === 'Sin servicio') { zonasMap[z].ss = cant; zonasMap[z].deuda_ss = dv }
    zonasMap[z].deuda_total += dv
  })
  const zonasList = Object.values(zonasMap).sort((a, b) => b.deuda_total - a.deuda_total)

  const deudaHab = zonasList.reduce((s, z) => s + z.deuda_hab, 0)
  const deudaBloq = zonasList.reduce((s, z) => s + z.deuda_bloq, 0)
  const deudaSS = zonasList.reduce((s, z) => s + z.deuda_ss, 0)
  const totalHabConDeuda = zonasList.reduce((s, z) => s + z.hab, 0)
  const totalBloqConDeuda = zonasList.reduce((s, z) => s + z.bloq, 0)
  const totalSSConDeuda = zonasList.reduce((s, z) => s + z.ss, 0)

  const tabStyle = (active) => ({
    padding: '10px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
    border: 'none', transition: 'all .2s',
    background: active ? C.pri : C.sf,
    color: active ? '#fff' : C.tx2,
  })

  const tramosData = (tramos || []).map(t => ({
    tramo: t.tramo,
    cantidad: Number(t.cantidad || 0),
    deuda: Number(t.deuda_vencida || 0),
  }))

  return (
    <div>
      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button style={tabStyle(vista === 'total')} onClick={() => setVista('total')}>
          Mora Total
        </button>
        <button style={tabStyle(vista === 'operativa')} onClick={() => setVista('operativa')}>
          Mora Operativa (Hab + Bloq)
        </button>
      </div>

      {vista === 'total' ? (
        /* ═══════════ MORA TOTAL ═══════════ */
        <div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            <KpiCard title="Deuda vencida total" value={fmt(deudaHab + deudaBloq + deudaSS)} icon="💸" />
            <KpiCard title="Deuda habilitados" value={fmt(deudaHab)} icon="🟢" sub={`${fmtNum(totalHabConDeuda)} clientes`} />
            <KpiCard title="Deuda bloqueados" value={fmt(deudaBloq)} icon="🔴" sub={`${fmtNum(totalBloqConDeuda)} clientes`} />
            <KpiCard title="Deuda sin servicio" value={fmt(deudaSS)} icon="⚫" sub={`${fmtNum(totalSSConDeuda)} clientes`} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartCard title="Deuda por zona — Hab + Bloq + SS" height="auto">
              <div>
                {zonasList.map((z, i) => (
                  <div key={i} style={{
                    marginBottom: 14, padding: 16, background: C.bg, borderRadius: 12,
                    borderLeft: `4px solid ${z.deuda_ss > 10000000 ? C.red : C.amb}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{z.zona}</span>
                      <span style={{ fontSize: 17, fontWeight: 700, color: C.amb }}>{fmt(z.deuda_total)}</span>
                    </div>
                    <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: C.sf, marginBottom: 8 }}>
                      {z.deuda_hab > 0 && <div style={{ width: `${z.deuda_hab / z.deuda_total * 100}%`, background: '#10b981' }} />}
                      {z.deuda_bloq > 0 && <div style={{ width: `${z.deuda_bloq / z.deuda_total * 100}%`, background: '#ef4444' }} />}
                      {z.deuda_ss > 0 && <div style={{ width: `${z.deuda_ss / z.deuda_total * 100}%`, background: '#6b7280' }} />}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: C.tx2 }}>
                      <span style={{ color: '#10b981' }}>Hab: {fmtNum(z.hab)} · {fmt(z.deuda_hab)}</span>
                      <span style={{ color: '#ef4444' }}>Bloq: {fmtNum(z.bloq)} · {fmt(z.deuda_bloq)}</span>
                      <span style={{ color: '#6b7280' }}>SS: {fmtNum(z.ss)} · {fmt(z.deuda_ss)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Distribución deuda total" height={280}>
              <PieChart>
                <Pie data={[
                  { name: 'Habilitados', value: deudaHab },
                  { name: 'Bloqueados', value: deudaBloq },
                  { name: 'Sin servicio', value: deudaSS },
                ].filter(d => d.value > 0)}
                  cx="50%" cy="50%" outerRadius={95} innerRadius={55} dataKey="value"
                  label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={{ stroke: C.tx2 }}>
                  <Cell fill="#10b981" />
                  <Cell fill="#ef4444" />
                  <Cell fill="#6b7280" />
                </Pie>
                <Tooltip formatter={v => fmtN(v)} />
              </PieChart>
            </ChartCard>
          </div>
        </div>
      ) : (
        /* ═══════════ MORA OPERATIVA (Hab + Bloq) ═══════════ */
        <div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
            <KpiCard title="Deuda operativa" value={fmt(deudaHab + deudaBloq)} icon="💰" sub="Habilitados + Bloqueados" />
            <KpiCard title="Deuda habilitados" value={fmt(deudaHab)} icon="🟢" sub={`${fmtNum(totalHabConDeuda)} clientes`} />
            <KpiCard title="Deuda bloqueados" value={fmt(deudaBloq)} icon="🔴" sub={`${fmtNum(totalBloqConDeuda)} clientes`} />
            <KpiCard title="Deuda prom/bloqueado" value={fmtN(totalBloqConDeuda > 0 ? deudaBloq / totalBloqConDeuda : 0)} icon="📊" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <ChartCard title="Deuda por zona — Hab + Bloq" height="auto">
              <div>
                {zonasList.map((z, i) => {
                  const deudaOp = z.deuda_hab + z.deuda_bloq
                  if (deudaOp === 0) return null
                  return (
                    <div key={i} style={{
                      marginBottom: 14, padding: 16, background: C.bg, borderRadius: 12,
                      borderLeft: `4px solid ${z.deuda_bloq > z.deuda_hab ? C.red : C.pri}`,
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{z.zona}</span>
                        <span style={{ fontSize: 17, fontWeight: 700, color: C.pri }}>{fmt(deudaOp)}</span>
                      </div>
                      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', background: C.sf, marginBottom: 8 }}>
                        {z.deuda_hab > 0 && <div style={{ width: `${z.deuda_hab / deudaOp * 100}%`, background: '#10b981' }} />}
                        {z.deuda_bloq > 0 && <div style={{ width: `${z.deuda_bloq / deudaOp * 100}%`, background: '#ef4444' }} />}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.tx2 }}>
                        <span style={{ color: '#10b981' }}>🟢 Hab: {fmtNum(z.hab)} · {fmt(z.deuda_hab)}</span>
                        <span style={{ color: '#ef4444' }}>🔴 Bloq: {fmtNum(z.bloq)} · {fmt(z.deuda_bloq)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ChartCard>

            <div>
              <ChartCard title="Bloqueados por antigüedad" height={280}>
                <BarChart data={tramosData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
                  <XAxis type="number" tick={{ fill: C.tx2, fontSize: 11 }} />
                  <YAxis dataKey="tramo" type="category" tick={{ fill: C.tx2, fontSize: 11 }} width={110} />
                  <Tooltip formatter={v => fmtNum(v)} contentStyle={{ background: C.sf, border: `1px solid ${C.brd}`, borderRadius: 8 }} />
                  <Bar dataKey="cantidad" fill={C.red} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartCard>

              <div style={{ marginTop: 16, padding: 18, background: C.sf, borderRadius: 12, border: `1px solid ${C.brd}` }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.tx2, marginBottom: 12 }}>Deuda por tramo de bloqueo</div>
                {tramosData.map((t, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < tramosData.length - 1 ? `1px solid ${C.brd}` : 'none', fontSize: 13 }}>
                    <span style={{ color: C.tx }}>{t.tramo}</span>
                    <span style={{ fontWeight: 600, color: C.amb }}>{fmt(t.deuda)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
