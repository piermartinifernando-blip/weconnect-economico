import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip } from '../components/UI'
import { useMultiQuery } from '../lib/hooks'
import { getCobranzaMensual, getFacturacionMensual, getCobranzaCanales } from '../lib/queries'
import { fmt, fmtN, ml, delta } from '../lib/formatters'
import { COLORS as C, PALETTE as PC } from '../lib/constants'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ComposedChart, Line } from 'recharts'

export default function Ingresos() {
  const { cobranza, facturacion, canales, loading, error, retry } = useMultiQuery({
    cobranza: getCobranzaMensual,
    facturacion: getFacturacionMensual,
    canales: getCobranzaCanales,
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const cobr = cobranza || []
  const fact = facturacion || []
  const last = cobr[cobr.length - 1]
  const prev = cobr[cobr.length - 2]
  const lastF = fact[fact.length - 1]
  const prevF = fact[fact.length - 2]

  const monthly = cobr.slice(-12).map(c => {
    const f = fact.find(x => x.mes === c.mes)
    const cob = Number(c.cobrado || 0)
    const fac = Number(f?.facturado || 0)
    return { mes: c.mes, cobrado: cob, facturado: fac, eficiencia: fac > 0 ? Math.round(cob / fac * 100) : 0 }
  })

  // Agrupar canales por nombre sumando todos los meses
  const canalAgg = {}
  ;(canales || []).forEach(c => {
    const k = c.canal || 'Otro'
    canalAgg[k] = (canalAgg[k] || 0) + Number(c.cobrado || 0)
  })
  const canalData = Object.entries(canalAgg).map(([canal, total]) => ({ canal, total })).sort((a, b) => b.total - a.total).slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Ingresos" value={fmt(last?.cobrado)} icon="💵" sub={ml(last?.mes)} delta={delta(last?.cobrado, prev?.cobrado)} />
        <KpiCard title="Facturado" value={fmt(lastF?.facturado)} icon="📄" sub={ml(lastF?.mes)} delta={delta(lastF?.facturado, prevF?.facturado)} />
        <KpiCard title="Eficiencia" value={`${monthly[monthly.length - 1]?.eficiencia || 0}%`} icon="🎯" sub="Cobrado / Facturado" />
        <KpiCard title="Meses" value={cobr.length.toString()} icon="📅" />
      </div>

      <ChartCard title="Facturado vs Ingresos vs Eficiencia" height={340} full>
        <ComposedChart data={monthly}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
          <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 11 }} />
          <YAxis tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 11 }} />
          <YAxis yAxisId="r" orientation="right" tickFormatter={v => `${v}%`} tick={{ fill: C.tx2, fontSize: 11 }} domain={[0, 200]} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="facturado" name="Facturado" fill={C.pri} radius={[4, 4, 0, 0]} opacity={0.85} />
          <Bar dataKey="cobrado" name="Ingresos" fill={C.grn} radius={[4, 4, 0, 0]} opacity={0.85} />
          <Line yAxisId="r" dataKey="eficiencia" name="Eficiencia %" stroke={C.amb} strokeWidth={2.5} dot={{ r: 3, fill: C.amb }} />
          <Legend />
        </ComposedChart>
      </ChartCard>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <ChartCard title="Ingresos por canal (acumulado)" height={320}>
          <BarChart data={canalData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis type="number" tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 10 }} />
            <YAxis type="category" dataKey="canal" width={130} tick={{ fill: C.tx2, fontSize: 11 }} />
            <Tooltip formatter={v => fmtN(v)} />
            <Bar dataKey="total" name="Total" fill={C.sec} radius={[0, 5, 5, 0]} />
          </BarChart>
        </ChartCard>

        <ChartCard title="Participación" height={320}>
          <PieChart>
            <Pie data={canalData.slice(0, 6)} cx="50%" cy="50%" outerRadius={100} innerRadius={55} dataKey="total" nameKey="canal"
              label={({ canal, percent }) => percent > 0.04 ? `${canal} ${Math.round(percent * 100)}%` : ''} labelLine={{ stroke: C.tx2 }}>
              {canalData.slice(0, 6).map((_, i) => <Cell key={i} fill={PC[i]} />)}
            </Pie>
            <Tooltip formatter={v => fmtN(v)} />
          </PieChart>
        </ChartCard>
      </div>
    </div>
  )
}
