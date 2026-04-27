import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip, ProgressBar } from '../components/UI'
import { useMultiQuery } from '../lib/hooks'
import { getClientesPorRegion, getClientesPorPlan, getChurnMensual, getBloqueadosTramos } from '../lib/queries'
import { fmtNum, ml } from '../lib/formatters'
import { COLORS as C, PALETTE as PC } from '../lib/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ComposedChart, Line, ReferenceLine } from 'recharts'

export default function Clientes() {
  const { regiones, planes, mensual, bloqueados, loading, error, retry } = useMultiQuery({
    regiones: getClientesPorRegion,
    planes: getClientesPorPlan,
    mensual: getChurnMensual,
    bloqueados: getBloqueadosTramos,
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const regs = regiones || []
  const totalHab = regs.reduce((s, r) => s + Number(r.habilitados || 0), 0)
  const totalBloq = regs.reduce((s, r) => s + Number(r.bloqueados || 0), 0)
  const totalSS = regs.reduce((s, r) => s + Number(r.sin_servicio || 0), 0)
  const totalClientes = totalHab + totalBloq + totalSS

  const churnData = (mensual || []).slice(-12).map(c => ({
    mes: c.mes,
    altas: Number(c.altas || 0),
    bajas: Number(c.bajas || 0),
    neto: Number(c.neto || 0),
  }))
  const lastChurn = churnData[churnData.length - 1]

  // Planes: campo plan_grupo y cantidad del vw_clientes_por_plan
  const planData = (planes || [])
    .filter(p => p.estado === 'Habilitado')
    .map(p => ({ name: p.plan_grupo, value: Number(p.cantidad || 0) }))
    .sort((a, b) => b.value - a.value).slice(0, 6)

  const estadoData = [
    { name: 'Habilitado', value: totalHab, color: C.grn },
    { name: 'Bloqueado', value: totalBloq, color: C.amb },
    { name: 'Sin servicio', value: totalSS, color: C.red },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Habilitados" value={fmtNum(totalHab)} icon="✅" sub={`${totalClientes > 0 ? (totalHab / totalClientes * 100).toFixed(1) : 0}%`} />
        <KpiCard title="Bloqueados" value={fmtNum(totalBloq)} icon="🔒" sub="En recupero" />
        <KpiCard title="Sin servicio" value={fmtNum(totalSS)} icon="❌" sub="Churn acumulado" />
        <KpiCard title="Neto último mes" value={`${lastChurn?.neto > 0 ? '+' : ''}${lastChurn?.neto || 0}`} icon="🆕" sub={`Altas: ${lastChurn?.altas || 0}`} />
      </div>

      {churnData.length > 0 && (
        <ChartCard title="Altas vs Bajas vs Neto" height={340} full>
          <ComposedChart data={churnData}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 11 }} />
            <YAxis tick={{ fill: C.tx2, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip formatter={v => v?.toLocaleString()} />} />
            <ReferenceLine y={0} stroke={C.tx2} strokeDasharray="3 3" />
            <Bar dataKey="altas" name="Altas" fill={C.grn} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Bar dataKey="bajas" name="Bajas" fill={C.red} radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line dataKey="neto" name="Neto" stroke={C.amb} strokeWidth={3} dot={{ r: 4, fill: C.amb }} />
            <Legend />
          </ComposedChart>
        </ChartCard>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <ChartCard title="Por estado" height={260}>
          <PieChart>
            <Pie data={estadoData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value"
              label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={{ stroke: C.tx2 }}>
              {estadoData.map((e, i) => <Cell key={i} fill={e.color} />)}
            </Pie>
            <Tooltip formatter={v => fmtNum(v)} />
          </PieChart>
        </ChartCard>

        <ChartCard title="Por plan (habilitados)" height={260}>
          <PieChart>
            <Pie data={planData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value" nameKey="name"
              label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`} labelLine={{ stroke: C.tx2 }}>
              {planData.map((_, i) => <Cell key={i} fill={PC[i]} />)}
            </Pie>
            <Tooltip formatter={v => fmtNum(v)} />
          </PieChart>
        </ChartCard>
      </div>

      <div style={{ marginTop: 16 }}>
        <ChartCard title="Clientes por zona" height="auto">
          <div>
            {regs.map((z, i) => {
              const h = Number(z.habilitados || 0), b = Number(z.bloqueados || 0), ss = Number(z.sin_servicio || 0)
              const total = h + b + ss
              if (total === 0) return null
              return (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{z.zona}</span>
                    <span style={{ fontSize: 12, color: C.tx2, fontFamily: 'monospace' }}>{fmtNum(total)}</span>
                  </div>
                  <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: C.bg }}>
                    <div style={{ width: `${h / total * 100}%`, background: C.grn, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{h}</div>
                    {b > 3 && <div style={{ width: `${b / total * 100}%`, background: C.amb, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{b}</div>}
                    <div style={{ width: `${ss / total * 100}%`, background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff' }}>{ss}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
