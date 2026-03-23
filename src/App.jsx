import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from "recharts";

/* ─── TOKENS ────────────────────────────────────────────────────── */
const C = {
  bg:"#0f1117", surf:"#161b27", card:"#1c2333", cardHi:"#222b3d",
  b1:"#2a3650", b2:"#334266",
  cyan:"#38bdf8", green:"#34d399", red:"#f87171", amber:"#fbbf24",
  purple:"#c084fc", blue:"#60a5fa",
  txt:"#f1f5f9", sub:"#94a3b8", muted:"#64748b",
  mono:"'JetBrains Mono', monospace", sans:"'Outfit', sans-serif",
};

/* ─── DATOS ESTÁTICOS (no vienen de Supabase) ───────────────────── */
const CLIENTES_STAT = {
  habilitados: 4064, bloqueados: 351, sinServicio: 1545, total: 5960,
  porPlan: [
    { plan:"100 MB", cantidad:2130, color:C.cyan   },
    { plan:"300 MB", cantidad:1345, color:C.green  },
    { plan:"50 MB",  cantidad:369,  color:C.purple },
    { plan:"600 MB", cantidad:110,  color:C.amber  },
    { plan:"30 MB",  cantidad:106,  color:C.blue   },
  ],
  porCiudad: [
    { ciudad:"Almirante Brown",    cantidad:3128, deuda:62.43, deudaVenc:55.91 },
    { ciudad:"Capitan Sarmiento",  cantidad:1740, deuda:12.51, deudaVenc:12.24 },
    { ciudad:"Ministro Rivadavia", cantidad:401,  deuda:4.39,  deudaVenc:0.91  },
    { ciudad:"Glew",               cantidad:395,  deuda:5.19,  deudaVenc:1.42  },
    { ciudad:"Longchamps",         cantidad:152,  deuda:1.40,  deudaVenc:0.35  },
    { ciudad:"Florencio Varela",   cantidad:93,   deuda:1.55,  deudaVenc:1.11  },
  ],
  mediosPago: [
    { medio:"Caja",            cantidad:5108, pct:85.7 },
    { medio:"Visa/Mastercard", cantidad:456,  pct:7.7  },
    { medio:"Cobranzas auto",  cantidad:330,  pct:5.5  },
    { medio:"Transferencia",   cantidad:51,   pct:0.9  },
  ],
};

const CANALES = [
  { mes:"Oct 25", MP:60.56, SIRO:0.00, Tarjetas:6.98, "Pago Fácil":4.66, Caja:3.72, Transfer:2.16 },
  { mes:"Nov 25", MP:66.35, SIRO:0.42, Tarjetas:7.78, "Pago Fácil":5.87, Caja:3.28, Transfer:1.69 },
  { mes:"Dic 25", MP:74.84, SIRO:0.81, Tarjetas:7.33, "Pago Fácil":4.95, Caja:3.56, Transfer:1.37 },
  { mes:"Ene 26", MP:66.89, SIRO:1.33, Tarjetas:8.93, "Pago Fácil":4.65, Caja:3.71, Transfer:10.47 },
  { mes:"Feb 26", MP:71.75, SIRO:5.45, Tarjetas:8.10, "Pago Fácil":4.05, Caja:3.37, Transfer:2.51 },
  { mes:"Mar 26", MP:65.38, SIRO:9.57, Tarjetas:8.71, "Pago Fácil":4.85, Caja:3.80, Transfer:1.72 },
];

const MORA = {
  deudaTotal:88.02, deudaVencida:72.05, morosos:1545,
  porCiudad: [
    { ciudad:"Almirante Brown",   deudaVenc:55.91, pct:77.6 },
    { ciudad:"Cap. Sarmiento",    deudaVenc:12.24, pct:17.0 },
    { ciudad:"Glew",              deudaVenc:1.42,  pct:2.0  },
    { ciudad:"Florencio Varela",  deudaVenc:1.11,  pct:1.5  },
    { ciudad:"Minist. Rivadavia", deudaVenc:0.91,  pct:1.3  },
    { ciudad:"Longchamps",        deudaVenc:0.35,  pct:0.5  },
  ],
};

const CHURN = {
  mensual: [
    { mes:"Sep 24", pct:2.1 }, { mes:"Oct 24", pct:2.3 },
    { mes:"Nov 24", pct:2.0 }, { mes:"Dic 24", pct:1.9 },
    { mes:"Ene 25", pct:2.2 }, { mes:"Feb 25", pct:2.4 },
    { mes:"Mar 25", pct:2.6 }, { mes:"Abr 25", pct:2.8 },
    { mes:"May 25", pct:2.7 }, { mes:"Jun 25", pct:2.9 },
    { mes:"Jul 25", pct:3.1 }, { mes:"Ago 25", pct:3.0 },
    { mes:"Sep 25", pct:2.9 }, { mes:"Oct 25", pct:2.8 },
    { mes:"Nov 25", pct:2.6 }, { mes:"Dic 25", pct:2.7 },
    { mes:"Ene 26", pct:2.5 }, { mes:"Feb 26", pct:2.4 },
    { mes:"Mar 26", pct:2.3 },
  ],
  cohortes: [
    { cohorte:"Ago-Dic 24 (+18m)",  pct:35.4, inactivos:605,  color:C.red   },
    { cohorte:"Q1-Q2 25 (9-15m)",   pct:34.6, inactivos:526,  color:C.red   },
    { cohorte:"Q3 25 (6-9m)",       pct:33.2, inactivos:285,  color:C.amber },
    { cohorte:"Q4 25 (3-6m)",       pct:18.1, inactivos:150,  color:C.amber },
    { cohorte:"2026 (0-3m)",        pct:10.6, inactivos:87,   color:C.green },
  ],
  causas: [
    { causa:"Mora pasiva / olvido",  pct:45, accion:"IA cobranza D5/15/25",  color:C.red    },
    { causa:"Soporte sin respuesta", pct:22, accion:"Bot soporte 24/7",      color:C.amber  },
    { causa:"Onboarding frío <90d",  pct:18, accion:"Secuencia D+2/30/90",   color:C.amber  },
    { causa:"Competencia / precio",  pct:12, accion:"Objeciones onboarding", color:C.purple },
    { causa:"Mudanza",               pct:3,  accion:"No prevenible",          color:C.muted  },
  ],
};

/* ─── HELPERS ────────────────────────────────────────────────────── */
const fM  = n => `$${Math.abs(n).toFixed(1)}M`;
const fAR = n => `$${Math.abs(Math.round(n)).toLocaleString("es-AR")}`;

/* ─── TOOLTIP ────────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.card, border:`1px solid ${C.b2}`, borderRadius:8, padding:"10px 14px", boxShadow:"0 8px 32px #00000080" }}>
      <p style={{ color:C.sub, fontSize:10, margin:"0 0 6px", textTransform:"uppercase" }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||C.cyan, fontSize:12, margin:"2px 0", fontFamily:C.mono, fontWeight:600 }}>
          {p.name}: {typeof p.value==="number" ? fM(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── KPI ────────────────────────────────────────────────────────── */
const KPI = ({ label, value, sub, ok=true, accent=C.cyan }) => (
  <div style={{
    background:C.card, border:`1px solid ${C.b1}`, borderRadius:12,
    padding:"18px 20px", position:"relative", overflow:"hidden"
  }}>
    <div style={{ position:"absolute", top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,${accent},transparent)` }}/>
    <p style={{ color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:8 }}>{label}</p>
    <p style={{ color:C.txt, fontSize:24, fontWeight:700, fontFamily:C.mono, margin:"0 0 5px", letterSpacing:"-0.02em" }}>{value}</p>
    {sub && <p style={{ color:ok?C.green:C.red, fontSize:11, margin:0, fontWeight:500 }}>{sub}</p>}
  </div>
);

/* ─── CARD ───────────────────────────────────────────────────────── */
const Card = ({ title, children, style={} }) => (
  <div style={{ background:C.card, border:`1px solid ${C.b1}`, borderRadius:12, padding:"20px 22px", ...style }}>
    <p style={{ color:C.sub, fontSize:10, textTransform:"uppercase", letterSpacing:"0.1em", margin:"0 0 16px", fontWeight:600 }}>{title}</p>
    {children}
  </div>
);

/* ─── TABS ───────────────────────────────────────────────────────── */
const TABS = [
  { id:"negocio",   icon:"💰", label:"Negocio"    },
  { id:"costos",    icon:"📊", label:"Costos ISP"  },
  { id:"clientes",  icon:"👥", label:"Clientes"   },
  { id:"mora",      icon:"⚠️", label:"Mora"       },
  { id:"breakeven", icon:"🎯", label:"Break-even" },
  { id:"churn",     icon:"📉", label:"Churn"      },
];

/* ═══ MAIN ═══════════════════════════════════════════════════════ */
export default function App() {
  const [tab, setTab]           = useState("negocio");
  const [cobranza, setCobranza] = useState([]);
  const [egresos, setEgresos]   = useState([]);
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading]   = useState(true);

  /* ── CARGAR DATOS DE SUPABASE ── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: cob }, { data: egr }, { data: cli }] = await Promise.all([
        supabase.from("cobranza").select("*").order("id"),
        supabase.from("egresos").select("*").order("id"),
        supabase.from("clientes_resumen").select("*").order("id"),
      ]);
      if (cob) setCobranza(cob);
      if (egr) setEgresos(egr);
      if (cli) setClientes(cli);
      setLoading(false);
    }
    load();
  }, []);

  /* ── MOTOR DE CÁLCULO ── */
  const motor = useMemo(() => {
    if (!cobranza.length || !egresos.length) return null;

    const ult  = cobranza[cobranza.length - 1];
    const ant  = cobranza[cobranza.length - 2];
    const varC = ant ? (((ult.cobrado - ant.cobrado) / ant.cobrado) * 100).toFixed(1) : 0;

    const ultEgr = egresos[egresos.length - 1];

    // P&L cruzado
    const pl = egresos.map(e => {
      const c = cobranza.find(x => x.mes === e.mes) || { cobrado: 0 };
      return {
        mes: e.mes,
        cobrado: c.cobrado,
        opex: e.opex,
        capex: e.capex,
        resultado: +(c.cobrado - e.opex - e.capex).toFixed(1),
      };
    });

    // Break-even
    const ARPU     = 27425;
    const COSTO_V  = 7630;
    const churnR   = 0.025;
    const cliNec   = Math.ceil((ultEgr.opex * 1e6) / ARPU);
    const gap      = cliNec - CLIENTES_STAT.habilitados;

    const mesesBE  = ["Abr 26","May 26","Jun 26","Jul 26","Ago 26","Sep 26","Oct 26","Nov 26","Dic 26","Ene 27","Feb 27","Mar 27"];
    let cliSin = CLIENTES_STAT.habilitados;
    let cliCon = CLIENTES_STAT.habilitados;
    const proyeccion = mesesBE.map(mes => {
      cliSin = Math.round(cliSin * (1 - churnR) + 195);
      cliCon = Math.round(cliCon * (1 - churnR) + 420);
      return {
        mes,
        sinPlan: +((cliSin * ARPU / 1e6) - ultEgr.opex).toFixed(1),
        conPlan: +((cliCon * ARPU / 1e6) - ultEgr.opex).toFixed(1),
        cliSin, cliCon,
      };
    });

    const beSin = proyeccion.find(p => p.sinPlan >= 0)?.mes || "+12m";
    const beCon = proyeccion.find(p => p.conPlan >= 0)?.mes || "+12m";

    return { ult, ant, varC, pl, ultEgr, cliNec, gap, proyeccion, beSin, beCon, ARPU, COSTO_V };
  }, [cobranza, egresos]);

  if (loading) return (
    <div style={{ background:C.bg, minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:C.sans }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:40, height:40, border:`3px solid ${C.b1}`, borderTop:`3px solid ${C.cyan}`, borderRadius:"50%", margin:"0 auto 16px", animation:"spin 1s linear infinite" }}/>
        <p style={{ color:C.sub, fontSize:13 }}>Cargando datos desde Supabase...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background:C.bg, minHeight:"100vh", fontFamily:C.sans, color:C.txt, display:"flex" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:${C.b1};border-radius:4px}
      `}</style>

      {/* SIDEBAR */}
      <div style={{ position:"fixed", top:0, left:0, bottom:0, width:205, background:C.surf, borderRight:`1px solid ${C.b1}`, display:"flex", flexDirection:"column", zIndex:50 }}>
        <div style={{ padding:"18px 16px", borderBottom:`1px solid ${C.b1}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:`linear-gradient(135deg,${C.cyan},${C.green})`, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, color:C.bg, fontSize:14 }}>W</div>
            <div>
              <p style={{ fontSize:13, fontWeight:800 }}>WeConnect</p>
              <p style={{ fontSize:9, color:C.muted }}>Netsharing SA</p>
            </div>
          </div>
          <div style={{ background:C.card, borderRadius:7, padding:"7px 10px", border:`1px solid ${C.b1}` }}>
            <p style={{ fontSize:9, color:C.muted }}>DATOS AL</p>
            <p style={{ fontSize:11, color:C.cyan, fontFamily:C.mono, fontWeight:600 }}>
              {new Date().toLocaleDateString("es-AR",{day:"2-digit",month:"short",year:"numeric"})}
            </p>
          </div>
        </div>

        <nav style={{ padding:"10px 8px", flex:1 }}>
          {TABS.map(t => {
            const active = tab===t.id;
            return (
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                width:"100%", display:"flex", alignItems:"center", gap:8,
                padding:"9px 10px", borderRadius:8, border:"none", cursor:"pointer",
                background: active?`${C.cyan}15`:"transparent",
                color: active?C.cyan:C.sub, fontSize:12, fontWeight:active?600:400,
                marginBottom:2, transition:"all 0.15s", fontFamily:C.sans,
                borderLeft: active?`2px solid ${C.cyan}`:"2px solid transparent",
              }}>
                <span>{t.icon}</span>{t.label}
              </button>
            );
          })}
        </nav>

        <div style={{ padding:"12px 16px", borderTop:`1px solid ${C.b1}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
            <div style={{ width:6, height:6, borderRadius:"50%", background:C.green }}/>
            <span style={{ fontSize:10, color:C.green, fontWeight:600 }}>Supabase · en vivo</span>
          </div>
          <p style={{ fontSize:9, color:C.muted }}>{CLIENTES_STAT.habilitados.toLocaleString("es-AR")} clientes activos</p>
          <p style={{ fontSize:9, color:C.muted }}>Deuda: {fM(MORA.deudaTotal)}</p>
        </div>
      </div>

      {/* CONTENIDO */}
      <div style={{ marginLeft:205, padding:"22px 26px", flex:1 }}>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22 }}>
          <div>
            <h1 style={{ fontSize:18, fontWeight:800, letterSpacing:"-0.02em" }}>
              {TABS.find(t=>t.id===tab)?.icon} {TABS.find(t=>t.id===tab)?.label}
            </h1>
            <p style={{ fontSize:11, color:C.muted, marginTop:2 }}>WeConnect · Netsharing SA · datos reales ISPCube</p>
          </div>
          {motor && (
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ background:`${C.red}15`, border:`1px solid ${C.red}30`, borderRadius:8, padding:"7px 14px" }}>
                <p style={{ fontSize:9, color:C.muted }}>Resultado Feb 26</p>
                <p style={{ fontSize:13, fontFamily:C.mono, fontWeight:700, color:C.red }}>{fM(motor.pl[motor.pl.length-1]?.resultado)}</p>
              </div>
              <div style={{ background:`${C.amber}15`, border:`1px solid ${C.amber}30`, borderRadius:8, padding:"7px 14px" }}>
                <p style={{ fontSize:9, color:C.muted }}>Clientes para BE</p>
                <p style={{ fontSize:13, fontFamily:C.mono, fontWeight:700, color:C.amber }}>{motor.cliNec.toLocaleString("es-AR")}</p>
              </div>
              <div style={{ background:`${C.cyan}15`, border:`1px solid ${C.cyan}30`, borderRadius:8, padding:"7px 14px" }}>
                <p style={{ fontSize:9, color:C.muted }}>BE con plan</p>
                <p style={{ fontSize:13, fontFamily:C.mono, fontWeight:700, color:C.cyan }}>{motor.beCon}</p>
              </div>
            </div>
          )}
        </div>

        {/* ═══ NEGOCIO ═══════════════════════════════════════════════ */}
        {tab==="negocio" && motor && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <KPI label="Cobrado Mar 26 (parcial)" value={fM(motor.ult.cobrado)}   sub="Parcial al 23/3"              accent={C.cyan}   ok={true}/>
              <KPI label="Cobrado Feb 26"           value={fM(cobranza[cobranza.length-2]?.cobrado||0)} sub={`${motor.varC>0?"▲":"▼"} ${Math.abs(motor.varC)}% vs mes ant.`} accent={C.green} ok={parseFloat(motor.varC)>0}/>
              <KPI label="Máximo histórico"         value={fM(Math.max(...cobranza.map(c=>c.cobrado)))} sub="Nov 25" accent={C.purple} ok={true}/>
              <KPI label="SIRO Mar 26"              value={fM(9.57)}  sub="▲ desde $0 oct 25"  accent={C.green}  ok={true}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>
              <Card title="Evolución de cobranza — histórico real ($M ARS)">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={cobranza}>
                    <defs>
                      <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.cyan} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={C.cyan} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.b1}/>
                    <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:9,fill:C.muted}} interval={2}/>
                    <YAxis stroke={C.muted} tick={{fontSize:9,fill:C.muted}} tickFormatter={v=>`$${v}M`}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="cobrado" name="Cobrado" stroke={C.cyan} fill="url(#gC)" strokeWidth={2.5} dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
                <div style={{ marginTop:10, padding:"8px 12px", background:`${C.green}10`, border:`1px solid ${C.green}25`, borderRadius:8 }}>
                  <p style={{ fontSize:11, color:C.green, fontWeight:600 }}>✦ Crecimiento sostenido: $5.66M (ago 24) → $94M (mar 26)</p>
                  <p style={{ fontSize:10, color:C.sub, marginTop:2 }}>SIRO creció de $0 (oct 25) a $9.57M (mar 26) en 6 meses</p>
                </div>
              </Card>

              <Card title="Canales de cobro — Mar 26">
                {[
                  { canal:"Mercado Pago", monto:65.38, pct:69.5, color:C.cyan   },
                  { canal:"SIRO ▲",       monto:9.57,  pct:10.2, color:C.green  },
                  { canal:"Tarjetas",     monto:8.71,  pct:9.3,  color:C.purple },
                  { canal:"Pago Fácil",   monto:4.85,  pct:5.2,  color:C.amber  },
                  { canal:"Caja",         monto:3.80,  pct:4.0,  color:C.muted  },
                  { canal:"Transferencia",monto:1.72,  pct:1.8,  color:C.blue   },
                ].map((c,i) => (
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, color:C.sub }}>{c.canal}</span>
                      <div style={{ display:"flex", gap:8 }}>
                        <span style={{ fontSize:10, color:C.muted, fontFamily:C.mono }}>{fM(c.monto)}</span>
                        <span style={{ fontSize:11, color:c.color, fontFamily:C.mono, fontWeight:700 }}>{c.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height:4, background:C.b1, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${c.pct}%`, height:"100%", background:c.color, borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, padding:"8px 10px", background:`${C.amber}10`, borderRadius:8, border:`1px solid ${C.amber}25` }}>
                  <p style={{ fontSize:10, color:C.amber, fontWeight:600 }}>⚠ MP = 69.5% · riesgo concentración</p>
                  <p style={{ fontSize:10, color:C.sub, marginTop:2 }}>Meta: llevar SIRO al 40% con incentivo 5%</p>
                </div>
              </Card>
            </div>

            <Card title="Evolución canales de cobro — últimos 6 meses ($M)">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={CANALES}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.b1}/>
                  <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:11,fill:C.muted}}/>
                  <YAxis stroke={C.muted} tick={{fontSize:10,fill:C.muted}} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend formatter={v=><span style={{color:C.sub,fontSize:11}}>{v}</span>}/>
                  <Bar dataKey="MP"         name="Mercado Pago"  stackId="a" fill={C.cyan}/>
                  <Bar dataKey="SIRO"       name="SIRO"          stackId="a" fill={C.green}/>
                  <Bar dataKey="Tarjetas"   name="Tarjetas"      stackId="a" fill={C.purple}/>
                  <Bar dataKey="Pago Fácil" name="Pago Fácil"    stackId="a" fill={C.amber}/>
                  <Bar dataKey="Caja"       name="Caja"          stackId="a" fill={C.muted}/>
                  <Bar dataKey="Transfer"   name="Transferencia" stackId="a" fill={C.blue} radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ═══ COSTOS ════════════════════════════════════════════════ */}
        {tab==="costos" && motor && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <KPI label="OPEX Feb 26"      value={fM(motor.ultEgr.opex)}   sub="Sin CAPEX"              accent={C.red}    ok={false}/>
              <KPI label="CAPEX Feb 26"     value={fM(motor.ultEgr.capex)}  sub="Construcción Etapa I"   accent={C.amber}  ok={false}/>
              <KPI label="Resultado Feb 26" value={fM(motor.pl[motor.pl.length-1]?.resultado)} sub="Déficit total" accent={C.red} ok={false}/>
              <KPI label="RRHH Feb 26"      value={fM(67.0)}                sub="44.9% del OPEX"         accent={C.purple} ok={false}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
              <Card title="P&L mensual real — cobrado vs OPEX vs CAPEX ($M ARS)">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={motor.pl} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.b1}/>
                    <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:10,fill:C.muted}}/>
                    <YAxis stroke={C.muted} tick={{fontSize:10,fill:C.muted}} tickFormatter={v=>`$${v}M`}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{color:C.sub,fontSize:11}}>{v}</span>}/>
                    <Bar dataKey="cobrado"  name="Cobrado" fill={C.cyan}  radius={[3,3,0,0]}/>
                    <Bar dataKey="opex"     name="OPEX"    fill={C.red}   radius={[3,3,0,0]}/>
                    <Bar dataKey="capex"    name="CAPEX"   fill={C.amber} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Estructura OPEX — Feb 26">
                {[
                  { cat:"RRHH",             monto:67.00, color:C.red    },
                  { cat:"Equipamiento",     monto:12.24, color:C.purple },
                  { cat:"Alquileres",       monto:10.00, color:C.blue   },
                  { cat:"Com. instalación", monto:6.35,  color:C.cyan   },
                  { cat:"Serv. oficina",    monto:5.94,  color:C.muted  },
                  { cat:"Dodolink",         monto:4.97,  color:C.green  },
                  { cat:"Impuestos",        monto:3.61,  color:C.amber  },
                ].map((o,i) => (
                  <div key={i} style={{ marginBottom:9 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                      <span style={{ fontSize:10, color:C.sub }}>{o.cat}</span>
                      <span style={{ fontSize:10, color:o.color, fontFamily:C.mono, fontWeight:600 }}>{fM(o.monto)}</span>
                    </div>
                    <div style={{ height:3, background:C.b1, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${(o.monto/67)*100}%`, height:"100%", background:o.color, borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            <Card title="Tabla P&L detallada — 5 meses reales">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ background:C.surf }}>
                    {["Mes","Cobrado","OPEX","CAPEX","Resultado","Ratio"].map(h=>(
                      <th key={h} style={{ padding:"10px 14px", textAlign:h==="Mes"?"left":"right", color:C.muted, fontSize:10, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {motor.pl.map((r,i)=>(
                    <tr key={i} style={{ borderTop:`1px solid ${C.b1}` }}>
                      <td style={{ padding:"10px 14px", color:C.txt, fontWeight:600 }}>{r.mes}</td>
                      <td style={{ padding:"10px 14px", textAlign:"right", color:C.cyan,  fontFamily:C.mono, fontWeight:600 }}>{fM(r.cobrado)}</td>
                      <td style={{ padding:"10px 14px", textAlign:"right", color:C.red,   fontFamily:C.mono }}>{fM(r.opex)}</td>
                      <td style={{ padding:"10px 14px", textAlign:"right", color:C.amber, fontFamily:C.mono }}>{r.capex>0?fM(r.capex):"—"}</td>
                      <td style={{ padding:"10px 14px", textAlign:"right", fontFamily:C.mono, fontWeight:700, color:r.resultado>=0?C.green:C.red }}>
                        {r.resultado>=0?"+":""}{fM(r.resultado)}
                      </td>
                      <td style={{ padding:"10px 14px", textAlign:"right", color:C.sub, fontFamily:C.mono, fontSize:11 }}>
                        {r.cobrado>0?`${(r.opex/r.cobrado).toFixed(2)}×`:"—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ═══ CLIENTES ══════════════════════════════════════════════ */}
        {tab==="clientes" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:12 }}>
              <KPI label="Total padrón"   value="5.960"  sub="Histórico total"     accent={C.cyan}   ok={true}/>
              <KPI label="Habilitados"    value="4.064"  sub="68% del padrón"      accent={C.green}  ok={true}/>
              <KPI label="Bloqueados"     value="351"    sub="5.9% · riesgo churn" accent={C.amber}  ok={false}/>
              <KPI label="Sin servicio"   value="1.545"  sub="25.9% · inactivos"   accent={C.red}    ok={false}/>
              <KPI label="Altas Ene 26"   value="257"    sub="Mejor mes reciente"  accent={C.purple} ok={true}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
              <Card title="Altas y bajas por mes — últimos 6 meses">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={clientes} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.b1}/>
                    <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:11,fill:C.muted}}/>
                    <YAxis stroke={C.muted} tick={{fontSize:10,fill:C.muted}}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{color:C.sub,fontSize:11}}>{v}</span>}/>
                    <Bar dataKey="altas" name="Altas" fill={C.green} radius={[3,3,0,0]}/>
                    <Bar dataKey="bajas" name="Bajas" fill={C.red}   radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Distribución por plan (activos)">
                {CLIENTES_STAT.porPlan.map((p,i)=>(
                  <div key={i} style={{ marginBottom:10 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:11, color:C.sub }}>{p.plan}</span>
                      <div style={{ display:"flex", gap:8 }}>
                        <span style={{ fontSize:10, color:C.muted, fontFamily:C.mono }}>{p.cantidad.toLocaleString("es-AR")}</span>
                        <span style={{ fontSize:11, color:p.color, fontFamily:C.mono, fontWeight:700 }}>
                          {((p.cantidad/4064)*100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div style={{ height:4, background:C.b1, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${(p.cantidad/2130)*100}%`, height:"100%", background:p.color, borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, padding:"8px 10px", background:`${C.cyan}10`, borderRadius:8, border:`1px solid ${C.cyan}25` }}>
                  <p style={{ fontSize:10, color:C.cyan, fontWeight:600 }}>Upsell: 475 cli 30/50 MB → 100 MB</p>
                  <p style={{ fontSize:10, color:C.sub, marginTop:2 }}>Potencial +$13M/mes aprox.</p>
                </div>
              </Card>
            </div>

            <Card title="Distribución geográfica y mora por ciudad">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
                {CLIENTES_STAT.porCiudad.map((c,i)=>{
                  const moraPct = ((c.deudaVenc/c.deuda)*100).toFixed(0);
                  const col = c.deudaVenc>10?C.red:c.deudaVenc>3?C.amber:C.green;
                  return (
                    <div key={i} style={{ background:C.surf, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.b1}` }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                        <p style={{ fontSize:11, fontWeight:600 }}>{c.ciudad}</p>
                        <span style={{ background:`${col}20`, color:col, padding:"1px 7px", borderRadius:20, fontSize:9, fontWeight:700 }}>{moraPct}% mora</span>
                      </div>
                      <p style={{ fontSize:18, fontFamily:C.mono, fontWeight:700, color:C.cyan }}>{c.cantidad.toLocaleString("es-AR")}</p>
                      <p style={{ fontSize:9, color:C.muted, marginTop:4 }}>Deuda: {fM(c.deuda)} · Venc: {fM(c.deudaVenc)}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ MORA ══════════════════════════════════════════════════ */}
        {tab==="mora" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <KPI label="Deuda total"        value={fM(MORA.deudaTotal)}   sub="Total cartera"         accent={C.red}   ok={false}/>
              <KPI label="Deuda vencida"      value={fM(MORA.deudaVencida)} sub="81.8% del total"       accent={C.red}   ok={false}/>
              <KPI label="Clientes inactivos" value="1.545"                 sub="Sin servicio · 25.9%"  accent={C.amber} ok={false}/>
              <KPI label="Deuda prom/moroso"  value={fAR(MORA.deudaVencida*1e6/MORA.morosos)} sub="ARS por moroso" accent={C.amber} ok={false}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14 }}>
              <Card title="Deuda vencida por ciudad ($M ARS)">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={MORA.porCiudad} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.b1} horizontal={false}/>
                    <XAxis type="number" stroke={C.muted} tick={{fontSize:10,fill:C.muted}} tickFormatter={v=>`$${v}M`}/>
                    <YAxis type="category" dataKey="ciudad" stroke={C.muted} tick={{fontSize:10,fill:C.sub}} width={130}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="deudaVenc" name="Deuda vencida">
                      {MORA.porCiudad.map((_,i)=><Cell key={i} fill={i===0?C.red:i===1?C.amber:C.muted}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop:10, padding:"8px 12px", background:`${C.red}10`, borderRadius:8, border:`1px solid ${C.red}25` }}>
                  <p style={{ fontSize:11, color:C.red, fontWeight:600 }}>AB = 77.6% de la deuda vencida ($55.9M)</p>
                  <p style={{ fontSize:10, color:C.sub, marginTop:2 }}>Prioridad absoluta para campaña de recupero de campo</p>
                </div>
              </Card>

              <Card title="Causa raíz — medios de pago">
                {CLIENTES_STAT.mediosPago.map((m,i)=>{
                  const cols=[C.red,C.purple,C.cyan,C.amber];
                  return (
                    <div key={i} style={{ marginBottom:13 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                        <span style={{ fontSize:11, color:C.sub }}>{m.medio}</span>
                        <div style={{ display:"flex", gap:8 }}>
                          <span style={{ fontSize:10, color:C.muted, fontFamily:C.mono }}>{m.cantidad.toLocaleString("es-AR")}</span>
                          <span style={{ fontSize:11, color:cols[i], fontFamily:C.mono, fontWeight:700 }}>{m.pct}%</span>
                        </div>
                      </div>
                      <div style={{ height:5, background:C.b1, borderRadius:4, overflow:"hidden" }}>
                        <div style={{ width:`${m.pct}%`, height:"100%", background:cols[i], borderRadius:4 }}/>
                      </div>
                    </div>
                  );
                })}
                <div style={{ marginTop:10, padding:"10px 12px", background:`${C.red}12`, borderRadius:8, border:`1px solid ${C.red}30` }}>
                  <p style={{ fontSize:11, color:C.red, fontWeight:700 }}>85.7% paga en caja = causa raíz</p>
                  <p style={{ fontSize:10, color:C.sub, marginTop:4 }}>Migrar a SIRO con incentivo 5% es la palanca más importante</p>
                </div>
              </Card>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { label:"Win-back 20%", pct:0.2, color:C.sub   },
                { label:"Win-back 30%", pct:0.3, color:C.amber },
                { label:"Win-back 40%", pct:0.4, color:C.green },
              ].map((e,i)=>{
                const cli = Math.round(1545*e.pct);
                const ing = +(cli*27425/1e6).toFixed(1);
                return (
                  <div key={i} style={{ background:C.surf, border:`1px solid ${C.b1}`, borderRadius:10, padding:"16px 18px", textAlign:"center" }}>
                    <p style={{ fontSize:10, color:C.muted, marginBottom:6 }}>{e.label} de 1.545 inactivos</p>
                    <p style={{ fontSize:26, fontFamily:C.mono, fontWeight:700, color:e.color }}>{cli.toLocaleString("es-AR")}</p>
                    <p style={{ fontSize:11, color:C.sub, margin:"4px 0" }}>clientes recuperados</p>
                    <div style={{ background:`${e.color}15`, borderRadius:6, padding:"6px", marginTop:8 }}>
                      <p style={{ fontSize:13, color:e.color, fontWeight:700, fontFamily:C.mono }}>+{fM(ing)}/mes</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══ BREAK-EVEN ════════════════════════════════════════════ */}
        {tab==="breakeven" && motor && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <KPI label="Sin plan — BE"    value={motor.beSin}                          sub="Con 195 altas/mes"     accent={C.red}   ok={false}/>
              <KPI label="Con plan — BE"    value={motor.beCon}                          sub="Con 420 altas/mes"     accent={C.green} ok={true}/>
              <KPI label="Clientes para BE" value={motor.cliNec.toLocaleString("es-AR")} sub={`Faltan ${motor.gap.toLocaleString("es-AR")}`} accent={C.amber} ok={false}/>
              <KPI label="Margen unit/cli"  value={fAR(motor.ARPU-motor.COSTO_V)}        sub="ARPU − costo variable" accent={C.cyan}  ok={true}/>
            </div>

            <Card title="Proyección resultado mensual — Con plan vs Sin plan ($M ARS)">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={motor.proyeccion}>
                  <defs>
                    <linearGradient id="gSin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.red} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gCon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.2}/>
                      <stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.b1}/>
                  <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:10,fill:C.muted}}/>
                  <YAxis stroke={C.muted} tick={{fontSize:10,fill:C.muted}} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<Tip/>}/>
                  <ReferenceLine y={0} stroke={C.cyan} strokeWidth={1.5} strokeDasharray="4 3"
                    label={{ value:"Break-even", fill:C.cyan, fontSize:11, position:"right" }}/>
                  <Legend formatter={v=><span style={{color:C.sub,fontSize:11}}>{v}</span>}/>
                  <Area type="monotone" dataKey="sinPlan" name="Sin plan"           stroke={C.red}   fill="url(#gSin)" strokeWidth={2}   dot={false}/>
                  <Area type="monotone" dataKey="conPlan" name="Con plan completo"  stroke={C.green} fill="url(#gCon)" strokeWidth={2.5} dot={{r:3,fill:C.green}}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Tabla proyección mensual">
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
                <thead>
                  <tr style={{ background:C.surf }}>
                    {["Mes","Cli. sin plan","Res. sin plan","Cli. con plan","Res. con plan"].map(h=>(
                      <th key={h} style={{ padding:"9px 14px", textAlign:h==="Mes"?"left":"right", color:C.muted, fontSize:10, textTransform:"uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {motor.proyeccion.map((r,i)=>(
                    <tr key={i} style={{ borderTop:`1px solid ${C.b1}`, background:r.conPlan>=0&&motor.proyeccion[i-1]?.conPlan<0?`${C.green}08`:"transparent" }}>
                      <td style={{ padding:"9px 14px", color:C.txt, fontWeight:600 }}>{r.mes}</td>
                      <td style={{ padding:"9px 14px", textAlign:"right", color:C.sub,  fontFamily:C.mono }}>{r.cliSin.toLocaleString("es-AR")}</td>
                      <td style={{ padding:"9px 14px", textAlign:"right", fontFamily:C.mono, fontWeight:600, color:r.sinPlan>=0?C.green:C.red }}>
                        {r.sinPlan>=0?"+":""}{fM(r.sinPlan)}
                      </td>
                      <td style={{ padding:"9px 14px", textAlign:"right", color:C.cyan, fontFamily:C.mono }}>{r.cliCon.toLocaleString("es-AR")}</td>
                      <td style={{ padding:"9px 14px", textAlign:"right", fontFamily:C.mono, fontWeight:700, color:r.conPlan>=0?C.green:C.red }}>
                        {r.conPlan>=0?"✅ +":""}{fM(r.conPlan)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ═══ CHURN ═════════════════════════════════════════════════ */}
        {tab==="churn" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              <KPI label="Churn acumulado"    value="25.9%"  sub="1.545 de 5.960 inactivos"  accent={C.red}   ok={false}/>
              <KPI label="Tasa mensual prom." value="2.9%"   sub="~118 clientes/mes"          accent={C.red}   ok={false}/>
              <KPI label="Churn anual impl."  value="~30%"   sub="1 de cada 3 / año"          accent={C.amber} ok={false}/>
              <KPI label="Vida media cliente" value="5.3m"   sub="Mediana: 3.9 meses"         accent={C.amber} ok={false}/>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
              <Card title="Tasa de churn mensual (%)">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={CHURN.mensual}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.b1}/>
                    <XAxis dataKey="mes" stroke={C.muted} tick={{fontSize:9,fill:C.muted}} interval={3}/>
                    <YAxis stroke={C.muted} tick={{fontSize:10,fill:C.muted}} tickFormatter={v=>`${v}%`} domain={[0,5]}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={2.9} stroke={C.amber} strokeDasharray="4 3"
                      label={{ value:"Prom 2.9%", fill:C.amber, fontSize:10 }}/>
                    <Line type="monotone" dataKey="pct" name="Churn %" stroke={C.red} strokeWidth={2.5} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Churn acumulado por cohorte">
                {CHURN.cohortes.map((c,i)=>(
                  <div key={i} style={{ marginBottom:13 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:11, color:C.sub }}>{c.cohorte}</span>
                      <div style={{ display:"flex", gap:8 }}>
                        <span style={{ fontSize:10, color:C.muted, fontFamily:C.mono }}>{c.inactivos} inact.</span>
                        <span style={{ fontSize:12, color:c.color, fontFamily:C.mono, fontWeight:700 }}>{c.pct}%</span>
                      </div>
                    </div>
                    <div style={{ height:6, background:C.b1, borderRadius:4, overflow:"hidden" }}>
                      <div style={{ width:`${c.pct}%`, height:"100%", background:c.color, borderRadius:4 }}/>
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, padding:"8px 10px", background:`${C.amber}10`, borderRadius:8, border:`1px solid ${C.amber}25` }}>
                  <p style={{ fontSize:10, color:C.amber, fontWeight:600 }}>⚠ Churn estructural ~35% anual · requiere acción sistémica</p>
                  <p style={{ fontSize:10, color:C.green, marginTop:4 }}>✦ Q4 25 y 2026 mejoran → calidad de captación mejoró</p>
                </div>
              </Card>
            </div>

            <Card title="Causas del churn y palancas de retención">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10 }}>
                {CHURN.causas.map((c,i)=>(
                  <div key={i} style={{ background:C.surf, borderRadius:10, padding:"12px 14px", border:`1px solid ${C.b1}`, textAlign:"center" }}>
                    <p style={{ fontSize:22, fontFamily:C.mono, fontWeight:700, color:c.color }}>{c.pct}%</p>
                    <p style={{ fontSize:11, color:C.sub, margin:"6px 0 8px", lineHeight:1.4 }}>{c.causa}</p>
                    <div style={{ background:`${c.color}15`, borderRadius:6, padding:"4px 6px" }}>
                      <p style={{ fontSize:9, color:c.color, fontWeight:600 }}>{c.accion}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop:12, padding:"10px 14px", background:`${C.green}10`, borderRadius:8, border:`1px solid ${C.green}25`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <p style={{ fontSize:11, color:C.green, fontWeight:600 }}>97% del churn es prevenible con automatización</p>
                <div style={{ textAlign:"right" }}>
                  <p style={{ fontSize:10, color:C.sub }}>Costo churn actual</p>
                  <p style={{ fontSize:14, fontFamily:C.mono, color:C.red, fontWeight:700 }}>~$40M ARS/año</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div style={{ marginTop:28, textAlign:"center", color:C.muted, fontSize:10, paddingBottom:16 }}>
          WeConnect · Netsharing SA · Datos reales ISPCube + Supabase · {new Date().toLocaleDateString("es-AR")}
        </div>
      </div>
    </div>
  );
}
