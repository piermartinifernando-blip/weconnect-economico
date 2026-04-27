import { KpiCard, ChartCard, LoadingState, ErrorState, CustomTooltip, ProgressBar } from '../components/UI'
import { useQuery } from '../lib/hooks'
import { getPnL } from '../lib/queries'
import { fmt, fmtN, ml } from '../lib/formatters'
import { COLORS as C } from '../lib/constants'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts'

export default function PnL() {
  const { data, loading, error, retry } = useQuery(getPnL)

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={retry} />

  const pl = (data || []).map(p => ({
    ...p,
    ingresos: Number(p.ingresos || 0),
    opex: Number(p.opex || 0),
    capex: Number(p.capex || 0),
    egresos_total: Number(p.egresos_total || 0),
    resultado_operativo: Number(p.resultado_operativo || 0),
    resultado_neto: Number(p.resultado_neto || 0),
  }))

  const totI = pl.reduce((s, p) => s + p.ingresos, 0)
  const totO = pl.reduce((s, p) => s + p.opex, 0)
  const totC = pl.reduce((s, p) => s + p.capex, 0)
  const totR = pl.reduce((s, p) => s + p.resultado_neto, 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard title="Ingresos" value={fmt(totI)} icon="💵" color={C.grn} />
        <KpiCard title="OPEX" value={fmt(totO)} icon="💼" color={C.amb} />
        <KpiCard title="CAPEX" value={fmt(totC)} icon="🏗️" color={C.red} />
        <KpiCard title="Resultado neto" value={fmt(totR)} icon={totR >= 0 ? "✅" : "🔴"} color={totR >= 0 ? C.grn : C.red} />
      </div>

      {pl.length > 0 && (
        <ChartCard title="P&L mensual — Ingresos vs Egresos" height={340} full>
          <ComposedChart data={pl}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.brd} />
            <XAxis dataKey="periodo" tickFormatter={ml} tick={{ fill: C.tx2, fontSize: 11 }} />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: C.tx2, fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke={C.tx2} strokeDasharray="3 3" />
            <Bar dataKey="opex" name="OPEX" fill={C.amb} stackId="eg" opacity={0.85} />
            <Bar dataKey="capex" name="CAPEX" fill={C.red} stackId="eg" radius={[4, 4, 0, 0]} opacity={0.85} />
            <Line dataKey="ingresos" name="Ingresos" stroke={C.grn} strokeWidth={3} dot={{ r: 4, fill: C.grn }} />
            <Legend />
          </ComposedChart>
        </ChartCard>
      )}

      <div style={{ marginTop: 16 }}>
        <ChartCard title="Detalle mensual" height="auto" full>
          <div>
            {pl.map((p, i) => (
              <div key={i} style={{ marginBottom: 14, padding: 16, background: C.bg, borderRadius: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{ml(p.periodo)}</span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: p.resultado_neto >= 0 ? C.grn : C.red }}>{fmt(p.resultado_neto)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, fontSize: 12 }}>
                  <div style={{ padding: '10px 12px', background: C.sf, borderRadius: 8 }}>
                    <div style={{ color: C.tx2, marginBottom: 3 }}>Ingresos</div>
                    <div style={{ color: C.grn, fontWeight: 700, fontSize: 15 }}>{fmt(p.ingresos)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: C.sf, borderRadius: 8 }}>
                    <div style={{ color: C.tx2, marginBottom: 3 }}>OPEX</div>
                    <div style={{ color: C.amb, fontWeight: 700, fontSize: 15 }}>{fmt(p.opex)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: C.sf, borderRadius: 8 }}>
                    <div style={{ color: C.tx2, marginBottom: 3 }}>CAPEX</div>
                    <div style={{ color: C.red, fontWeight: 700, fontSize: 15 }}>{fmt(p.capex)}</div>
                  </div>
                  <div style={{ padding: '10px 12px', background: C.sf, borderRadius: 8 }}>
                    <div style={{ color: C.tx2, marginBottom: 3 }}>Res. operativo</div>
                    <div style={{ color: p.resultado_operativo >= 0 ? C.grn : C.red, fontWeight: 700, fontSize: 15 }}>{fmt(p.resultado_operativo)}</div>
                  </div>
                </div>
                <div style={{ marginTop: 10 }}>
                  <ProgressBar value={p.ingresos} max={p.egresos_total} color={C.grn} height={8} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.tx2, marginTop: 4 }}>
                    <span>Cobertura: {p.egresos_total > 0 ? Math.round(p.ingresos / p.egresos_total * 100) : 0}%</span>
                    <span>Déficit: {fmt(Math.abs(p.resultado_neto))}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
