import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from "recharts";

/* ─── TOKENS ────────────────────────────────────────────────────── */
const C = {
  navy:"#0D1B2A", navyM:"#1B2E45", red:"#D13030", redP:"#FEE9E9",
  amber:"#C47A00", amberP:"#FEF6DC", green:"#1A7A3C", greenP:"#E5F5EC",
  blue:"#1A5FBF", blueP:"#E6EFFE", teal:"#0D7377", tealP:"#E3F4F4",
  purple:"#7B5EA7", bg:"#F4F6F9", bg2:"#FFFFFF", bg3:"#EEF1F5",
  text:"#0D1B2A", text2:"#5A6A7A", text3:"#9AACBC",
  bdr:"#DDE3EC", bdrM:"#C5CED9",
  mono:"'DM Mono',monospace", sans:"'DM Sans',system-ui,sans-serif",
};

/* ─── DATOS VALIDADOS DEL HTML v18 ──────────────────────────────── */
const D = {
  // Negocio
  LABELS:["24/07","24/08","24/09","24/10","24/11","24/12","25/01","25/02","25/03","25/04","25/05","25/06","25/07","25/08","25/09","25/10","25/11","25/12","26/01","26/02","26/03"],
  COBROS:[0.77,4.91,7.61,12.79,18.69,24.30,30.69,31.86,41.58,45.77,46.53,63.27,63.34,70.46,77.64,78.04,86.25,92.64,95.51,95.38,94.03],
  BILLS: [1.93,5.98,11.21,16.85,26.01,30.68,39.12,41.10,47.15,48.24,58.15,130.77,78.15,66.98,101.95,95.30,108.15,87.52,115.07,114.5,110.0],
  M8:["Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26"],
  MP8:  [56.26,61.28,60.42,66.93,74.19,66.81,71.70,64.28],
  SIRO8:[0.00, 0.00, 0.00, 0.45, 0.87, 1.39, 5.85, 9.57],
  VISA8:[4.82, 6.04, 6.98, 7.78, 7.98, 8.29, 8.06, 8.74],
  PF8:  [4.13, 4.52, 4.71, 6.22, 4.64, 4.77, 4.00, 4.70],
  CAJA8:[3.15, 3.61, 3.72, 3.26, 3.56, 3.72, 3.39, 3.75],
  GAL8: [2.09, 2.20, 2.20, 1.61, 1.41,10.53, 2.40, 1.51],
  COBROS_M8:[70.46,77.64,78.04,86.25,92.64,95.51,95.38,93.88],
  CITIES:["Almirante Brown","Cap. Sarmiento","Minist. Rivadavia","Glew","Florencio Varela","Longchamps","Burzaco"],
  CITY_COBRO:[152.7,93.31,11.3,9.02,3.12,3.0,1.15],
  CITY_MORA: [62.87,14.74,1.43,1.95,1.27,0.5,0.15],
  CITY_CLI:  [3128,1727,388,382,93,146,48],
  VEND_LABS:["Alfredo Blockl","Netsharing SA","Local CS","M. Shanahan","I. Rodriguez","Espinel Gaspar"],
  VEND_VALS:[69.45,33.62,19.32,19.29,17.37,13.73],
  ARPU:22447, CPL_ARS:15926, CPL_USD:13.27, LTV_CAC:56.8, PAYBACK_DIAS:18,
  ALTAS:270, CHURN_PCT:2.9, CHURN_ABS:123, NETO:134, CLIENTES:4088,
  // Costos
  CJ_LABS:["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
  CJ_INGS:[78.04,86.25,92.64,95.51,95.38],
  CJ_OPEX:[147.55,135.87,171.65,146.63,146.63],
  CJ_CAPEX:[0,0,0,28.72,36.72],
  CJ_RESS:[-69.51,-49.62,-79.01,-51.12,-51.25],
  OPEX_CATS:["RRHH","Alquileres y oficinas","Equipamiento","Red e infraestructura","Comisiones ventas","Comisiones cobranza","Marketing","Impuestos y tasas","Tecnología"],
  OPEX_COLORS:["#D13030","#C47A00","#7B5EA7","#0D7377","#1A5FBF","#1A7A3C","#E07040","#5A6A7A","#3C3489"],
  OPEX_DATA:{
    "RRHH":           [63.24,57.94,80.64,67.00,67.00],
    "Alquileres y oficinas":[19.56,13.69,18.10,15.93,15.93],
    "Equipamiento":   [15.32,14.87,16.65,12.24,12.24],
    "Red e infraestructura":[8.29,9.21,7.32,9.22,9.22],
    "Comisiones ventas":[7.50,7.56,8.17,7.37,7.37],
    "Comisiones cobranza":[2.39,3.54,6.15,5.54,5.54],
    "Marketing":      [5.35,4.57,4.64,3.99,3.99],
    "Impuestos y tasas":[4.84,6.20,3.88,3.61,3.61],
    "Tecnología":     [1.34,1.36,1.38,2.02,2.02],
  },
  // Clientes
  ALTAS_M:["Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26"],
  ALTAS_V: [283,256,368,247,238,257,195,259],
  CHURNS_V:[82,72,74,46,35,21,14,9],
  // Churn
  COHORTS:[
    {c:"Antiguo 2024 H2 (+18m)",pct:35.4,inact:605,color:C.red  },
    {c:"Maduro 2025 Q1–Q2 (9-15m)",pct:34.6,inact:526,color:C.red  },
    {c:"Maduro 2025 Q3 (6-9m)",pct:33.2,inact:285,color:C.amber},
    {c:"Reciente 2025 Q4 (3-6m)",pct:18.1,inact:150,color:C.amber},
    {c:"Muy reciente 2026 (0-3m)",pct:10.6,inact:87,color:C.green},
  ],
  CHURN_MENS:[
    {mes:"Sep 24",pct:2.1},{mes:"Oct 24",pct:2.3},{mes:"Nov 24",pct:2.0},{mes:"Dic 24",pct:1.9},
    {mes:"Ene 25",pct:2.2},{mes:"Feb 25",pct:2.4},{mes:"Mar 25",pct:2.6},{mes:"Abr 25",pct:2.8},
    {mes:"May 25",pct:2.7},{mes:"Jun 25",pct:2.9},{mes:"Jul 25",pct:3.1},{mes:"Ago 25",pct:3.0},
    {mes:"Sep 25",pct:2.9},{mes:"Oct 25",pct:2.8},{mes:"Nov 25",pct:2.6},{mes:"Dic 25",pct:2.7},
    {mes:"Ene 26",pct:2.5},{mes:"Feb 26",pct:2.4},{mes:"Mar 26",pct:2.3},
  ],
  // Mora
  MORA_TOTAL:82.9, MORA_VENC:24.6, MORA_MOROSOS:1041, MORA_PCT:18,
  // Break-even
  BE_RES_SIN:[-51.18,-48.17,-45.25,-42.42,-39.69,-37.02,-34.44,-31.92,-29.47,-27.09,-24.78,-22.53,-20.36,-18.25],
  BE_RES_CON:[-51.18,-48.17,-37.59,-21.83,-7.22,2.31,11.66,20.79,29.75,38.54,47.15,55.59,63.88,72.0],
  BE_LABS:["Hoy","Abr 26","Jun 26","Sep 26","Dic 26","Mar 27","Sep 27","Mar 28","Mar 29","Jun 29","Sep 29","Dic 29","Mar 30","Jun 30"],
  BE_IMPACTO:[
    {label:"Base feb-26",  val:95.3,  color:C.text2},
    {label:"+ Win-back 30%",val:13.9,  color:C.green},
    {label:"+ Upsell →100MB",val:4.1,  color:C.teal},
    {label:"+ Ventas +500/m",val:10.9,  color:C.blue},
    {label:"+ Red nueva @5%",val:29.6,  color:C.purple},
    {label:"+ IA ahorro",    val:3.0,  color:C.amber},
  ],
  // RRSS
  CPL_ESC:[
    {esc:"Meta $1.5k",altas:270,cpl:13.27,color:C.blue},
    {esc:"Meta+Google",altas:437,cpl:9.83,color:C.teal},
    {esc:"Meta+G+Ref",altas:542,cpl:7.93,color:C.green},
  ],
};

/* ─── HELPERS ────────────────────────────────────────────────────── */
const fM  = n => `$${Math.abs(n).toFixed(1)}M`;
const fAR = n => `$${Math.round(Math.abs(n)).toLocaleString("es-AR")}`;

/* ─── TOOLTIP ────────────────────────────────────────────────────── */
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.bg2, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"10px 14px", boxShadow:"0 4px 16px rgba(13,27,42,0.12)", fontSize:12 }}>
      <p style={{ color:C.text2, fontSize:10, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||C.navy, margin:"2px 0", fontFamily:C.mono, fontWeight:600 }}>
          {p.name}: {typeof p.value==="number" ? (Math.abs(p.value)<500 ? `${p.value.toFixed(1)}M` : p.value.toLocaleString("es-AR")) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── KPI ────────────────────────────────────────────────────────── */
const KPI = ({ label, value, sub, type="nv" }) => {
  const bc = { ok:C.green, wr:C.amber, dn:C.red, nv:C.navy, tl:C.teal }[type]||C.navy;
  const vc = { ok:C.green, wr:C.amber, dn:C.red, nv:C.navy, tl:C.teal }[type]||C.navy;
  return (
    <div style={{ background:C.bg2, border:`0.5px solid ${C.bdr}`, borderRadius:10, padding:"13px 14px", borderTop:`2.5px solid ${bc}` }}>
      <p style={{ fontSize:10, color:C.text2, marginBottom:3, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:500 }}>{label}</p>
      <p style={{ fontSize:21, fontWeight:600, lineHeight:1.2, fontFamily:C.mono, color:vc }}>{value}</p>
      {sub && <p style={{ fontSize:10, color:C.text2, marginTop:2 }} dangerouslySetInnerHTML={{__html:sub}}/>}
    </div>
  );
};

/* ─── CARD ───────────────────────────────────────────────────────── */
const Card = ({ title, children, style={} }) => (
  <div style={{ background:C.bg2, border:`0.5px solid ${C.bdr}`, borderRadius:12, padding:"14px 16px", ...style }}>
    {title && <p style={{ fontSize:10, fontWeight:600, color:C.text2, textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>{title}</p>}
    {children}
  </div>
);

/* ─── INSIGHT ────────────────────────────────────────────────────── */
const Ins = ({ type="g", html }) => {
  const s = { g:{bg:C.greenP,c:"#0F5226",b:C.green}, i:{bg:C.blueP,c:"#103B8A",b:C.blue}, w:{bg:C.amberP,c:"#7A4C00",b:C.amber}, d:{bg:C.redP,c:"#891515",b:C.red}, t:{bg:C.tealP,c:"#065457",b:C.teal} }[type]||{bg:C.greenP,c:"#0F5226",b:C.green};
  return <div style={{ background:s.bg, color:s.c, borderLeft:`3px solid ${s.b}`, borderRadius:8, padding:"9px 12px", fontSize:12, lineHeight:1.65, marginTop:8 }} dangerouslySetInnerHTML={{__html:html}}/>;
};

/* ─── PROG BAR ───────────────────────────────────────────────────── */
const Prog = ({ label, value, max, display, color=C.blue }) => (
  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:7 }}>
    <div style={{ width:"38%", color:C.text2, fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{label}</div>
    <div style={{ flex:1, height:7, background:C.bg3, borderRadius:4, overflow:"hidden", border:`0.5px solid ${C.bdr}` }}>
      <div style={{ width:`${Math.min((value/max)*100,100)}%`, height:"100%", background:color, borderRadius:3 }}/>
    </div>
    <div style={{ minWidth:60, textAlign:"right", fontSize:11, fontWeight:600, fontFamily:C.mono }}>{display}</div>
  </div>
);

/* ─── FASE ITEM ──────────────────────────────────────────────────── */
const FaseItem = ({ accion, detalle, tipo, color }) => (
  <div style={{ display:"flex", alignItems:"flex-start", padding:"10px 0", borderBottom:`0.5px solid ${C.bdr}`, gap:10 }}>
    <div style={{ width:8, height:8, borderRadius:"50%", background:color, flexShrink:0, marginTop:4 }}/>
    <div style={{ flex:1 }}>
      <p style={{ fontSize:12, fontWeight:600, color:C.text }}>{accion}</p>
      <p style={{ fontSize:11, color:C.text2, marginTop:2 }}>{detalle}</p>
    </div>
    <span style={{ fontSize:10, padding:"2px 8px", borderRadius:9, fontWeight:600, background:`${color}18`, color, whiteSpace:"nowrap" }}>{tipo}</span>
  </div>
);

/* ─── TABS ───────────────────────────────────────────────────────── */
const TABS = [
  {id:"negocio",  label:"📊 Negocio"    },
  {id:"costos",   label:"💰 Costos ISP"  },
  {id:"clientes", label:"👥 Clientes"   },
  {id:"churn",    label:"📉 Churn"      },
  {id:"mora",     label:"⚠️ Mora"       },
  {id:"be",       label:"📈 Break-even" },
  {id:"rrss",     label:"📣 Redes soc." },
  {id:"ia",       label:"🤖 IA Ventas"  },
  {id:"plan",     label:"🚀 Plan"       },
];

/* ═══ MAIN ═══════════════════════════════════════════════════════ */
export default function App() {
  const [tab,setTab]             = useState("negocio");
  const [cobranza,setCobranza]   = useState([]);
  const [egresos,setEgresos]     = useState([]);
  const [clientes,setClientes]   = useState([]);
  const [loading,setLoading]     = useState(true);

  useEffect(()=>{
    async function load(){
      setLoading(true);
      const [{data:cob},{data:egr},{data:cli}] = await Promise.all([
        supabase.from("cobranza").select("*").order("id"),
        supabase.from("egresos").select("*").order("id"),
        supabase.from("clientes_resumen").select("*").order("id"),
      ]);
      if(cob) setCobranza(cob);
      if(egr) setEgresos(egr);
      if(cli) setClientes(cli);
      setLoading(false);
    }
    load();
  },[]);

  // Datos combinados para gráficas
  const cobVsFac = D.LABELS.map((l,i)=>({mes:l,cobrado:D.COBROS[i],facturado:D.BILLS[i]}));
  const canalesData = D.M8.map((m,i)=>({mes:m,"Mercado Pago":D.MP8[i],"SIRO ▲":D.SIRO8[i],"Visa/MC":D.VISA8[i],"Pago Fácil":D.PF8[i],"Caja":D.CAJA8[i],"Galicia/Transfer":D.GAL8[i]}));
  const cityCobroData = D.CITIES.map((c,i)=>({city:c,cobrado:D.CITY_COBRO[i],mora:D.CITY_MORA[i]}));
  const vendData = D.VEND_LABS.map((l,i)=>({vend:l,val:D.VEND_VALS[i]}));
  const altasData = D.ALTAS_M.map((m,i)=>({mes:m,altas:D.ALTAS_V[i],churns:D.CHURNS_V[i],neto:D.ALTAS_V[i]-D.CHURNS_V[i]}));
  const plData = D.CJ_LABS.map((l,i)=>({mes:l,cobrado:D.CJ_INGS[i],opex:D.CJ_OPEX[i],capex:D.CJ_CAPEX[i],res:D.CJ_RESS[i]}));
  const opexStackData = D.CJ_LABS.map((l,i)=>{
    const row={mes:l};
    D.OPEX_CATS.forEach(cat=>{ row[cat]=(D.OPEX_DATA[cat]||[])[i]||0; });
    return row;
  });
  const beData = D.BE_LABS.map((l,i)=>({mes:l,sinPlan:D.BE_RES_SIN[i]||null,conPlan:D.BE_RES_CON[i]||null}));

  if(loading) return(
    <div style={{background:C.bg,minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:C.sans}}>
      <div style={{textAlign:"center"}}>
        <div style={{width:36,height:36,border:`3px solid ${C.bdr}`,borderTop:`3px solid ${C.navy}`,borderRadius:"50%",margin:"0 auto 12px",animation:"spin 1s linear infinite"}}/>
        <p style={{color:C.text2,fontSize:13}}>Cargando desde Supabase...</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return(
    <div style={{background:C.bg,minHeight:"100vh",fontFamily:C.sans,fontSize:13,color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;600&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        ::-webkit-scrollbar{height:4px;width:4px}::-webkit-scrollbar-thumb{background:${C.bdrM};border-radius:4px}
      `}</style>

      <div style={{maxWidth:1240,margin:"0 auto",padding:"16px 14px 40px"}}>

        {/* HEADER */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20,paddingBottom:14,borderBottom:`2px solid ${C.navy}`,flexWrap:"wrap",gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{width:40,height:40,background:C.navy,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600,color:"#fff"}}>WC</div>
            <div>
              <p style={{fontSize:20,fontWeight:600,color:C.navy}}>WeConnect</p>
              <p style={{fontSize:11,color:C.text2}}>Dashboard Ejecutivo · Netsharing SA</p>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:C.green,animation:"pulse 2s infinite"}}/>
            <span style={{fontSize:11,color:C.green,fontWeight:500}}>En línea</span>
            <span style={{fontSize:11,color:C.text2,padding:"3px 10px",background:C.bg3,borderRadius:20,border:`0.5px solid ${C.bdr}`}}>
              {D.CLIENTES.toLocaleString("es-AR")} clientes · datos al {new Date().toLocaleDateString("es-AR")}
            </span>
            <span style={{fontSize:11,color:C.text2,padding:"3px 10px",background:C.bg3,borderRadius:20,border:`0.5px solid ${C.bdr}`}}>
              ARPU cobrado ${D.ARPU.toLocaleString("es-AR")} · CPL ${D.CPL_ARS.toLocaleString("es-AR")}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div style={{overflowX:"auto",marginBottom:18,paddingBottom:2}}>
          <div style={{display:"flex",gap:2,background:C.bg3,borderRadius:10,padding:3,width:"max-content",minWidth:"100%",border:`0.5px solid ${C.bdr}`}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)} style={{
                fontSize:12,padding:"7px 13px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:C.sans,
                fontWeight:tab===t.id?600:500,whiteSpace:"nowrap",transition:"all .15s",
                background:tab===t.id?C.navy:"transparent",
                color:tab===t.id?"#fff":C.text2,
                boxShadow:tab===t.id?"0 2px 6px rgba(13,27,42,.28)":"none",
              }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* ═══ NEGOCIO ═══════════════════════════════════════════════ */}
        {tab==="negocio"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Cobranza Dic 2025" value="$92.6M" sub="▲ +7.4% vs noviembre" type="ok"/>
              <KPI label="Cobranza Ene 2026" value="$95.5M" sub="▲ +3.1% vs diciembre" type="ok"/>
              <KPI label="Cobranza Feb 2026" value="$95.4M" sub="mes completo · datos frescos" type="ok"/>
              <KPI label="Cobro Mar 2026"    value="$94.0M" sub="al 23/03 · SIRO 10.2% y subiendo" type="ok"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Cobrado vs facturado mensual ($M)">
                <div style={{display:"flex",gap:16,marginBottom:10}}>
                  {[{color:C.blue,label:"Cobrado"},{color:"rgba(26,95,191,.3)",label:"Facturado"}].map((l,i)=>(
                    <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.text2}}>
                      <span style={{width:12,height:3,background:l.color,borderRadius:2,display:"inline-block"}}/>
                      {l.label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={cobVsFac.slice(-16)}>
                    <defs>
                      <linearGradient id="gCob" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.blue} stopOpacity={0.15}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="gFac" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.blue} stopOpacity={0.08}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} interval={2}/>
                    <YAxis tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <Tooltip content={<Tip/>}/>
                    <Area type="monotone" dataKey="facturado" name="Facturado" stroke="rgba(26,95,191,.4)" fill="url(#gFac)" strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
                    <Area type="monotone" dataKey="cobrado"   name="Cobrado"   stroke={C.blue}             fill="url(#gCob)" strokeWidth={2}   dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Evolución canales de cobro — últimos 8 meses ($M)">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={canalesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} interval={1}/>
                    <YAxis tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="Mercado Pago"     stackId="a" fill={C.blue}   name="Mercado Pago"/>
                    <Bar dataKey="SIRO ▲"           stackId="a" fill={C.green}  name="SIRO ▲"/>
                    <Bar dataKey="Visa/MC"          stackId="a" fill={C.purple} name="Visa/MC"/>
                    <Bar dataKey="Pago Fácil"       stackId="a" fill={C.amber}  name="Pago Fácil"/>
                    <Bar dataKey="Caja"             stackId="a" fill={C.text3}  name="Caja" radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
                <Ins type="g" html="SIRO: 0.5% (nov) → 6.1% (feb) → <strong>9.8% (mar)</strong> confirmado con datos frescos. 2do canal de mayor crecimiento."/>
                <Ins type="d" html="⚠ Mercado Pago = 65% del cobro. Si falla o sube comisión, impacto inmediato."/>
              </Card>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Cobranza 2026 acumulada por ciudad ($M)">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={cityCobroData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <YAxis type="category" dataKey="city" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} width={120}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="cobrado" name="Cobrado" fill={C.navy} radius={[0,3,3,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Cobranza 2026 por vendedor ($M acumulado ene–mar)">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={vendData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <YAxis type="category" dataKey="vend" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} width={110}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="val" name="Cobrado" fill={C.teal} radius={[0,3,3,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              <KPI label="ARPU cobrado real"   value="$22.447"   sub="promedio cobrado ene-feb 26 · precio plan $26.254" type="nv"/>
              <KPI label="Tasa cobranza ene-26" value="83%"       sub="$95.5M cobrado / $115M facturado" type="wr"/>
              <KPI label="Crecimiento ago-24→ene-26" value="+1.590%" sub="$5.7M → $95.5M" type="ok"/>
            </div>
          </div>
        )}

        {/* ═══ COSTOS ════════════════════════════════════════════════ */}
        {tab==="costos"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="OPEX steady state"  value="$150.3M" sub="ARS/mes · ene-feb 2026"          type="dn"/>
              <KPI label="Déficit mensual"    value="−$42.5M" sub="4.106 cli × $26.254 = $107.8M"   type="dn"/>
              <KPI label="Clientes para BE"   value="5.725"   sub="faltan 1.619 · ARPU $26.254"      type="wr"/>
              <KPI label="CAPEX red AB (5m)"  value="$58.2M"  sub="OLT + Construcción · no recurrente" type="wr"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="P&L mensual real — CAPEX separado ($M ARS)">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={plData} barGap={3}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                    <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                    <Bar dataKey="cobrado" name="Ingresos" fill={C.blue}  radius={[3,3,0,0]}/>
                    <Bar dataKey="opex"    name="OPEX"     fill={C.red}   radius={[3,3,0,0]}/>
                    <Bar dataKey="capex"   name="CAPEX"    fill={C.amber} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Estructura OPEX — prom 5 meses">
                {D.OPEX_CATS.map((cat,i)=>{
                  const avg=(D.OPEX_DATA[cat]||[]).reduce((a,b)=>a+b,0)/(D.OPEX_DATA[cat]||[1]).length;
                  const max=63.24;
                  return <Prog key={i} label={cat} value={avg} max={max} display={fM(avg)} color={D.OPEX_COLORS[i]}/>;
                })}
              </Card>
            </div>

            <Card title="OPEX apilado por categoría — 5 meses ($M)">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={opexStackData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend formatter={v=><span style={{fontSize:10,color:C.text2}}>{v}</span>}/>
                  {D.OPEX_CATS.map((cat,i)=>(
                    <Bar key={cat} dataKey={cat} stackId="a" fill={D.OPEX_COLORS[i]} radius={i===D.OPEX_CATS.length-1?[3,3,0,0]:[0,0,0,0]}/>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:12}}>
              <KPI label="RRHH ene-feb"     value="$67.2M"  sub="45% OPEX · dic $85.9M (SAC)" type="dn"/>
              <KPI label="CAPEX 5 meses"    value="$58.2M"  sub="red AB · no recurrente"       type="wr"/>
              <KPI label="Ingreso marginal" value="$26.254" sub="ARS por cada cliente nuevo"   type="nv"/>
            </div>
          </div>
        )}

        {/* ═══ CLIENTES ══════════════════════════════════════════════ */}
        {tab==="clientes"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Clientes totales"    value="5.960"    sub="desde agosto 2024"               type="nv"/>
              <KPI label="Habilitados / activos" value="4.088" sub="68.6% del padrón"                type="ok"/>
              <KPI label="Mejor mes de altas"  value="354"      sub="enero 2026 ▲"                   type="ok"/>
              <KPI label="Promedio altas/mes"  value="259"      sub={`mar-26 · neto <strong style='color:${C.green}'>+250</strong>/mes tras churn 2.9%`} type="ok"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Altas, churns y crecimiento neto mensual">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={altasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                    <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                    <Bar dataKey="altas"  name="Altas"  fill={C.green}                    radius={[3,3,0,0]}/>
                    <Bar dataKey="churns" name="Churns" fill="rgba(209,48,48,.55)"        radius={[3,3,0,0]}/>
                    <Line type="monotone" dataKey="neto" name="Neto" stroke={C.blue} strokeWidth={2.5} dot={{r:4,fill:C.blue}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Distribución de planes">
                {[
                  {plan:"100 MB",cli:2303,pct:39.2,color:C.green},
                  {plan:"300 MB",cli:1370,pct:23.3,color:C.green},
                  {plan:"50 MB", cli:399, pct:6.8, color:C.amber},
                  {plan:"30 MB", cli:112, pct:1.9, color:C.amber},
                  {plan:"600 MB",cli:106, pct:1.8, color:C.green},
                ].map((p,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",borderBottom:`0.5px solid ${C.bdr}`}}>
                    <span style={{fontWeight:600,fontSize:12}}>{p.plan}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{background:p.color===C.green?C.greenP:C.amberP,color:p.color,padding:"2px 7px",borderRadius:9,fontSize:10,fontWeight:600}}>{p.cli.toLocaleString("es-AR")} clientes</span>
                      <span style={{fontSize:10,color:C.text2}}>{p.pct}%</span>
                    </div>
                  </div>
                ))}
                <Ins type="i" html="511 clientes en 30/50 MB → upsell a 100 MB = potencial <strong>+$12.3M/mes</strong>."/>

                <p style={{fontSize:10,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em",margin:"14px 0 10px"}}>Distribución geográfica</p>
                {D.CITIES.map((c,i)=>(
                  <Prog key={i} label={c} value={D.CITY_CLI[i]} max={3128}
                    display={`${D.CITY_CLI[i].toLocaleString("es-AR")} (${Math.round(D.CITY_CLI[i]/5960*100)}%)`}
                    color={i<2?C.blue:C.green}/>
                ))}
              </Card>
            </div>

            {/* Curva neto ingreso - egresos */}
            <Card title="Curva neto: ingresos − egresos · con altas y bajas" style={{marginBottom:12}}>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={[
                  {mes:"Oct 25",cobrado:78.08,egresos:147.55,neto:-69.47,altas:368,bajas:98},
                  {mes:"Nov 25",cobrado:85.40,egresos:135.87,neto:-50.47,altas:247,bajas:58},
                  {mes:"Dic 25",cobrado:92.87,egresos:171.65,neto:-78.78,altas:238,bajas:59},
                  {mes:"Ene 26",cobrado:95.98,egresos:175.34,neto:-79.36,altas:257,bajas:41},
                  {mes:"Feb 26",cobrado:95.21,egresos:183.34,neto:-88.13,altas:195,bajas:22},
                  {mes:"Mar 26",cobrado:94.03,egresos:183.34,neto:-89.31,altas:259,bajas:9},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis yAxisId="left"  tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                  <ReferenceLine yAxisId="left" y={0} stroke={C.navy} strokeDasharray="4 3"/>
                  <Area yAxisId="left"  type="monotone" dataKey="neto"   name="Neto ($M)"  stroke={C.red}   fill="rgba(209,48,48,0.1)" strokeWidth={2}/>
                  <Bar  yAxisId="right" dataKey="altas"  name="Altas"    fill={C.green}    opacity={0.7}   radius={[3,3,0,0]}/>
                  <Bar  yAxisId="right" dataKey="bajas"  name="Sin serv." fill={C.amber}   opacity={0.7}   radius={[3,3,0,0]}/>
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* ═══ CHURN ═════════════════════════════════════════════════ */}
        {tab==="churn"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Churn acumulado"       value="28.6%"    sub="1.682 de 5.876 inactivos"   type="dn"/>
              <KPI label="Tasa mensual prom."    value="2.9%"     sub="122 clientes/mes"            type="dn"/>
              <KPI label="Churn anual implícito" value="30.1%"    sub="1 de cada 3 / año"           type="wr"/>
              <KPI label="Vida media"            value="5.3 meses" sub="mediana: 3.9 meses"         type="wr"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Tasa de churn mensual (%)">
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={D.CHURN_MENS}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} interval={3}/>
                    <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`${v}%`} domain={[0,5]}/>
                    <Tooltip content={<Tip/>}/>
                    <ReferenceLine y={2.9} stroke={C.amber} strokeDasharray="4 3" label={{value:"Prom 2.9%",fill:C.amber,fontSize:10,position:"right"}}/>
                    <Line type="monotone" dataKey="pct" name="Churn %" stroke={C.red} strokeWidth={2} dot={false}/>
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Churn acumulado por cohorte">
                {D.COHORTS.map((c,i)=>(
                  <div key={i} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                      <span style={{fontSize:11,color:C.text2}}>{c.c}</span>
                      <div style={{display:"flex",gap:8}}>
                        <span style={{fontSize:10,color:C.text3,fontFamily:C.mono}}>{c.inact} inact.</span>
                        <span style={{fontSize:12,color:c.color,fontFamily:C.mono,fontWeight:600}}>{c.pct}%</span>
                      </div>
                    </div>
                    <div style={{height:6,background:C.bg3,borderRadius:4,overflow:"hidden",border:`0.5px solid ${C.bdr}`}}>
                      <div style={{width:`${c.pct}%`,height:"100%",background:c.color,borderRadius:3}}/>
                    </div>
                  </div>
                ))}
                <Ins type="d" html="Las 3 cohortes maduras convergen al 33–35%: <strong>churn estructural ~35% anual</strong>. Requiere rediseño sistémico."/>
                <Ins type="g" html="Cohortes 2025 Q4 y 2026 muestran mejora (10–18%). La calidad del cliente captado mejoró."/>
              </Card>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:12}}>
              <KPI label="Churnan antes del mes 3"  value="30.7%" sub="problema de onboarding"      type="dn"/>
              <KPI label="Churnan entre mes 3–6"   value="38.8%" sub="primera renovación"           type="wr"/>
              <KPI label="Más de 12 meses activos" value="8.2%"  sub='los clientes "fieles"'        type="ok"/>
            </div>

            <Card title="Causas del churn y palancas de retención">
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                {[
                  {causa:"Mora pasiva / olvido", pct:"~45%",accion:"IA cobranza D5/15/25",color:C.red  },
                  {causa:"Soporte sin respuesta",pct:"~22%",accion:"Bot soporte 24/7",    color:C.amber},
                  {causa:"Onboarding frío <90d", pct:"~18%",accion:"Secuencia D+2/30/90", color:C.amber},
                  {causa:"Competencia / precio", pct:"~12%",accion:"Objeciones onboarding",color:C.purple},
                  {causa:"Mudanza",              pct:"~3%", accion:"No prevenible",         color:C.text3},
                ].map((c,i)=>(
                  <div key={i} style={{background:C.bg3,borderRadius:10,padding:"12px 14px",border:`0.5px solid ${C.bdr}`,textAlign:"center"}}>
                    <p style={{fontSize:20,fontFamily:C.mono,fontWeight:600,color:c.color}}>{c.pct}</p>
                    <p style={{fontSize:11,color:C.text2,margin:"6px 0 8px",lineHeight:1.4}}>{c.causa}</p>
                    <div style={{background:`${c.color}18`,borderRadius:6,padding:"4px 6px"}}>
                      <p style={{fontSize:9,color:c.color,fontWeight:600}}>{c.accion}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Ins type="g" html="El 97% del churn es prevenible. Los primeros 3 se atacan con automatización, sin llamar a nadie, sin reportes manuales."/>
            </Card>
          </div>
        )}

        {/* ═══ MORA ══════════════════════════════════════════════════ */}
        {tab==="mora"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Deuda total cartera" value="$82.9M"  sub="total adeudado"            type="dn"/>
              <KPI label="Deuda vencida"       value="$24.6M"  sub="1.041 morosos"             type="dn"/>
              <KPI label="% cartera con mora"  value="18%"     sub="activos con deuda vencida" type="wr"/>
              <KPI label="Deuda prom./moroso"  value="~$39.3k" sub="1.4 meses de ARPU"         type="wr"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Deuda vencida por ciudad ($M ARS)">
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={cityCobroData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr} horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <YAxis type="category" dataKey="city" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} width={120}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="mora" name="Deuda vencida" radius={[0,3,3,0]}>
                      {cityCobroData.map((_,i)=><Cell key={i} fill={i===0?C.red:i===1?C.amber:C.text3}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Ins type="d" html="AB = 72.6% de la deuda vencida. Prioridad para campaña de recupero de campo."/>
              </Card>

              <Card title="Causa raíz — medios de pago declarados">
                {[
                  {medio:"Caja / efectivo",   cant:"5.041",pct:86,color:C.red  },
                  {medio:"Débito/crédito",    cant:"438",  pct:7, color:C.green},
                  {medio:"Cobranzas domicil.",cant:"332",  pct:6, color:C.blue },
                ].map((m,i)=>(
                  <div key={i} style={{marginBottom:13}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:11,color:C.text2}}>{m.medio}</span>
                      <div style={{display:"flex",gap:8}}>
                        <span style={{fontSize:10,color:C.text3,fontFamily:C.mono}}>{m.cant}</span>
                        <span style={{fontSize:12,color:m.color,fontFamily:C.mono,fontWeight:600}}>{m.pct}%</span>
                      </div>
                    </div>
                    <div style={{height:7,background:C.bg3,borderRadius:4,overflow:"hidden",border:`0.5px solid ${C.bdr}`}}>
                      <div style={{width:`${m.pct}%`,height:"100%",background:m.color,borderRadius:3}}/>
                    </div>
                  </div>
                ))}
                <Ins type="d" html="<strong>86% paga en caja</strong> = causa raíz de la mora pasiva y del churn por deuda. Migrar a SIRO es la palanca más importante."/>

                <p style={{fontSize:10,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em",margin:"14px 0 10px"}}>Escenarios de recupero — win-back 1.682 inactivos</p>
                {[
                  {label:"Meta conservadora (20%)",ing:"+$8.1M/mes",cli:"336 clientes"},
                  {label:"Meta moderada (30%)",    ing:"+$12.1M/mes",cli:"504 clientes"},
                  {label:"Meta ambiciosa (40%)",   ing:"+$16.2M/mes",cli:"673 clientes"},
                ].map((e,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`0.5px solid ${C.bdr}`}}>
                    <span style={{fontSize:11,color:C.text2}}>{e.label}</span>
                    <div style={{textAlign:"right"}}>
                      <span style={{fontSize:12,fontWeight:600,fontFamily:C.mono,color:C.green}}>{e.ing}</span>
                      <span style={{fontSize:10,color:C.text3,marginLeft:6}}>{e.cli}</span>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ═══ BREAK-EVEN ════════════════════════════════════════════ */}
        {tab==="be"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Resultado grupo hoy"  value="−$44.5M"  sub="ingresos $115M − costos $127.8M − var $32M" type="dn"/>
              <KPI label="Clientes para BE grupo" value="6.532"  sub="gap actual: 2.241 clientes"                 type="wr"/>
              <KPI label="Margen unitario/cliente" value="$19.867" sub="ARPU $27.497 − costo var $7.630"          type="nv"/>
              <KPI label="BE con plan completo"  value="Mes 4"   sub="≈ julio 2026 · $8.5M positivo"             type="ok"/>
            </div>

            <Card title="Proyección resultado mensual — Con plan vs sin plan ($M)" style={{marginBottom:12}}>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={beData}>
                  <defs>
                    <linearGradient id="gSin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.red} stopOpacity={0.15}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gCon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.green} stopOpacity={0.15}/><stop offset="95%" stopColor={C.green} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<Tip/>}/>
                  <ReferenceLine y={0} stroke={C.navy} strokeDasharray="4 3" label={{value:"Break-even",fill:C.navy,fontSize:11,position:"right"}}/>
                  <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                  <Area type="monotone" dataKey="sinPlan" name="Sin plan (status quo)"  stroke={C.red}   fill="url(#gSin)" strokeWidth={2} dot={false} connectNulls/>
                  <Area type="monotone" dataKey="conPlan" name="Con plan completo"       stroke={C.green} fill="url(#gCon)" strokeWidth={2.5} dot={false} connectNulls/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>

            <Card title="Impacto de cada iniciativa en ingresos" style={{marginBottom:12}}>
              <div style={{display:"flex",gap:0,flexWrap:"nowrap",overflowX:"auto"}}>
                {[...D.BE_IMPACTO,{label:"Total proyectado (6m)",val:157,color:C.green,total:true}].map((it,i)=>(
                  <div key={i} style={{
                    flex:"0 0 auto",minWidth:130,padding:"12px 14px",textAlign:"center",
                    background:it.total?C.greenP:C.bg2,
                    border:`0.5px solid ${it.total?C.green:C.bdr}`,
                    borderLeft:i>0?"none":"0.5px solid",
                    borderRadius:i===0?"8px 0 0 8px":it.total?"0 8px 8px 0":"0",
                  }}>
                    <p style={{fontSize:9,color:C.text2,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>{it.label}</p>
                    <p style={{fontSize:15,fontFamily:C.mono,fontWeight:600,color:it.color}}>
                      {it.total?`~$${it.val}M`:`+$${it.val}M`}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ REDES SOCIALES ════════════════════════════════════════ */}
        {tab==="rrss"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Inversión total adquisición" value="$4.3M ARS" sub="Meta $1.8M + equipo WSP $2.5M"     type="nv"/>
              <KPI label="CPL real corregido"          value="$15.926"   sub="$13.27 USD · antes incorrecto"      type="ok"/>
              <KPI label="LTV / CAC"                   value="59.5x"     sub="sigue siendo muy bueno"             type="ok"/>
              <KPI label="Payback"                     value="17 días"   sub="0.58 meses"                         type="ok"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Proyección altas/mes por escenario de inversión">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={D.CPL_ESC}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="esc" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                    <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                    <Tooltip content={<Tip/>}/>
                    <Bar dataKey="altas" name="Altas/mes" radius={[4,4,0,0]}>
                      {D.CPL_ESC.map((_,i)=><Cell key={i} fill={[C.blue,C.teal,C.green][i]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Ins type="i" html="Escenario 3 (Meta $3k + Google + Referidos) es el <strong>recomendado</strong>: CPL $9.6 USD · LTV/CAC 99x · +812 altas/mes realista."/>
              </Card>

              <Card title="Por qué los dos canales juntos — funnel completo">
                {[
                  {etapa:"Awareness",canal:"📘 Meta",desc:"Interrumpe · muestra · genera conocimiento de marca en zona",color:C.blue},
                  {etapa:"Intención",canal:"🔍 Google Search",desc:"Captura cuando ya están buscando · 15–22% conversión",color:C.teal},
                  {etapa:"Decisión", canal:"🎯 Remarketing",desc:"Meta + Display Google · acompañan hasta el cierre · 4–8%",color:C.purple},
                  {etapa:"Conversión",canal:"🤖 Bot WSP IA",desc:"Cierra 24/7 · responde en 3 seg · vende cuando el lead está caliente",color:C.green},
                ].map((f,i)=>(
                  <div key={i} style={{display:"flex",gap:10,padding:"8px 0",borderBottom:`0.5px solid ${C.bdr}`}}>
                    <span style={{background:`${f.color}18`,color:f.color,padding:"2px 8px",borderRadius:9,fontSize:10,fontWeight:600,whiteSpace:"nowrap"}}>{f.etapa}</span>
                    <div>
                      <p style={{fontSize:11,fontWeight:600,color:C.text}}>{f.canal}</p>
                      <p style={{fontSize:11,color:C.text2}}>{f.desc}</p>
                    </div>
                  </div>
                ))}
                <Ins type="d" html="Sin Meta solo: capturás intención existente pero no generás demanda nueva. Sin Google solo: generás demanda pero perdés los leads que van a buscar antes de decidir."/>
              </Card>
            </div>
          </div>
        )}

        {/* ═══ IA VENTAS ═════════════════════════════════════════════ */}
        {tab==="ia"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Costo equipo ventas/mes" value="$2.5M ARS"  sub="personal que atiende el WSP"         type="nv"/>
              <KPI label="Inversión desarrollo"    value="$690 USD"   sub="−60% vs estimación anterior · 23 hs" type="ok"/>
              <KPI label="Payback"                 value="8 días"     sub="$828k ARS ÷ $3.16M beneficio mensual" type="ok"/>
              <KPI label="Beneficio neto mensual"  value="+$3.16M"    sub="ahorro $1.75M + altas +$1.48M − IA $74k" type="ok"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Hoy — proceso manual vs Con IA — 24/7 · &lt;3 segundos">
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div>
                    <p style={{fontSize:11,fontWeight:600,color:C.text2,marginBottom:8}}>HOY — manual</p>
                    {["Lead llega al link WSP","Espera que un humano responda","Conversación manual de venta","Alta manual en ISP CUBE"].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:8,padding:"8px 10px",background:C.bg3,borderRadius:8,border:`0.5px solid ${C.bdr}`}}>
                        <span style={{fontSize:11,color:C.text3,fontWeight:600,flexShrink:0}}>{i+1}</span>
                        <p style={{fontSize:11,color:C.text2}}>{s}</p>
                      </div>
                    ))}
                    <Ins type="d" html="El lead está caliente <strong>5–15 minutos</strong>. Después se enfría o se va."/>
                  </div>
                  <div>
                    <p style={{fontSize:11,fontWeight:600,color:C.green,marginBottom:8}}>CON IA — 24/7 &lt;3s</p>
                    {["IA responde en <3 segundos","Califica y verifica cobertura","Cotiza, maneja objeciones, cierra","Registra alta (con API ISP CUBE)"].map((s,i)=>(
                      <div key={i} style={{display:"flex",gap:8,marginBottom:8,padding:"8px 10px",background:C.greenP,borderRadius:8,border:`0.5px solid ${C.green}`}}>
                        <span style={{fontSize:11,color:C.green,fontWeight:600,flexShrink:0}}>{i+1}</span>
                        <p style={{fontSize:11,color:"#0F5226"}}>{s}</p>
                      </div>
                    ))}
                    <Ins type="g" html="+20% conversión por resp. inmediata → <strong>+54 altas/mes = +$1.48M/mes</strong>."/>
                  </div>
                </div>
              </Card>

              <Card title="Opciones de implementación">
                {[
                  {titulo:"Opción A — Typebot + Claude API",sub:"Para empezar · Sin programador · 1–2 semanas",costo:"~$200 USD/mes",color:C.blue,items:["Typebot (flujo visual): $50 USD/mes","Claude API (Anthropic): ~$8 USD/mes","WhatsApp Business API: ~$34 USD/mes","Configuración inicial: $500–1.000 USD única vez"]},
                  {titulo:"Opción B — Bot completo con ISP CUBE",sub:"Versión completa · opción A + 54h más",costo:"~$62 USD/mes",color:C.green,items:["Claude API + hosting: ~$28 USD/mes","WhatsApp Business API: ~$34 USD/mes","Desarrollo adicional: $0 — ya son suscriptores","Ventas + soporte + cobros integrados"]},
                ].map((op,i)=>(
                  <div key={i} style={{marginBottom:16,padding:"12px 14px",background:C.bg3,borderRadius:10,border:`0.5px solid ${C.bdr}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                      <div>
                        <p style={{fontSize:12,fontWeight:600,color:C.text}}>{op.titulo}</p>
                        <p style={{fontSize:10,color:C.text2}}>{op.sub}</p>
                      </div>
                      <span style={{background:`${op.color}18`,color:op.color,padding:"3px 8px",borderRadius:9,fontSize:11,fontWeight:600,whiteSpace:"nowrap"}}>{op.costo}</span>
                    </div>
                    {op.items.map((it,j)=><p key={j} style={{fontSize:11,color:C.text2,marginBottom:2}}>• {it}</p>)}
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {/* ═══ PLAN DE MEJORAS ══════════════════════════════════════ */}
        {tab==="plan"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Potencial win-back + retención" value="+$7–16M/mes" sub="sin inversión adicional"             type="ok"/>
              <KPI label="Meta churn 6 meses"            value="2.9% → 1.5%" sub="+63 retenidos/mes = +$1.73M"        type="ok"/>
              <KPI label="Bloqueador principal"          value="ISP CUBE"    sub="sin API = sin IA operativa"           type="dn"/>
            </div>

            {[
              { fase:"Fase 1 · Esta semana", sub:"Sin desarrollo · Solo configuración", color:C.green, items:[
                {accion:"Duplicar Meta ($3k) + Google ($1k)", detalle:"CPL $13.27 USD sigue siendo bajo. +80 altas/mes inmediatas.", tipo:"solo presupuesto"},
                {accion:"Programa de referidos",              detalle:"4.194 activos × 2.5% = +105 altas/mes sin pauta adicional.", tipo:"sin desarrollo"},
                {accion:"Secuencia WSP cobro D5/15/25/30",    detalle:"Hoy: 1 campaña masiva. Con secuencia: 3× efectividad en recupero.", tipo:"sin desarrollo"},
                {accion:"Win-back 1.682 inactivos",           detalle:"30% reactivación = +504 clientes = +$12.1M/mes.", tipo:"solo CSV"},
                {accion:"Onboarding WSP D0/2/7/30",           detalle:"30.7% churnea antes del mes 3. Secuencia automática reduce churn temprano 40%.", tipo:"sin desarrollo"},
              ]},
              { fase:"Fase 2 · Mes 1–2", sub:"Desbloquear el cuello de botella", color:C.amber, items:[
                {accion:"Desbloquear ISP CUBE",               detalle:"A: reclamo API. B: CSV nightly. C: scraping portal. Sin esto, Fase 3 no existe.", tipo:"técnico 1–2 días"},
                {accion:"IA ventas WSP (Typebot + Claude)",    detalle:"Responde en <3s, 24/7. +54 altas/mes + ahorra $1.5M ARS en equipo.", tipo:"~$600 USD mes 1"},
                {accion:"Migrar a débito automático SIRO",     detalle:"Meta: 40% cartera. Incentivo 5% descuento. SIRO ya en 9.8% — escalar.", tipo:"gestión comercial"},
                {accion:"Upsell 30/50 MB → 100 MB",           detalle:"511 clientes en bajo ARPU. Campaña WSP con oferta especial = +$4.1M/mes.", tipo:"campaña WSP"},
                {accion:"Early warning automático D20",        detalle:"Sin pago en día 20 → WSP automático → escala operador si no responde.", tipo:"requiere API CUBE"},
              ]},
              { fase:"Fase 3 · Mes 2–5", sub:"IA + automatización completa", color:C.blue, items:[
                {accion:"Bot WSP completo (ventas+soporte+cobros)", detalle:"Atiende 24/7 sin operador en 70% de casos. El 30% escala con contexto.", tipo:"3–5 semanas dev"},
                {accion:"Score de riesgo de churn",            detalle:"Historial pagos + plan + antigüedad = score mensual. Alto riesgo → atención proactiva.", tipo:"modelo simple ML"},
                {accion:"Dashboard operativo en tiempo real",  detalle:"Cobranza del día, churns, clientes en riesgo. Sin exportar nada manualmente.", tipo:"4–6 semanas dev"},
                {accion:"Expansión Glew + Florencio Varela",   detalle:"Diversificar riesgo. AB = 53% clientes y 72% deuda. Zonas nuevas <6% mora.", tipo:"inversión en campo"},
              ]},
            ].map((f,fi)=>(
              <div key={fi} style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderRadius:12,overflow:"hidden",marginBottom:12}}>
                <div style={{padding:"12px 16px",background:`${f.color}12`,borderBottom:`0.5px solid ${f.color}30`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{width:8,height:8,borderRadius:"50%",background:f.color}}/>
                    <p style={{fontSize:13,color:f.color,fontWeight:600}}>{f.fase}</p>
                  </div>
                  <p style={{fontSize:11,color:C.text2}}>{f.sub}</p>
                </div>
                <div style={{padding:"4px 16px 8px"}}>
                  {f.items.map((it,ii)=><FaseItem key={ii} {...it} color={f.color}/>)}
                </div>
              </div>
            ))}

            <div style={{padding:"14px 16px",background:C.redP,border:`0.5px solid ${C.red}`,borderRadius:12}}>
              <p style={{fontSize:13,color:C.red,fontWeight:600,marginBottom:4}}>🔒 ISPCube es el único bloqueador real de toda la agenda de IA</p>
              <p style={{fontSize:12,color:"#891515",lineHeight:1.6}}>
                Resolverlo (API / CSV / scraping) activa la Fase 3 completa en 4–6 semanas y libera <strong>+$3M ARS/mes</strong> de beneficio inmediato. Sin esto, la IA opera con datos de 24hs de retraso.
              </p>
            </div>
          </div>
        )}

        <div style={{marginTop:28,textAlign:"center",color:C.text3,fontSize:11,paddingBottom:16}}>
          WeConnect · Dashboard Ejecutivo · Netsharing SA · Datos ISPCube + Supabase · {new Date().toLocaleDateString("es-AR")}
        </div>
      </div>
    </div>
  );
}
