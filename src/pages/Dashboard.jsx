import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip } from '../components/UI'
import { useMultiQuery } from '../lib/hooks'
import { getCobranzaMensual, getFacturacionMensual, getEgresosNetMensual, getClientesPorRegion } from '../lib/queries'
import { fmt, fmtN, ml, delta } from '../lib/formatters'
import { COLORS as C } from '../lib/constants'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'

export default function Dashboard() {
  const { cobranza, facturacion, egresos, regiones, loading, error, retry } = useMultiQuery({
    cobranza: getCobranzaMensual,
    facturacion: getFacturacionMensual,
    egresos: getEgresosNetMensual,
    regiones: getClientesPorRegion,
  })

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const cobr = cobranza || []
  const fact = facturacion || []
  const eg = egresos || []
  const last = cobr[cobr.length - 1]
  const prev = cobr[cobr.length - 2]
  const lastF = fact[fact.length - 1]

  const monthly = cobr.slice(-12).map(c => {
    const f = fact.find(x => x.mes === c.mes)
    const eO = eg.filter(x => x.periodo === c.mes && x.tipo_egreso === 'OPEX').reduce((s, x) => s + Number(x.total || 0), 0)
    const eC = eg.filter(x => x.periodo === c.mes && x.tipo_egreso === 'CAPEX').reduce((s, x) => s + Number(x.total || 0), 0)
    return { mes: c.mes, cobrado: Number(c.cobrado || 0), facturado: Number(f?.facturado || 0), opex: eO, capex: eC }
  })

  const totalHab = (regiones || []).reduce((s, r) => s + Number(r.habilitados || 0), 0)
  const arpu = totalHab > 0 ? Math.round(Number(last?.cobrado || 0) / totalHab) : 0

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Ingresos" value={fmt(last?.cobrado)} icon="💵" sub={ml(last?.mes)} delta={delta(last?.cobrado, prev?.cobrado)} />
        <KpiCard title="Facturado" value={fmt(lastF?.facturado)} icon="📄" sub={ml(lastF?.mes)} />
        <KpiCard title="ARPU" value={fmtN(arpu)} icon="📈" sub="Ingreso / Habilitados" />
        <KpiCard title="Habilitados" value={totalHab.toLocaleString()} icon="👥" />
      </div>

      <ChartCard title="Facturado vs Ingresos — últimos 12 meses" height={340} full>
        <ComposedChart data={monthly}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
          <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 11 }} />
          <YAxis tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="facturado" name="Facturado" fill={C.pri} radius={[4, 4, 0, 0]} opacity={0.85} />
          <Bar dataKey="cobrado" name="Ingresos" fill={C.grn} radius={[4, 4, 0, 0]} opacity={0.85} />
          <Legend />
        </ComposedChart>
      </ChartCard>

      {monthly.some(m => m.opex > 0) && (
        <div style={{ marginTop: 16 }}>
          <ChartCard title="Break-even — Ingresos vs Egresos" height={300} full>
            <ComposedChart data={monthly.filter(m => m.opex > 0)}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
              <XAxis dataKey="mes" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 11 }} />
              <YAxis tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="opex" name="OPEX" fill={C.amb} stackId="eg" opacity={0.85} />
              <Bar dataKey="capex" name="CAPEX" fill={C.red} stackId="eg" radius={[4, 4, 0, 0]} opacity={0.85} />
              <Line dataKey="cobrado" name="Ingresos" stroke={C.grn} strokeWidth={3} dot={{ r: 4, fill: C.grn }} />
              <Legend />
            </ComposedChart>
          </ChartCard>
        </div>
      )}
    </div>
  )
}
