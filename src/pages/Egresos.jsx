import { useState } from 'react'
import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip, Breadcrumb, ActionCard, AlertBanner, DataTable, ProgressBar } from '../components/UI'
import { useQuery, useMultiQuery } from '../lib/hooks'
import { getEgresosNetMensual, getEgresosPorRubro, getEgresosPorSubrubro, getEgresosPorProveedor, getEgresosPorCentro, getEgresosDetalle } from '../lib/queries'
import { fmt, fmtN, ml } from '../lib/formatters'
import { COLORS as C, PALETTE as PC } from '../lib/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts'

export default function Egresos() {
  const [view, setView] = useState('overview')
  const [selRubro, setSelRubro] = useState(null)
  const [selProveedor, setSelProveedor] = useState(null)

  const nav = (v, rubro, prov) => {
    setView(v)
    if (rubro !== undefined) setSelRubro(rubro)
    if (prov !== undefined) setSelProveedor(prov)
  }

  if (view === 'overview') return <EgresosOverview onNav={nav} />
  if (view === 'rubros') return <EgresosRubros onNav={nav} />
  if (view === 'rubro_detail') return <EgresosRubroDetail rubro={selRubro} onNav={nav} />
  if (view === 'proveedor_detail') return <EgresosProveedorDetail proveedor={selProveedor} rubro={selRubro} onNav={nav} />
  if (view === 'centros') return <EgresosCentros onNav={nav} />
  return null
}

function EgresosOverview({ onNav }) {
  const { mensual, rubros, centros, loading, error, retry } = useMultiQuery({
    mensual: getEgresosNetMensual,
    rubros: getEgresosPorRubro,
    centros: getEgresosPorCentro,
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const eg = mensual || []
  const periodos = [...new Set(eg.map(e => e.periodo))].sort()
  const monthlyData = periodos.map(p => {
    const opex = eg.filter(e => e.periodo === p && e.tipo_egreso === 'OPEX').reduce((s, e) => s + Number(e.total), 0)
    const capex = eg.filter(e => e.periodo === p && e.tipo_egreso === 'CAPEX').reduce((s, e) => s + Number(e.total), 0)
    return { mes: p, opex, capex, total: opex + capex }
  })

  const totO = monthlyData.reduce((s, m) => s + m.opex, 0)
  const totC = monthlyData.reduce((s, m) => s + m.capex, 0)
  const totE = totO + totC

  const rubroAgg = {}
  ;(rubros || []).forEach(r => {
    if (!rubroAgg[r.rubro]) rubroAgg[r.rubro] = { rubro: r.rubro, total: 0, tipo: r.tipo_default }
    rubroAgg[r.rubro].total += Number(r.total)
  })
  const rubroRanked = Object.values(rubroAgg).sort((a, b) => b.total - a.total)

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title={`Egresos ${periodos.length}m`} value={fmt(totE)} icon="💸" sub={periodos.map(ml).join(', ')} />
        <KpiCard title="OPEX" value={fmt(totO)} icon="💼" sub={totE > 0 ? `${Math.round(totO / totE * 100)}% del total` : ''} />
        <KpiCard title="CAPEX" value={fmt(totC)} icon="🏗️" sub={totE > 0 ? `${Math.round(totC / totE * 100)}% del total` : ''} />
        <KpiCard title="Rubros activos" value={rubroRanked.length.toString()} icon="📂" />
      </div>

      <AlertBanner type="warning">
        Egresos consumidos por Netsharing. Datos de la Matriz histórica. Se actualizan dinámicamente desde Supabase.
      </AlertBanner>

      {monthlyData.length > 0 && (
        <ChartCard title="OPEX vs CAPEX mensual" height={300} full>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 11 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="opex" name="OPEX" fill={C.amb} stackId="a" opacity={0.85} />
            <Bar dataKey="capex" name="CAPEX" fill={C.red} stackId="a" radius={[4, 4, 0, 0]} opacity={0.85} />
            <Legend />
          </BarChart>
        </ChartCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
        <ActionCard title="📂 Drill-down por rubro →" onClick={() => onNav('rubros')}>
          {rubroRanked.slice(0, 5).map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
              <span style={{ color: C.tx }}>{r.rubro}</span>
              <span style={{ color: C.acc, fontFamily: 'monospace' }}>{fmt(r.total)}</span>
            </div>
          ))}
          <div style={{ fontSize: 11, color: C.acc, marginTop: 8 }}>Ver {rubroRanked.length} rubros →</div>
        </ActionCard>

        <ActionCard title="🏢 Por centro de costo →" onClick={() => onNav('centros')}>
          {(centros || []).slice(0, 5).map((c, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0' }}>
              <span style={{ color: C.tx }}>{c.centro_costo || 'Sin asignar'}</span>
              <span style={{ color: C.acc, fontFamily: 'monospace' }}>{fmt(c.total)}</span>
            </div>
          ))}
        </ActionCard>
      </div>
    </div>
  )
}

function EgresosRubros({ onNav }) {
  const { data, loading, error, retry } = useQuery(getEgresosPorRubro)

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const rubroAgg = {}
  ;(data || []).forEach(r => {
    if (!rubroAgg[r.rubro]) rubroAgg[r.rubro] = { rubro: r.rubro, total: 0, tipo: r.tipo_egreso }
    rubroAgg[r.rubro].total += Number(r.total)
  })
  const ranked = Object.values(rubroAgg).sort((a, b) => b.total - a.total)
  const totalAll = ranked.reduce((s, r) => s + r.total, 0)

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Egresos', action: () => onNav('overview') },
        { label: 'Por rubro' },
      ]} />
      <ChartCard title="Ranking de rubros — clic para detalle" height="auto" full>
        <div>
          {ranked.map((r, i) => {
            const pct = totalAll > 0 ? r.total / totalAll * 100 : 0
            return (
              <div key={i} onClick={() => onNav('rubro_detail', r.rubro)} style={{ marginBottom: 4, cursor: 'pointer', padding: '6px 10px', borderRadius: 8 }}
                onMouseEnter={e => e.currentTarget.style.background = C.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span style={{ color: C.tx, fontWeight: 500 }}>
                    <span style={{ color: C.tx2, fontSize: 11, fontFamily: 'monospace', marginRight: 8 }}>{i + 1}</span>{r.rubro}
                  </span>
                  <span style={{ color: C.acc, fontFamily: 'monospace' }}>{fmt(r.total)} <span style={{ color: C.tx2, fontSize: 11 }}>({pct.toFixed(1)}%)</span></span>
                </div>
                <ProgressBar value={r.total} max={totalAll} color={PC[i % PC.length]} />
              </div>
            )
          })}
        </div>
      </ChartCard>
    </div>
  )
}

function EgresosRubroDetail({ rubro, onNav }) {
  const { subrubros, proveedores, loading, error, retry } = useMultiQuery({
    subrubros: () => getEgresosPorSubrubro(rubro),
    proveedores: () => getEgresosPorProveedor(rubro),
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const subAgg = {}
  ;(subrubros || []).forEach(s => {
    const key = s.subrubro || 'Sin subrubro'
    if (!subAgg[key]) subAgg[key] = 0
    subAgg[key] += Number(s.total)
  })
  const subRanked = Object.entries(subAgg).map(([k, v]) => ({ name: k, total: v })).sort((a, b) => b.total - a.total)

  const provAgg = {}
  ;(proveedores || []).forEach(p => {
    if (!provAgg[p.proveedor]) provAgg[p.proveedor] = 0
    provAgg[p.proveedor] += Number(p.total)
  })
  const provRanked = Object.entries(provAgg).map(([k, v]) => ({ name: k, total: v })).sort((a, b) => b.total - a.total)
  const totalRubro = provRanked.reduce((s, p) => s + p.total, 0)

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Egresos', action: () => onNav('overview') },
        { label: 'Rubros', action: () => onNav('rubros') },
        { label: rubro },
      ]} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title={rubro} value={fmt(totalRubro)} icon="📂" />
        <KpiCard title="Proveedores" value={provRanked.length.toString()} icon="🏢" />
        <KpiCard title="Subrubros" value={subRanked.length.toString()} icon="📁" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <ChartCard title="Proveedores / pagadores" height="auto">
          <div>
            {provRanked.map((p, i) => (
              <div key={i} onClick={() => onNav('proveedor_detail', rubro, p.name)} style={{ marginBottom: 6, cursor: 'pointer', padding: '4px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                  <span style={{ color: C.tx, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                  <span style={{ color: C.acc, fontFamily: 'monospace' }}>{fmt(p.total)}</span>
                </div>
                <ProgressBar value={p.total} max={totalRubro} color={PC[i % PC.length]} />
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Subrubros" height={260}>
          <PieChart>
            <Pie data={subRanked.slice(0, 6)} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="total" nameKey="name"
              label={({ name, percent }) => percent > 0.05 ? `${name} ${Math.round(percent * 100)}%` : ''} labelLine={{ stroke: C.tx2 }}>
              {subRanked.slice(0, 6).map((_, i) => <Cell key={i} fill={PC[i]} />)}
            </Pie>
            <Tooltip formatter={v => fmtN(v)} />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  )
}

function EgresosProveedorDetail({ proveedor, rubro, onNav }) {
  const { data, loading, error, retry } = useQuery(() => getEgresosDetalle(proveedor, rubro, 200), [proveedor, rubro])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const registros = data || []
  const total = registros.reduce((s, r) => s + Number(r.importe_total), 0)

  const columns = [
    { key: 'fecha_documento', label: 'Fecha' },
    { key: 'periodo', label: 'Período' },
    { key: 'detalle', label: 'Detalle', render: r => <span style={{ maxWidth: 250, display: 'inline-block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.detalle}</span> },
    { key: 'importe_total', label: 'Monto', align: 'right', mono: true, render: r => fmtN(r.importe_total) },
    { key: 'tipo_egreso', label: 'Tipo', render: r => <span style={{ color: r.tipo_egreso === 'CAPEX' ? C.red : C.amb }}>{r.tipo_egreso}</span> },
    { key: 'medio_pago', label: 'Medio' },
  ]

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Egresos', action: () => onNav('overview') },
        { label: 'Rubros', action: () => onNav('rubros') },
        { label: rubro, action: () => onNav('rubro_detail', rubro) },
        { label: proveedor },
      ]} />
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title={proveedor.split(' ')[0]} value={fmt(total)} icon="🏢" />
        <KpiCard title="Registros" value={registros.length.toString()} icon="📋" />
      </div>
      <DataTable columns={columns} data={registros} maxHeight={500} />
    </div>
  )
}

function EgresosCentros({ onNav }) {
  const { data, loading, error, retry } = useQuery(getEgresosPorCentro)

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const ccAgg = {}
  ;(data || []).forEach(c => {
    const key = c.centro_costo || 'Sin asignar'
    if (!ccAgg[key]) ccAgg[key] = { nombre: key, tipo: c.tipo_centro, total: 0 }
    ccAgg[key].total += Number(c.total)
  })
  const ranked = Object.values(ccAgg).sort((a, b) => b.total - a.total)
  const totalAll = ranked.reduce((s, c) => s + c.total, 0)

  return (
    <div>
      <Breadcrumb items={[
        { label: 'Egresos', action: () => onNav('overview') },
        { label: 'Por centro de costo' },
      ]} />
      <ChartCard title="Egresos por centro de costo" height="auto" full>
        <div>
          {ranked.map((c, i) => {
            const pct = totalAll > 0 ? c.total / totalAll * 100 : 0
            return (
              <div key={i} style={{ marginBottom: 6, padding: '6px 10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                  <span style={{ color: C.tx, fontWeight: 500 }}>
                    {c.nombre}
                    {c.tipo && <span style={{ fontSize: 10, color: C.tx2, marginLeft: 8 }}>({c.tipo})</span>}
                  </span>
                  <span style={{ color: C.acc, fontFamily: 'monospace' }}>{fmt(c.total)} ({pct.toFixed(1)}%)</span>
                </div>
                <ProgressBar value={c.total} max={totalAll} color={PC[i % PC.length]} />
              </div>
            )
          })}
        </div>
      </ChartCard>
    </div>
  )
}
