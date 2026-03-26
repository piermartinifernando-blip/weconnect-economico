import { useState, useEffect, useMemo } from "react";
import { supabase } from "./supabase";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine
} from "recharts";

/* ─── MOBILE HOOK ───────────────────────────────────────────────── */
const useIsMobile = () => {
  const [mob, setMob] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : false);
  useEffect(() => {
    const fn = () => setMob(window.innerWidth < 768);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return mob;
};

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
  // ══════════════════════════════════════════════════════════════
  // FUENTE ÚNICA DE VERDAD — actualizar solo este bloque con CSVs
  // Última actualización: Mar 26 2026
  // ══════════════════════════════════════════════════════════════

  // ── NEGOCIO: serie histórica ago24→mar26 ──
  LABELS:["24/08","24/09","24/10","24/11","24/12","25/01","25/02","25/03","25/04","25/05","25/06","25/07","25/08","25/09","25/10","25/11","25/12","26/01","26/02","26/03"],
  COBROS:[5.66,7.59,12.62,18.00,24.57,30.87,31.64,41.41,44.76,47.42,62.50,64.90,70.20,76.62,78.08,85.40,92.87,95.98,95.19,100.83],
  BILLS: [5.65,9.97,16.29,22.40,29.73,36.10,38.83,43.76,46.60,54.29,123.43,73.47,63.24,96.19,91.04,103.91,86.50,109.02,61.91,89.45],

  // ── NEGOCIO: últimos 8 meses ──
  M8:["Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26"],
  COBROS_M8:[70.20,76.62,78.08,85.40,92.87,95.98,95.19,100.83],

  // ── CANALES: últimos 8 meses ($M) ──
  MP8:  [55.96,60.37,60.56,66.35,74.84,66.89,71.73,70.36],
  SIRO8:[0.00, 0.00, 0.00, 0.42, 0.81, 1.33, 5.45,10.90],
  VISA8:[4.82, 6.03, 6.98, 7.78, 7.33, 8.93, 8.10, 8.71],
  PF8:  [4.16, 4.52, 4.66, 5.87, 4.95, 4.65, 4.05, 5.14],
  CAJA8:[3.15, 3.59, 3.72, 3.28, 3.56, 3.71, 3.37, 3.89],
  GAL8: [2.12, 2.11, 2.16, 1.69, 1.37,10.47, 2.51, 1.84],

  // ── MES ACTUAL: Mar 26 ──
  COB_ACTUAL:  100.83,   // cobrado total
  COB_PREV:     95.19,   // mes anterior (Feb 26)
  COB_VAR_PCT:   5.9,    // % variación
  SIRO_ABS:     10.90,   // SIRO $M
  SIRO_PCT:     10.8,    // SIRO % del cobrado
  MP_ABS:       70.36,   // MP $M
  MP_PCT:       69.8,    // MP %
  FACT_ACTUAL:  89.45,   // facturado Mar 26

  // ── CLIENTES: estado actual ──
  HAB:   4196,    // habilitados
  BLOQ:   234,    // bloqueados
  SS:    1556,    // sin servicio
  TOTAL: 5986,    // total padrón

  // ── CLIENTES: altas y churns últimos 8 meses ──
  ALTAS_M:["Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26"],
  ALTAS_V: [182, 176, 276, 193, 186, 219, 172, 152],  // altas habilitados por mes
  CHURNS_V:[104, 107, 109, 114, 116, 118, 121,  97],  // churns estimados

  // ── CHURN: serie mensual ──
  CHURN_PCT_ACT: 2.3,   // % actual Mar 26
  CHURN_ABS_ACT:  97,   // clientes/mes Mar 26
  CHURN_MENS:[
    {mes:"Sep 24",pct:2.1,cant:59}, {mes:"Oct 24",pct:2.3,cant:67}, {mes:"Nov 24",pct:2.0,cant:60}, {mes:"Dic 24",pct:1.9,cant:59},
    {mes:"Ene 25",pct:2.2,cant:70}, {mes:"Feb 25",pct:2.4,cant:79}, {mes:"Mar 25",pct:2.6,cant:88}, {mes:"Abr 25",pct:2.8,cant:101},
    {mes:"May 25",pct:2.7,cant:100},{mes:"Jun 25",pct:2.9,cant:110},{mes:"Jul 25",pct:3.1,cant:121},{mes:"Ago 25",pct:3.0,cant:119},
    {mes:"Sep 25",pct:2.9,cant:116},{mes:"Oct 25",pct:2.8,cant:116},{mes:"Nov 25",pct:2.6,cant:107},{mes:"Dic 25",pct:2.7,cant:109},
    {mes:"Ene 26",pct:2.5,cant:105},{mes:"Feb 26",pct:2.4,cant:101},{mes:"Mar 26",pct:2.3,cant:97},
  ],

  // ── COHORTS churn acumulado ──
  COHORTS:[
    {c:"Cohorte 2024 Q1-Q2 (>18m)",  pct:34.2, inact:312, color:"#D13030"},
    {c:"Cohorte 2024 Q3-Q4 (12-18m)", pct:28.7, inact:418, color:"#C47A00"},
    {c:"Cohorte 2025 Q1-Q2 (6-12m)",  pct:18.4, inact:521, color:"#C47A00"},
    {c:"Cohorte 2025 Q3-Q4 (3-6m)",   pct:10.6, inact:218, color:"#1A7A3C"},
    {c:"Cohorte 2026 (0-3m)",          pct:4.1,  inact:87,  color:"#1A7A3C"},
  ],

  // ── PLANES habilitados ──
  PLANES:[
    {plan:"100 MB",  cli:2217, pct:52.8, color:"#38BDF8"},
    {plan:"300 MB",  cli:1379, pct:32.9, color:"#1A7A3C"},
    {plan:"50 MB",   cli:378,  pct:9.0,  color:"#7B5EA7"},
    {plan:"600 MB",  cli:110,  pct:2.6,  color:"#C47A00"},
    {plan:"30 MB",   cli:108,  pct:2.6,  color:"#1A5FBF"},
  ],

  // ── CIUDADES ──
  CIUDADES:[
    {ciudad:"Almirante Brown",    habilitados:1952, total:3128, deudaVenc:55.04},
    {ciudad:"Capitan Sarmiento",  habilitados:1314, total:1747, deudaVenc:12.04},
    {ciudad:"Ministro Rivadavia", habilitados:362,  total:410,  deudaVenc:1.96},
    {ciudad:"Glew",               habilitados:336,  total:402,  deudaVenc:2.60},
    {ciudad:"Longchamps",         habilitados:129,  total:154,  deudaVenc:0.62},
    {ciudad:"Florencio Varela",   habilitados:60,   total:94,   deudaVenc:1.19},
    {ciudad:"Burzaco",            habilitados:43,   total:51,   deudaVenc:0.24},
  ],
  CITY_NAMES:["AB","CS","MR","Glew","LCH","FV","Buz"],
  CITY_HAB:  [1952,1314,362,336,129,60,43],
  CITY_TOTAL:[3128,1747,410,402,154,94,51],
  CITY_MORA: [55.04,12.04,1.96,2.60,0.62,1.19,0.24],

  // ── MORA ──
  MORA_TOTAL:109.13, MORA_VENC:73.69, MORA_SS:58.91, MORA_BLOQ:7.18, MORA_HAB:7.60,
  MORA_MOROSOS:1790, // ss(1556) + bloq(234)
  MORA_PCT:29.9,     // morosos / total

  // ── OBJETIVOS: actuales y metas ──
  OBJ:{
    altas_actual:152,  altas_meta:420,   altas_pct:36.2,
    siro_actual:10.8,  siro_meta:40.0,   siro_pct:27.0,
    churn_actual:2.3,  churn_meta:1.5,   churn_pct:20.7, // % reducción lograda
    cajas_actual:150,  cajas_meta:150,   cajas_pct:100.0,
    inst_actual:152,   inst_meta:420,    inst_pct:36.2,
  },

  // ── COSTOS (manual — no viene de CSV) ──
  SS_ING:95.19, SS_OPEX:150.3, SS_CAPEX:33.0, SS_RES:-88.1, SS_RATIO:1.93,
  OPEX_CATS:["RRHH","Alquileres y oficinas","Equipamiento","Red e infraestructura","Comisiones ventas","Comisiones cobranza","Marketing","Impuestos y tasas","Tecnología"],
  OPEX_VALS:[67.00,12.50,8.20,22.80,9.50,6.20,3.80,11.10,9.30],
  CJ_LABS:["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
  CJ_INGS:[78.08,85.40,92.87,95.98,95.19],
  CJ_OPEX:[147.6,135.9,171.7,150.3,150.3],
  CJ_CAPEX:[0,0,0.1,25.0,33.0],

  // ── BREAK-EVEN proyección ──
  ARPU_COB:22447,

  // ── DATOS FALTANTES — compatibilidad con componentes ──
  ARPU: 27425,          // ARPU teórico (precio plan)
  CPL_ARS: 15926,       // CPL en ARS
  LTV_CAC: 59.5,
  PAYBACK_DIAS: 17,
  ALTAS: 152,
  CHURN_PCT: 2.3,
  CHURN_ABS: 97,
  CLIENTES: 4196,

  // Canales último mes (Mar 26)
  MP:   70.36, SIRO:  10.90, VISA: 8.71,
  PF:    5.14, CAJA:   3.89, GAL:  1.84,

  // Mora
  MORA_SS:   58.91, MORA_BLOQ: 7.18,
  MORA_VENC: 73.69,

  // Costos steady state
  SS_OPEX: 150.3, SS_CAPEX: 33.0, SS_RES: -88.1, SS_RATIO: 1.93,

  // P&L tabla completa
  CJ_LABS_FULL:["Oct 25","Nov 25","Dic 25","Ene 26","Feb 26"],
  CJ_RESS:  [-69.5,-50.5,-78.9,-79.3,-88.1],
  CJ_RATIO: [1.89,1.59,1.85,1.83,1.93],
  CJ_TOTAL: [147.6,135.9,171.8,175.3,183.3],

  // OPEX desglose
  OPEX_DATA:[67.00,12.50,8.20,22.80,9.50,6.20,3.80,11.10,9.30],
  OPEX_COLORS:["#1A5FBF","#0D7377","#7B5EA7","#C47A00","#1A7A3C","#D13030","#38BDF8","#9AACBC","#5A6A7A"],

  // ── VENDEDORES (manual) ──
  VEND_LABS:["Emanuel","Rodrigo","Agustina","Walter","Otros"],
  VEND_VALS:[89, 71, 54, 38, 22],

  // ── CIUDADES legacy (para compatibilidad) ──
  CITIES:["Almirante Brown","Capitan Sarmiento","Ministro Rivadavia","Glew","Longchamps","Florencio Varela","Burzaco"],
  CITY_CLI:[3128,1747,410,402,154,94,51],
  CITY_HAB_V:[1952,1314,362,336,129,60,43],
  CITY_MORA_V:[55.04,12.04,1.96,2.60,0.62,1.19,0.24],
  RED_PROJ:[
    {mes:"Hoy",   cajas:1000,cap:10500,pen:2.0,churn:2.90,altas:274, clientes:4196, cobrado:100.8,opex:150.3,capex:0, costo:150.3,neto:-49.5},
    {mes:"Abr 26",cajas:1150,cap:12075,pen:2.2,churn:2.78,altas:330, clientes:4196, cobrado:100.8,opex:150.3,capex:40,costo:190.3,neto:-89.5},
    {mes:"May 26",cajas:1300,cap:13650,pen:2.3,churn:2.67,altas:378, clientes:4409, cobrado:99.0, opex:150.3,capex:40,costo:190.3,neto:-91.3},
    {mes:"Jun 26",cajas:1450,cap:15225,pen:2.5,churn:2.55,altas:445, clientes:4669, cobrado:104.8,opex:150.3,capex:40,costo:190.3,neto:-85.5},
    {mes:"Jul 26",cajas:1600,cap:16800,pen:2.7,churn:2.43,altas:518, clientes:4995, cobrado:112.1,opex:150.3,capex:40,costo:190.3,neto:-78.2},
    {mes:"Ago 26",cajas:1750,cap:18375,pen:2.8,churn:2.32,altas:578, clientes:5392, cobrado:121.0,opex:150.3,capex:40,costo:190.3,neto:-69.3},
    {mes:"Sep 26",cajas:1900,cap:19950,pen:3.0,churn:2.20,altas:662, clientes:5845, cobrado:131.2,opex:150.3,capex:40,costo:190.3,neto:-59.1},
    {mes:"Oct 26",cajas:2050,cap:21525,pen:3.2,churn:2.08,altas:753, clientes:6378, cobrado:143.2,opex:150.3,capex:0, costo:150.3,neto: -7.1},
    {mes:"Nov 26",cajas:2200,cap:23100,pen:3.3,churn:1.97,altas:826, clientes:6998, cobrado:157.1,opex:150.3,capex:0, costo:150.3,neto:  6.8},
    {mes:"Dic 26",cajas:2350,cap:24675,pen:3.5,churn:1.85,altas:928, clientes:7686, cobrado:172.5,opex:150.3,capex:0, costo:150.3,neto: 22.2},
    {mes:"Ene 27",cajas:2500,cap:26250,pen:3.7,churn:1.73,altas:1035,clientes:8472, cobrado:190.2,opex:150.3,capex:0, costo:150.3,neto: 39.9},
    {mes:"Feb 27",cajas:2650,cap:27825,pen:3.8,churn:1.62,altas:1121,clientes:9360, cobrado:210.1,opex:150.3,capex:0, costo:150.3,neto: 59.8},
    {mes:"Mar 27",cajas:2800,cap:29400,pen:4.0,churn:1.50,altas:1240,clientes:10329,cobrado:231.9,opex:150.3,capex:0, costo:150.3,neto: 81.6},
    {mes:"Abr 27",cajas:2950,cap:30975,pen:4.2,churn:1.50,altas:1365,clientes:11414,cobrado:256.2,opex:150.3,capex:0, costo:150.3,neto:105.9},
    {mes:"May 27",cajas:3000,cap:31500,pen:4.3,churn:1.50,altas:1418,clientes:12608,cobrado:283.0,opex:150.3,capex:0, costo:150.3,neto:132.7},
    {mes:"Jun 27",cajas:3000,cap:31500,pen:4.5,churn:1.50,altas:1482,clientes:13837,cobrado:310.6,opex:150.3,capex:0, costo:150.3,neto:160.3},
    {mes:"Sep 27",cajas:3000,cap:31500,pen:5.0,churn:1.50,altas:1639,clientes:15111,cobrado:339.2,opex:150.3,capex:0, costo:150.3,neto:188.9},
    {mes:"Dic 27",cajas:3000,cap:31500,pen:5.0,churn:1.50,altas:1639,clientes:16523,cobrado:370.9,opex:150.3,capex:0, costo:150.3,neto:220.6},
    {mes:"Mar 28",cajas:3000,cap:31500,pen:5.0,churn:1.50,altas:1639,clientes:17914,cobrado:402.1,opex:150.3,capex:0, costo:150.3,neto:251.8},
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
          {p.name}: {typeof p.value==="number" ? (Math.abs(p.value)<500 ? `$${p.value.toFixed(1)}M` : p.value.toLocaleString("es-AR")) : p.value}
        </p>
      ))}
    </div>
  );
};

// Tooltip para cantidades (clientes, altas, churns — sin formato $)
const TipCant = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:C.bg2, border:`1px solid ${C.bdr}`, borderRadius:8, padding:"10px 14px", boxShadow:"0 4px 16px rgba(13,27,42,0.12)", fontSize:12 }}>
      <p style={{ color:C.text2, fontSize:10, marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em", fontWeight:600 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||C.navy, margin:"2px 0", fontFamily:C.mono, fontWeight:600 }}>
          {p.name}: {typeof p.value==="number" ? p.value.toLocaleString("es-AR") : p.value}
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
  {id:"rrss",     label:"📣 Canales + IA"},

  {id:"recupero",  label:"📦 Recupero AB"},
  {id:"objetivos", label:"🎯 Objetivos"  },
];

/* ═══ MAIN ═══════════════════════════════════════════════════════ */
export default function App() {
  const mob                      = useIsMobile();
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
  const cityCobroData = D.CIUDADES.map(r=>({city:r.ciudad,mora:r.deudaVenc,habilitados:r.habilitados,cobrado:r.deudaVenc}));
  const vendData = D.VEND_LABS.map((l,i)=>({vend:l,val:D.VEND_VALS[i]}));
  const altasData = D.ALTAS_M.map((m,i)=>({mes:m,altas:D.ALTAS_V[i],churns:D.CHURNS_V[i],neto:D.ALTAS_V[i]-D.CHURNS_V[i]}));
  const plData = D.CJ_LABS_FULL.map((l,i)=>({
    mes:l, cobrado:D.CJ_INGS[i], opex:D.CJ_OPEX[i],
    capex:D.CJ_CAPEX[i], total:D.CJ_TOTAL[i],
    res:D.CJ_RESS[i], ratio:D.CJ_RATIO[i]
  }));
  // Agregar fila Mar 26 en curso y Steady state para la tabla
  const plDataTabla = [
    ...plData,
    {mes:"Mar 26 en curso", cobrado:93.9, opex:null, capex:null, total:null, res:null, ratio:null, parcial:true},
    {mes:"Steady state (ene-feb)", cobrado:D.SS_ING, opex:D.SS_OPEX, capex:D.SS_CAPEX, total:D.SS_ING+D.SS_OPEX+D.SS_CAPEX, res:D.SS_RES, ratio:D.SS_RATIO, steady:true},
  ];
  const opexStackData = D.CJ_LABS.map((l,i)=>{
    const row={mes:l};
    D.OPEX_CATS.forEach(cat=>{ row[cat]=(D.OPEX_DATA[cat]||[])[i]||0; });
    return row;
  });
  const OPEX_BASE = 150.3;   // real ene-feb 26
  const ARPU_BE   = 22447;   // ARPU cobrado real (no teórico)
  const beData    = D.RED_PROJ;

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
        @media(max-width:768px){
          body{font-size:13px}
          table{font-size:11px}
        }
      `}</style>
      {/* viewport meta via useEffect */}

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
                fontSize:mob?11:12,padding:mob?"7px 8px":"7px 13px",borderRadius:7,border:"none",cursor:"pointer",fontFamily:C.sans,
                fontWeight:tab===t.id?600:500,whiteSpace:"nowrap",transition:"all .15s",
                background:tab===t.id?C.navy:"transparent",
                color:tab===t.id?"#fff":C.text2,
                boxShadow:tab===t.id?"0 2px 6px rgba(13,27,42,.28)":"none",
              }}>{mob ? t.label.split(" ")[0] : t.label}</button>
            ))}
          </div>
        </div>

        {/* ═══ NEGOCIO ═══════════════════════════════════════════════ */}
        {tab==="negocio"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Cobranza Dic 2025" value="$92.6M" sub="▲ +7.4% vs noviembre" type="ok"/>
              <KPI label="Cobranza Feb 2026" value={`$${D.COB_PREV}M`} sub="mes completo" type="ok"/>
              <KPI label="Cobranza Feb 2026" value="$95.4M" sub="mes completo · datos frescos" type="ok"/>
              <KPI label="Cobro Mar 2026"    value={`$${D.COB_ACTUAL}M`} sub={`★ primer mes +$100M · SIRO $${D.SIRO_ABS}M · +${D.COB_VAR_PCT}% vs feb`} type="ok"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Cobrado vs facturado mensual ($M) — jul 24 → mar 26">
                <div style={{display:"flex",gap:16,marginBottom:10}}>
                  {[{color:C.blue,label:"Cobrado"},{color:"rgba(26,95,191,.3)",label:"Facturado"}].map((l,i)=>(
                    <span key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.text2}}>
                      <span style={{width:12,height:3,background:l.color,borderRadius:2,display:"inline-block"}}/>
                      {l.label}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={cobVsFac}>
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

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
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

            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:10,marginBottom:14}}>
              <KPI label="ARPU cobrado real"   value="$22.447"   sub="promedio cobrado ene-feb 26 · precio plan $26.254" type="nv"/>
              <KPI label="Tasa cobranza mar-26" value={`${(D.COB_ACTUAL/D.MORA_TOTAL*100).toFixed(0)}%`} sub={`$${D.COB_ACTUAL}M cobrado / $${D.MORA_TOTAL}M facturado`} type="wr"/>
              <KPI label="SIRO Mar 26"               value={`$${D.SIRO_ABS}M`} sub={`▲ desde $0 oct 25 · ${D.SIRO_PCT}% del cobrado`} type="ok"/>
            </div>
          </div>
        )}

        {/* ═══ COSTOS ════════════════════════════════════════════════ */}
        {tab==="costos"&&(
          <div>
            {/* KPIs exactos del HTML viejo */}
            <div style={{background:C.blueP,border:`0.5px solid ${C.blue}`,borderRadius:8,padding:"9px 14px",marginBottom:14,fontSize:12,color:"#103B8A"}}>
              Egresos reales oct 2025–feb 2026. Marzo en curso. CAPEX separado. Datos ISP CUBE al {new Date().toLocaleDateString("es-AR")}.
            </div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="OPEX steady state"    value="$150.3M"  sub="ARS/mes · ene-feb 2026"                  type="dn"/>
              <KPI label="Déficit mensual"      value="−$42.5M"  sub="4.106 cli × $26.254 = $107.8M"           type="dn"/>
              <KPI label="Clientes para BE"     value="5.725"    sub="faltan 1.619 · ARPU $26.254"              type="wr"/>
              <KPI label="CAPEX red AB ($M)"    value="$58.2M"   sub="OLT + Construcción · no recurrente"       type="nv"/>
            </div>

            {/* Tabla P&L exacta */}
            <Card title="P&L mensual real — CAPEX separado ($M ARS)" style={{marginBottom:12}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead>
                  <tr style={{background:C.bg3}}>
                    {["Mes","Ingresos","OPEX","CAPEX","Resultado","Ratio"].map(h=>(
                      <th key={h} style={{padding:"9px 12px",textAlign:h==="Mes"?"left":"right",color:C.text2,fontSize:10,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {mes:"Oct 2025 corregido", ing:78.0,  opex:147.5, capex:0,    res:-69.5, ratio:1.89, note:""},
                    {mes:"Nov 2025",           ing:86.3,  opex:135.9, capex:0,    res:-49.6, ratio:1.58, note:""},
                    {mes:"Dic 2025 SAC",       ing:92.6,  opex:171.6, capex:0.1,  res:-78.9, ratio:1.85, note:""},
                    {mes:"Ene 2026",           ing:95.5,  opex:150.3, capex:25.0, res:-54.8, ratio:1.57, note:""},
                    {mes:"Feb 2026",           ing:95.4,  opex:150.3, capex:33.0, res:-54.9, ratio:1.57, note:""},
                  ].map((r,i)=>(
                    <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`}}>
                      <td style={{padding:"9px 12px",color:C.text,fontWeight:600}}>{r.mes}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.blue,fontWeight:600}}>${r.ing}M</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.red}}>${r.opex}M</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.amber}}>{r.capex>0?`$${r.capex}M`:"$0"}</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,fontWeight:700,color:C.red}}>${r.res}M</td>
                      <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.text2}}>{r.ratio}x</td>
                    </tr>
                  ))}
                  {/* Mar 26 en curso */}
                  <tr style={{borderBottom:`0.5px solid ${C.bdr}`,background:C.amberP}}>
                    <td style={{padding:"9px 12px",fontWeight:600}}>
                      Mar 2026 en curso <span style={{fontSize:10,color:C.amber,fontWeight:400}}>en curso</span>
                    </td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.amber,fontWeight:600}}>$93.9M <span style={{fontSize:9,color:C.amber}}>(al 22/3, oficial ISP CUBE)</span></td>
                    <td colSpan={3} style={{padding:"9px 12px",textAlign:"center",color:C.text2,fontSize:11}}>Egresos pendientes · mes en curso</td>
                    <td style={{padding:"9px 12px",textAlign:"right",color:C.text3}}>—</td>
                  </tr>
                  {/* Steady state */}
                  <tr style={{background:C.blueP,fontWeight:700}}>
                    <td style={{padding:"9px 12px",color:C.blue,fontWeight:700}}>Steady state (ene-feb)</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.blue,fontWeight:700}}>$95.4M</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.red, fontWeight:700}}>$150.3M</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.amber,fontWeight:700}}>$29.0M</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.red, fontWeight:700}}>−$54.9M</td>
                    <td style={{padding:"9px 12px",textAlign:"right",fontFamily:C.mono,color:C.text2,fontWeight:700}}>1.57x</td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Gráficos */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Ingresos vs OPEX ($M)">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={plData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}/>
                    <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                    <Tooltip content={<Tip/>}/>
                    <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                    <Bar dataKey="cobrado" name="Ingresos" fill={C.blue}  radius={[3,3,0,0]}/>
                    <Bar dataKey="opex"    name="OPEX"     stackId="c" fill={C.red}   radius={[0,0,0,0]}/>
                    <Bar dataKey="capex"   name="CAPEX"    stackId="c" fill={C.amber} radius={[3,3,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title="Estructura OPEX — prom 5 meses">
                {D.OPEX_CATS.map((cat,i)=>{
                  const vals = D.OPEX_DATA[cat]||[];
                  const avg = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
                  return <Prog key={i} label={cat} value={avg} max={63.24} display={fM(avg)} color={D.OPEX_COLORS[i]}/>;
                })}
              </Card>
            </div>

            <Card title="OPEX apilado por categoría — 5 meses ($M)">
              <ResponsiveContainer width="100%" height={200}>
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

            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:10,marginTop:12}}>
              <KPI label="RRHH ene-feb"     value="$67.2M"  sub="45% OPEX · dic $85.9M (SAC atípico)"    type="dn"/>
              <KPI label="CAPEX obra total" value="~$240M"  sub="$40M × 6 meses · abr-sep 26"            type="wr"/>
              <KPI label="Ingreso marginal" value="$26.254" sub="ARS por cada cliente nuevo"              type="nv"/>
            </div>
          </div>
        )}

        {tab==="clientes"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Total padrón"          value={D.TOTAL.toLocaleString("es-AR")} sub="desde agosto 2024"                   type="nv"/>
              <KPI label="Habilitados"          value={D.HAB.toLocaleString("es-AR")} sub={`${(D.HAB/D.TOTAL*100).toFixed(1)}% del padrón`}                    type="ok"/>
              <KPI label="Bloqueados"            value={D.BLOQ.toLocaleString("es-AR")} sub="en campaña de recupero · con deuda"   type="wr"/>
              <KPI label="Sin servicio"          value={D.SS.toLocaleString("es-AR")} sub={`nunca regularizaron · $${D.MORA_SS}M deuda`}   type="dn"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.5fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Altas, churns y crecimiento neto mensual">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={altasData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                    <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} label={{value:"clientes",angle:-90,position:"insideLeft",fill:C.text2,fontSize:9}}/>
                    <Tooltip content={<TipCant/>}/>
                    <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                    <Bar dataKey="altas"  name="Altas brutas"  fill={C.green}              radius={[3,3,0,0]}/>
                    <Bar dataKey="churns" name="Churns (2.9%)" fill="rgba(209,48,48,.55)" radius={[3,3,0,0]}/>
                    <Line type="monotone" dataKey="neto" name="Neto mensual" stroke={C.blue} strokeWidth={2.5} dot={{r:4,fill:C.blue}}/>
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
                {D.CIUDADES.map((r,i)=>(
                  <Prog key={i} label={c} value={D.CITY_CLI[i]} max={3128}
                    display={`${D.CITY_CLI[i].toLocaleString("es-AR")} (${Math.round(D.CITY_CLI[i]/5960*100)}%)`}
                    color={i<2?C.blue:C.green}/>
                ))}
              </Card>
            </div>

            {/* Curva neto ingreso - egresos */}
            <Card title="Curva neto: cobrado − OPEX − CAPEX ($M) · altas y churns reales (eje der.)" style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.text2,marginBottom:10,padding:"7px 10px",background:C.bg3,borderRadius:6,border:`0.5px solid ${C.bdr}`}}>
                <strong>Neto</strong> = cobrado − OPEX − CAPEX (total real por mes) ·
                <strong> Churns</strong> = 2.9% de base activa de cada mes · Eje izq: $M · Eje der: clientes
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={[
                  {mes:"Oct 25", neto:-69.5,  altas:368, churns:107},
                  {mes:"Nov 25", neto:-50.5,  altas:247, churns:113},
                  {mes:"Dic 25", neto:-78.9,  altas:238, churns:119},
                  {mes:"Ene 26", neto:-104.4, altas:257, churns:122},
                  {mes:"Feb 26", neto:-88.1,  altas:195, churns:101},
                  {mes:"Mar 26", neto:-49.5,  altas:164, churns:97},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis yAxisId="left" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}
                    tickFormatter={v=>`$${v}M`}
                    label={{value:"$M ARS",angle:-90,position:"insideLeft",fill:C.text2,fontSize:9}}/>
                  <YAxis yAxisId="right" orientation="right" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}
                    label={{value:"clientes",angle:90,position:"insideRight",fill:C.text2,fontSize:9}}/>
                  <Tooltip content={<TipCant/>}/>
                  <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                  <ReferenceLine yAxisId="left" y={0} stroke={C.navy} strokeDasharray="4 3"
                    label={{value:"0",fill:C.navy,fontSize:10}}/>
                  <Area yAxisId="left" type="monotone" dataKey="neto"
                    name="Neto financiero ($M)" stroke={C.red} fill="rgba(209,48,48,0.12)" strokeWidth={2.5} dot={{r:4,fill:C.red}}/>
                  <Bar yAxisId="right" dataKey="altas"  name="Altas brutas"       fill={C.green} opacity={0.7} radius={[3,3,0,0]}/>
                  <Bar yAxisId="right" dataKey="churns" name="Churns reales (2.9%)" fill={C.red}   opacity={0.4} radius={[3,3,0,0]}/>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:8,marginTop:10}}>
                {[
                  {mes:"Ene 26",nota:"CAPEX OLT $25M → neto cae a −$104M",color:C.amber},
                  {mes:"Feb 26",nota:"CAPEX obra $33M → neto mín −$121M",color:C.red},
                  {mes:"Mar 26",nota:"Mes completo $100.8M · sin CAPEX registrado",color:C.green},
                ].map((n,i)=>(
                  <div key={i} style={{background:C.bg3,borderRadius:6,padding:"7px 10px",border:`0.5px solid ${C.bdr}`}}>
                    <p style={{fontSize:10,fontWeight:600,color:n.color}}>{n.mes}</p>
                    <p style={{fontSize:10,color:C.text2,marginTop:2}}>{n.nota}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* ═══ CHURN ═════════════════════════════════════════════════ */}
        {tab==="churn"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Churn acumulado"       value={`${(D.SS/D.TOTAL*100).toFixed(1)}%`} sub={`${D.SS.toLocaleString("es-AR")} de ${D.TOTAL.toLocaleString("es-AR")} inactivos`}   type="dn"/>
              <KPI label="Tasa mensual prom."    value={`${D.CHURN_PCT_ACT}%`} sub={`${D.CHURN_ABS_ACT} clientes/mes · mar 26`}            type="dn"/>
              <KPI label="Churn anual implícito" value="30.1%"    sub="1 de cada 3.8 / año"           type="wr"/>
              <KPI label="Vida media"            value="5.3 meses" sub="mediana: 3.9 meses"         type="wr"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
              <Card title="Tasa de churn mensual — % y cantidad de clientes">
                <ResponsiveContainer width="100%" height={240}>
                  <ComposedChart data={D.CHURN_MENS}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                    <XAxis dataKey="mes" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} interval={3}/>
                    <YAxis yAxisId="left" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`${v}%`} domain={[0,4]}/>
                    <YAxis yAxisId="right" orientation="right" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}/>
                    <Tooltip content={<TipCant/>}/>
                    <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                    <ReferenceLine yAxisId="left" y={2.9} stroke={C.amber} strokeDasharray="4 3" label={{value:"Prom 2.9%",fill:C.amber,fontSize:10,position:"right"}}/>
                    <ReferenceLine yAxisId="left" y={1.5} stroke={C.green} strokeDasharray="4 3" label={{value:"Meta 1.5%",fill:C.green,fontSize:10,position:"right"}}/>
                    <Bar  yAxisId="right" dataKey="cant" name="Clientes perdidos" fill={C.red} opacity={0.25} radius={[2,2,0,0]}/>
                    <Line yAxisId="left"  type="monotone" dataKey="pct" name="Churn %" stroke={C.red} strokeWidth={2.5} dot={false}/>
                  </ComposedChart>
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

            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:10,marginBottom:12}}>
              <KPI label="Churnan antes del mes 3"  value="30.7%" sub="problema de onboarding"      type="dn"/>
              <KPI label="Churnan entre mes 3–6"   value="38.8%" sub="primera renovación"           type="wr"/>
              <KPI label="Más de 12 meses activos" value="8.2%"  sub='los clientes "fieles"'        type="ok"/>
            </div>

            <Card title="Causas del churn y palancas de retención">
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(5,1fr)",gap:10}}>
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
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Deuda total cartera"  value={`$${D.MORA_TOTAL}M`} sub="total adeudado Mar 26"                         type="dn"/>
              <KPI label="Deuda vencida"        value={`$${D.MORA_VENC}M`} sub={`${D.SS} sin servicio + ${D.BLOQ} bloqueados`}          type="dn"/>
              <KPI label="Deuda sin servicio"   value={`$${D.MORA_SS}M`} sub="difícil recupero · nunca regularizaron"       type="dn"/>
              <KPI label="Deuda en recupero"    value={`$${D.MORA_BLOQ}M`} sub={`${D.BLOQ} bloqueados · campaña activa`}               type="wr"/>
            </div>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.5fr 1fr",gap:12,marginBottom:12}}>
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
                  {medio:"Caja / efectivo",   cant:"5.108",pct:85.7,color:C.red  },
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
                  {label:"Meta conservadora (20%)",ing:"+$8.7M/mes",cli:"311 clientes"},
                  {label:"Meta moderada (30%)",    ing:"+$13.1M/mes",cli:"467 clientes"},
                  {label:"Meta ambiciosa (40%)",   ing:"+$17.5M/mes",cli:"622 clientes"},
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

            {/* ── KPIs ── */}
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Break-even proyectado" value="Nov 26"  sub="con implementaciones · +$32.4M"        type="ok"/>
              <KPI label="Cobrado hoy"           value={`$${D.COB_ACTUAL}M`} sub={`real mar 26 · ARPU cobrado $${D.ARPU_COB.toLocaleString("es-AR")}`}    type="dn"/>
              <KPI label="Costo total hoy"       value="$150.3M" sub="OPEX base sin CAPEX obra"              type="dn"/>
              <KPI label="Costo con CAPEX obra"  value="$190.3M" sub="abr-sep 26 · $40M CAPEX incluido"     type="dn"/>
            </div>

            {/* ── GRÁFICO 1: SITUACIÓN REAL ── */}
            <Card title="① Situación real — ingresos vs egresos (OPEX + CAPEX) · oct 25 – mar 26" style={{marginBottom:12}}>
              <div style={{marginBottom:10,padding:"7px 10px",background:C.redP,borderRadius:6,border:`0.5px solid ${C.red}`,fontSize:11,color:"#891515"}}>
                Datos reales verificados · cobrado de CSV caja · egresos de Excel mensual · CAPEX separado
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={[
                  {mes:"Oct 25", cobrado:78.1,  opex:147.6, capex:0,    costo:147.6, neto:-69.5},
                  {mes:"Nov 25", cobrado:85.4,  opex:135.9, capex:0,    costo:135.9, neto:-50.5},
                  {mes:"Dic 25", cobrado:92.9,  opex:171.7, capex:0.1,  costo:171.8, neto:-78.9},
                  {mes:"Ene 26", cobrado:96.0,  opex:150.3, capex:25.0, costo:175.3, neto:-79.3},
                  {mes:"Feb 26", cobrado:95.2,  opex:150.3, capex:33.0, costo:183.3, neto:-88.1},
                  {mes:"Mar 26", cobrado:100.8, opex:150.3, capex:0,    costo:150.3, neto:-49.5},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="mes" tick={{fontSize:11,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                  <Bar dataKey="opex"    name="OPEX"    stackId="costo" fill={C.red}   radius={[0,0,0,0]}/>
                  <Bar dataKey="capex"   name="CAPEX"   stackId="costo" fill={C.amber} radius={[3,3,0,0]}/>
                  <Line type="monotone" dataKey="cobrado" name="Ingresos cobrados" stroke={C.blue} strokeWidth={2.5} dot={{r:5,fill:C.blue}}/>
                  <Line type="monotone" dataKey="neto"    name="Resultado neto"   stroke={C.navy} strokeWidth={1.5} strokeDasharray="4 3" dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>
              {/* Tabla resumen */}
              <div style={{overflowX:"auto",marginTop:10}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:mob?500:0}}>
                  <thead>
                    <tr style={{background:C.bg3}}>
                      {["Mes","Cobrado","OPEX","CAPEX","Total egresos","Resultado"].map(h=>(
                        <th key={h} style={{padding:"6px 10px",textAlign:h==="Mes"?"left":"right",color:C.text2,fontSize:9,textTransform:"uppercase",fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {mes:"Oct 25", cobrado:78.1,  opex:147.6, capex:0,    costo:147.6, neto:-69.5},
                      {mes:"Nov 25", cobrado:85.4,  opex:135.9, capex:0,    costo:135.9, neto:-50.5},
                      {mes:"Dic 25", cobrado:92.9,  opex:171.7, capex:0.1,  costo:171.8, neto:-78.9, nota:"SAC"},
                      {mes:"Ene 26", cobrado:96.0,  opex:150.3, capex:25.0, costo:175.3, neto:-79.3, nota:"OLT"},
                      {mes:"Feb 26", cobrado:95.2,  opex:150.3, capex:33.0, costo:183.3, neto:-88.1, nota:"Peor mes"},
                      {mes:"Mar 26", cobrado:100.8, opex:150.3, capex:0,    costo:150.3, neto:-49.5, nota:"Mes completo"},
                    ].map((r,i)=>(
                      <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`,background:i===4?C.redP:"transparent"}}>
                        <td style={{padding:"6px 10px",fontWeight:600,color:C.text}}>{r.mes} {r.nota&&<span style={{fontSize:9,color:C.amber}}>({r.nota})</span>}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",fontFamily:C.mono,color:C.blue,fontWeight:600}}>${r.cobrado}M</td>
                        <td style={{padding:"6px 10px",textAlign:"right",fontFamily:C.mono,color:C.red}}>${r.opex}M</td>
                        <td style={{padding:"6px 10px",textAlign:"right",fontFamily:C.mono,color:C.amber}}>{r.capex>0?`$${r.capex}M`:"—"}</td>
                        <td style={{padding:"6px 10px",textAlign:"right",fontFamily:C.mono,color:C.text2}}>${r.costo}M</td>
                        <td style={{padding:"6px 10px",textAlign:"right",fontFamily:C.mono,fontWeight:700,color:C.red}}>${r.neto}M</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* ── GRÁFICO 2: PROYECCIÓN CON IMPLEMENTACIONES ── */}
            <Card title="② Proyección con implementaciones — ingresos vs egresos · mar 26 → nov 26 (BE)" style={{marginBottom:12}}>
              <div style={{marginBottom:10,padding:"7px 10px",background:C.greenP,borderRadius:6,border:`0.5px solid ${C.green}`,fontSize:11,color:"#0F5226"}}>
                Incluye: IA ventas · migración SIRO · upsell 30/50→100MB · win-back 20% · red AB +150 cajas/mes
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <ComposedChart data={[
                  {mes:"Mar 26", cobrado:100.8, costo:150.3, neto:-49.5, nota:"Hoy"},
                  {mes:"Abr 26", cobrado:100.8, costo:190.3, neto:-89.5, nota:"Inicio CAPEX"},
                  {mes:"May 26", cobrado:98.8,  costo:190.3, neto:-91.5, nota:"+IA ventas"},
                  {mes:"Jun 26", cobrado:108.0, costo:190.3, neto:-82.3, nota:"+SIRO"},
                  {mes:"Jul 26", cobrado:119.7, costo:190.3, neto:-70.6, nota:"+Upsell"},
                  {mes:"Ago 26", cobrado:132.1, costo:190.3, neto:-58.2, nota:"+Win-back"},
                  {mes:"Sep 26", cobrado:146.3, costo:190.3, neto:-44.0, nota:"Stack completo"},
                  {mes:"Oct 26", cobrado:163.1, costo:150.3, neto:12.8,  nota:"Fin CAPEX"},
                  {mes:"Nov 26", cobrado:182.7, costo:150.3, neto:32.4,  nota:"★ BE"},
                ]}>
                  <defs>
                    <linearGradient id="gCob" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.blue} stopOpacity={0.15}/><stop offset="95%" stopColor={C.blue} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gCos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.red} stopOpacity={0.1}/><stop offset="95%" stopColor={C.red} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="mes" tick={{fontSize:10,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis tick={{fontSize:10,fill:C.text2}} stroke={C.bdr} tickFormatter={v=>`$${v}M`}/>
                  <Tooltip content={<Tip/>}/>
                  <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                  <ReferenceLine y={0} stroke={C.navy} strokeDasharray="3 3"/>
                  <ReferenceLine x="Oct 26" stroke={C.amber} strokeDasharray="4 3" label={{value:"Fin CAPEX",fill:C.amber,fontSize:10,position:"insideTopLeft"}}/>
                  <ReferenceLine x="Nov 26" stroke={C.green} strokeWidth={2} label={{value:"★ BE",fill:C.green,fontSize:11,position:"insideTopLeft"}}/>
                  <Area type="monotone" dataKey="cobrado" name="Ingresos proyectados" stroke={C.blue} fill="url(#gCob)" strokeWidth={2.5} dot={{r:4,fill:C.blue}}/>
                  <Area type="monotone" dataKey="costo"   name="OPEX + CAPEX"        stroke={C.red}  fill="url(#gCos)" strokeWidth={2}   dot={false}/>
                  <Line type="monotone" dataKey="neto"    name="Resultado neto"      stroke={C.green} strokeWidth={2} strokeDasharray="4 3" dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>

              {/* Hitos de implementación */}
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(4,1fr)",gap:8,marginTop:12}}>
                {[
                  {mes:"May 26", accion:"IA ventas WSP",     impacto:"+$2.2M/mes",  color:C.blue},
                  {mes:"Jun 26", accion:"Migración SIRO",    impacto:"+ARPU $2.2k", color:C.teal},
                  {mes:"Jul 26", accion:"Upsell 30/50→100MB",impacto:"+$4.1M/mes",  color:C.purple},
                  {mes:"Ago 26", accion:"Win-back 20%",      impacto:"+$8.1M/mes",  color:C.green},
                ].map((h,i)=>(
                  <div key={i} style={{background:C.bg3,border:`0.5px solid ${C.bdr}`,borderRadius:8,padding:"9px 12px",borderLeft:`3px solid ${h.color}`}}>
                    <p style={{fontSize:9,color:C.text3,marginBottom:3}}>{h.mes}</p>
                    <p style={{fontSize:11,fontWeight:600,color:C.text}}>{h.accion}</p>
                    <p style={{fontSize:11,fontFamily:C.mono,color:h.color,fontWeight:600,marginTop:3}}>{h.impacto}</p>
                  </div>
                ))}
              </div>
            </Card>

          </div>
        )}

        {/* ═══ REDES SOCIALES ════════════════════════════════════════ */}
        {tab==="rrss"&&(
          <div>

            {/* ── KPIs ── */}
            <Ins type="i" html="CPL <strong>corregido</strong>: Meta $1.8M ARS + Equipo ventas $2.5M ARS = $4.3M ARS total · 259 altas/mes · CPL = <strong>$15.926 ARS ($13.27 USD)</strong>"/>
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,margin:"12px 0 18px"}}>
              <KPI label="Inversión adquisición" value="$4.3M ARS" sub="Meta $1.8M + equipo WSP $2.5M" type="nv"/>
              <KPI label="CPL real corregido"    value="$15.926 ARS" sub="$13.27 USD · validado mar 26" type="wr"/>
              <KPI label="LTV / CAC"             value="59.5x"     sub="sigue siendo muy bueno"      type="ok"/>
              <KPI label="Payback"               value="17 días"   sub="0.58 meses"                  type="ok"/>
            </div>

            {/* ── META ADS ── */}
            <p style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>📘 Meta Ads — Facebook e Instagram</p>
            <Ins type="i" html="Meta <strong>interrumpe</strong> — el cliente no estaba buscando, pero el algoritmo lo encuentra porque tiene el perfil exacto: vive en la zona, es jefe de hogar, usa internet. Es el canal de generación de demanda."/>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10,margin:"12px 0"}}>
              {[
                {t:"1 · Targeting geográfico exacto",
                 d:"Meta permite delimitar la pauta por el <strong>polígono KML exacto</strong> de cobertura. Cada peso llega solo a zonas donde WeConnect tiene fibra tendida.",
                 box:"Universo AB + CS: <strong>~280.000 personas</strong> · CPM bajo · sin competir por audiencias masivas · Mínimo efectivo: $300 USD/mes"},
                {t:"2 · Segmentos de hogar",
                 d:"Meta tiene segmentos de <strong>recién mudados, inquilinos, primera vivienda y jefes de hogar</strong>. El que se muda cambia de proveedor en el 78% de los casos en los primeros 30 días.",
                 box:"~15.000 usuarios 'recién mudados' en AB solo · <strong>Nadie busca internet si ya tiene</strong> — Meta llega antes de que busquen"},
                {t:"3 · Lookalike de clientes actuales",
                 d:"Subir la base de <strong>4.088 clientes reales</strong> a Meta genera una audiencia 'parecida' de 200k-500k personas. El algoritmo optimiza hacia quienes más se parecen a quienes ya convirtieron.",
                 box:"Lookalike 1% reduce el CPL un <strong>35–40%</strong> vs audiencia fría · WeConnect ya tiene el activo — sin usarlo están pagando de más"},
              ].map((c,i)=>(
                <div key={i} style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderTop:`3px solid ${C.blue}`,borderRadius:10,padding:"14px 16px"}}>
                  <p style={{fontSize:10,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{c.t}</p>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.75,marginBottom:8}} dangerouslySetInnerHTML={{__html:c.d}}/>
                  <div style={{background:C.bg3,borderRadius:8,padding:"9px 11px",fontSize:11,color:C.text2,lineHeight:1.75}} dangerouslySetInnerHTML={{__html:c.box}}/>
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10,marginBottom:18}}>
              {[
                {t:"4 · Remarketing de visitantes web",
                 d:"Quien visita weconnect.com.ar y no convierte recibe un anuncio recordatorio. La decisión de cambiar de ISP es lenta — el cliente compara, espera, se olvida.",
                 extra:true},
                {t:"5 · Video corto en Reels e Instagram",
                 d:"Un video de 15 segundos con un speedtest de 300 Mbps en un hogar de la zona convierte <strong>2.3x más</strong> que imagen estática. No requiere agencia — solo el celular.",
                 box:"CPM de Reels es <strong>40% más bajo</strong> que feed de Facebook · Contenido fácil: speedtest real, instalación, cliente satisfecho · 3 videos/mes alcanza"},
              ].map((c,i)=>(
                <div key={i} style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderTop:`3px solid ${C.blue}`,borderRadius:10,padding:"14px 16px"}}>
                  <p style={{fontSize:10,fontWeight:600,color:C.blue,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{c.t}</p>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.75,marginBottom:c.extra?8:0}} dangerouslySetInnerHTML={{__html:c.d}}/>
                  {c.extra && (
                    <div style={{display:"flex",gap:10,marginTop:8}}>
                      <div style={{flex:1,background:C.redP,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                        <p style={{fontSize:10,color:C.text2}}>Conversión fría</p>
                        <p style={{fontSize:18,fontWeight:600,color:C.red}}>1–2%</p>
                      </div>
                      <div style={{flex:1,background:C.greenP,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                        <p style={{fontSize:10,color:C.text2}}>Conversión remarketing</p>
                        <p style={{fontSize:18,fontWeight:600,color:C.green}}>4–8%</p>
                      </div>
                    </div>
                  )}
                  {c.box && <div style={{background:C.bg3,borderRadius:8,padding:"9px 11px",fontSize:11,color:C.text2,lineHeight:1.75,marginTop:8}} dangerouslySetInnerHTML={{__html:c.box}}/>}
                </div>
              ))}
            </div>

            {/* ── GOOGLE ADS ── */}
            <p style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>🔍 Google Ads — Search, Display y Performance Max</p>
            <Ins type="g" html="Google <strong>captura intención</strong> — cuando alguien escribe 'internet fibra Almirante Brown' ya tomó la decisión de buscar. No hay que convencerlo. Es el canal de conversión de demanda existente."/>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10,margin:"12px 0"}}>
              {[
                {t:"1 · Search — captura intención exacta",
                 d:"Quien busca en Google ya decidió que quiere internet. Tasa de conversión <strong>15–22%</strong> vs 1–2% de Meta frío. Cada click es un lead calificado.",
                 box:"Keywords: 'internet fibra almirante brown' · 'cambiar proveedor internet glew' · 'precio internet 100mb capitan sarmiento' · <strong>~2.400 búsquedas/mes</strong> en zona",
                 cpc:"CPC estimado: $1.20–2.50 USD/click"},
                {t:"2 · Keywords de competencia",
                 d:"Pujar por <strong>'telecentro no funciona'</strong>, 'baja telecentro glew', 'alternativa fibertel zona sur' captura clientes activamente frustrados.",
                 box:"~800 búsquedas/mes · Conversión: <strong>20–30%</strong> — ya están enojados con el competidor · CPC: $1.80–3.20 USD",
                 ins:"Son los leads más calificados del mercado local."},
                {t:"3 · Long-tail de barrio",
                 d:"Keywords ultra específicas como <strong>'internet fibra Longchamps'</strong> o 'proveedor internet Ministro Rivadavia' — nadie más las puja. WeConnect debería dominarlas al 100%.",
                 box:"'internet burzaco fibra' · 'wifi glew instalacion' · 'fibra optica longchamps precio'",
                 cpc:"CPC: $0.40–0.80 USD · Conversión: 25–35%"},
              ].map((c,i)=>(
                <div key={i} style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderTop:`3px solid ${C.green}`,borderRadius:10,padding:"14px 16px"}}>
                  <p style={{fontSize:10,fontWeight:600,color:C.green,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{c.t}</p>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.75,marginBottom:8}} dangerouslySetInnerHTML={{__html:c.d}}/>
                  <div style={{background:C.bg3,borderRadius:8,padding:"9px 11px",fontSize:11,color:C.text2,lineHeight:1.75,marginBottom:c.cpc?7:0}} dangerouslySetInnerHTML={{__html:c.box}}/>
                  {c.cpc && <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:600,marginTop:7}}><span style={{color:C.text2}}>CPC estimado</span><span style={{color:C.green}}>{c.cpc.replace("CPC estimado: ","")}</span></div>}
                  {c.ins && <Ins type="g" html={c.ins}/>}
                </div>
              ))}
            </div>

            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10,marginBottom:18}}>
              {[
                {t:"4 · Google Display — remarketing en toda la web",
                 d:"Después de visitar weconnect.com.ar, el cliente ve banners de WeConnect en noticias, YouTube, Gmail. Mantiene la marca presente durante todo el proceso de decisión.",
                 box:"Alcanza al <strong>80% de los usuarios</strong> de internet en Argentina · CPC Display: $0.15–0.40 USD · Conversión: 3–6%"},
                {t:"5 · Performance Max — el algoritmo hace el trabajo",
                 d:"Combina Search + Display + YouTube + Gmail automáticamente con un solo presupuesto. Google distribuye hacia donde hay más conversiones.",
                 box:"CPC efectivo <strong>20–30% menor</strong> que campañas manuales · Requiere: pixel instalado + conversiones configuradas en el sitio"},
              ].map((c,i)=>(
                <div key={i} style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderTop:`3px solid ${C.green}`,borderRadius:10,padding:"14px 16px"}}>
                  <p style={{fontSize:10,fontWeight:600,color:C.green,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:8}}>{c.t}</p>
                  <p style={{fontSize:12,color:C.text,lineHeight:1.75,marginBottom:8}} dangerouslySetInnerHTML={{__html:c.d}}/>
                  <div style={{background:C.bg3,borderRadius:8,padding:"9px 11px",fontSize:11,color:C.text2,lineHeight:1.75}} dangerouslySetInnerHTML={{__html:c.box}}/>
                </div>
              ))}
            </div>

            {/* ── FUNNEL COMPLETO ── */}
            <p style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:10}}>🔄 Por qué los dos juntos — el funnel completo</p>
            <div style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderRadius:12,overflow:"hidden",marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":"repeat(4,1fr)"}}>
                {[
                  {etapa:"Awareness",  icon:"📘", canal:"Meta",          desc:"Interrumpe · muestra · genera conocimiento de marca en zona"},
                  {etapa:"Intención",  icon:"🔍", canal:"Google Search",  desc:"Captura cuando ya están buscando · 15–22% conversión"},
                  {etapa:"Decisión",   icon:"🎯", canal:"Remarketing",    desc:"Meta + Display Google · acompañan hasta el cierre · 4–8%"},
                  {etapa:"Conversión", icon:"🤖", canal:"Bot WSP IA",     desc:"Cierra 24/7 · responde en 3 seg · vende cuando el lead está caliente"},
                ].map((f,i)=>(
                  <div key={i} style={{padding:"12px 14px",borderRight:i<3?`0.5px solid ${C.bdr}`:"none",borderBottom:mob&&i<2?`0.5px solid ${C.bdr}`:"none",textAlign:"center"}}>
                    <p style={{fontSize:10,color:C.text2,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{f.etapa}</p>
                    <p style={{fontSize:20,marginBottom:5}}>{f.icon}</p>
                    <p style={{fontSize:12,fontWeight:600,color:C.navy}}>{f.canal}</p>
                    <p style={{fontSize:11,color:C.text2,marginTop:4,lineHeight:1.6}}>{f.desc}</p>
                  </div>
                ))}
              </div>
              <div style={{borderTop:`0.5px solid ${C.bdr}`,padding:"10px 14px",display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
                <Ins type="d" html="Sin Meta solo: capturás intención existente pero no generás demanda nueva. El volumen de altas tiene techo."/>
                <Ins type="d" html="Sin Google solo: generás demanda pero perdés los leads que van a buscar a Google antes de decidir — y hay competidores ahí."/>
              </div>
            </div>

            {/* ── SIMULADOR DE CANALES ── */}
            <Card title="Simulador de canales — 3 escenarios · altas brutas · churn · neto">

              {/* Leyenda */}
              <div style={{display:"flex",gap:16,marginBottom:14,flexWrap:"wrap",fontSize:11,padding:"8px 10px",background:C.bg3,borderRadius:8,border:`0.5px solid ${C.bdr}`}}>
                <span style={{color:C.text2,fontWeight:600}}>Criterio:</span>
                {[
                  {color:C.green, label:"Altas brutas = orgánico 239 + leads × conv%"},
                  {color:C.red,   label:"Churn = 2.9% base activa = 131/mes (fijo)"},
                  {color:C.blue,  label:"Neto = altas − churn"},
                ].map((l,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:8,height:8,borderRadius:2,background:l.color,flexShrink:0}}/>
                    <span style={{color:C.text2}}>{l.label}</span>
                  </div>
                ))}
              </div>

              {[
                {
                  num:"1", label:"Escenario 1 — Estado actual",
                  tag:"ACTUAL MAR 26", tagColor:C.amber, tagBg:C.amberP,
                  color:C.amber,
                  canales:[
                    {canal:"Meta Ads",  inv:1500, cpl:13.27, conv:18, leads:113, extra:20, color:C.amber},
                    {canal:"Google",    inv:0,    cpl:0,     conv:0,  leads:0,   extra:0,  color:C.text3, off:true},
                    {canal:"TikTok",    inv:0,    cpl:0,     conv:0,  leads:0,   extra:0,  color:C.text3, off:true},
                    {canal:"Orgánico",  inv:0,    cpl:0,     conv:0,  leads:0,   extra:239,color:C.text2, org:true},
                  ],
                  altas:259, churn:131, neto:128,
                  inv_usd:1500, ingreso:7.1, ingreso_neto:3.5, cpa:75.0,
                  nota:"113 leads Meta × 18% conv = 20 altas extra · validado datos reales",
                },
                {
                  num:"2", label:"Escenario 2 — Multi-canal inicial",
                  tag:"RECOMENDADO ARRANQUE", tagColor:C.blue, tagBg:C.blueP,
                  color:C.blue,
                  canales:[
                    {canal:"Meta Ads",   inv:1500, cpl:13.27, conv:18, leads:113, extra:20, color:C.amber},
                    {canal:"Google Ads", inv:800,  cpl:11.50, conv:25, leads:70,  extra:17, color:C.blue},
                    {canal:"TikTok Ads", inv:200,  cpl:8.50,  conv:15, leads:24,  extra:4,  color:"#8B5CF6"},
                    {canal:"Orgánico",   inv:0,    cpl:0,     conv:0,  leads:0,   extra:239,color:C.text2, org:true},
                  ],
                  altas:280, churn:131, neto:149,
                  inv_usd:2500, ingreso:7.7, ingreso_neto:4.1, cpa:61.0,
                  nota:"CPA baja a $61 USD por diversificación · +21 altas vs Esc 1",
                },
                {
                  num:"3", label:"Escenario 3 — Full stack",
                  tag:"OBJETIVO 6 MESES", tagColor:C.green, tagBg:C.greenP,
                  color:C.green,
                  canales:[
                    {canal:"Meta Ads",   inv:3000, cpl:8.23,  conv:21.6,leads:365, extra:79,  color:C.amber,   nota:"CPL −38% con Lookalike + IA conv +20%"},
                    {canal:"Google Ads", inv:1000, cpl:11.50, conv:30,  leads:87,  extra:26,  color:C.blue,    nota:"Conv +20% con IA WSP respondiendo"},
                    {canal:"TikTok Ads", inv:500,  cpl:8.50,  conv:18,  leads:59,  extra:11,  color:"#8B5CF6", nota:"Conv +20% con IA · awareness zona nueva"},
                    {canal:"Remarketing",inv:0,    cpl:4,     conv:6,   leads:286, extra:17,  color:C.teal,    nota:"Leads no conv vuelven · CPL ~$4 USD"},
                    {canal:"Referidos",  inv:0,    cpl:0,     conv:0,   leads:0,   extra:30,  color:C.text2,   org:true, nota:"Programa activo · 4k+ clientes base"},
                    {canal:"Orgánico",   inv:0,    cpl:0,     conv:0,   leads:0,   extra:239, color:C.text3,   org:true, nota:"Base calibrada"},
                  ],
                  altas:402, churn:131, neto:271,
                  inv_usd:4500, ingreso:11.0, ingreso_neto:7.4, cpa:35.4,
                  nota:"Lookalike + IA + Remarketing + Referidos · modelo realista mes 3+",
                  detalle:true,
                },
              ].map((e,ei)=>(
                <div key={ei} style={{
                  background:C.bg2, border:`0.5px solid ${e.borderColor||e.color}`,
                  borderRadius:12, padding:"16px 18px", marginBottom:12,
                  borderLeft:`4px solid ${e.color}`,
                }}>
                  {/* Header */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:28,height:28,borderRadius:"50%",background:`${e.color}18`,border:`1px solid ${e.color}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontSize:13,fontWeight:700,color:e.color}}>{e.num}</span>
                      </div>
                      <div>
                        <p style={{fontSize:13,fontWeight:600,color:C.text}}>{e.label}</p>
                        <p style={{fontSize:10,color:C.text3}}>{e.nota}</p>
                      </div>
                    </div>
                    <span style={{background:e.tagBg,color:e.tagColor,fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:9,whiteSpace:"nowrap"}}>{e.tag}</span>
                  </div>

                  {/* Desglose por canal */}
                  <div style={{marginBottom:12}}>
                    <p style={{fontSize:9,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:6,fontWeight:600}}>Desglose por canal</p>
                    <div style={{display:"grid",gridTemplateColumns:mob?"1fr 1fr":e.detalle?"repeat(3,1fr)":"repeat(4,1fr)",gap:6}}>
                      {e.canales.map((c,ci)=>(
                        <div key={ci} style={{background:C.bg3,border:`0.5px solid ${C.bdr}`,borderRadius:8,padding:"8px 10px",opacity:c.off?0.4:1}}>
                          <p style={{fontSize:10,fontWeight:600,color:c.off?C.text3:c.color}}>{c.canal}</p>
                          {c.off ? (
                            <p style={{fontSize:10,color:C.text3,marginTop:3}}>sin pauta</p>
                          ) : c.org ? (
                            <>
                              <p style={{fontSize:9,color:C.text3,margin:"2px 0"}}>{c.nota}</p>
                              <p style={{fontSize:12,fontFamily:C.mono,fontWeight:700,color:C.text2,marginTop:3}}>{c.extra} altas</p>
                            </>
                          ) : (
                            <>
                              <p style={{fontSize:9,color:C.text3,margin:"2px 0"}}>{c.inv>0?`$${c.inv.toLocaleString()} USD · CPL $${c.cpl}`:c.nota}</p>
                              <p style={{fontSize:9,color:C.text3}}>{c.leads>0?`${c.leads} leads × ${c.conv}%`:""}</p>
                              {c.nota&&c.inv>0&&<p style={{fontSize:9,color:c.color,marginTop:1}}>{c.nota}</p>}
                              <p style={{fontSize:12,fontFamily:C.mono,fontWeight:700,color:C.green,marginTop:3}}>+{c.extra} altas</p>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Nota aclaratoria Esc 3 */}
                    {e.detalle&&<div style={{marginTop:8,padding:"8px 10px",background:C.greenP,borderRadius:8,border:`0.5px solid ${C.green}`,fontSize:11,color:"#0F5226"}}>
                      <strong>Por qué 402 y no 311:</strong> el modelo simple solo cuenta leads directos. Con <strong>Lookalike</strong> (CPL Meta −38%), <strong>IA WSP</strong> (+20% conv), <strong>Remarketing</strong> (+17 altas de leads que vuelven) y <strong>programa de referidos</strong> (+30), el número real en mes 3+ es significativamente mayor.
                    </div>}
                  </div>

                  {/* Resultado: altas / churn / neto */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                    <div style={{background:C.greenP,border:`0.5px solid ${C.green}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                      <p style={{fontSize:9,color:"#0F5226",textTransform:"uppercase",fontWeight:600,marginBottom:4}}>Altas brutas</p>
                      <p style={{fontSize:26,fontFamily:C.mono,fontWeight:700,color:C.green}}>{e.altas}</p>
                      <p style={{fontSize:9,color:"#0F5226",marginTop:2}}>${e.ingreso}M ARS/mes</p>
                    </div>
                    <div style={{background:C.redP,border:`0.5px solid ${C.red}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                      <p style={{fontSize:9,color:"#891515",textTransform:"uppercase",fontWeight:600,marginBottom:4}}>Churn (−)</p>
                      <p style={{fontSize:26,fontFamily:C.mono,fontWeight:700,color:C.red}}>−131</p>
                      <p style={{fontSize:9,color:"#891515",marginTop:2}}>$3.6M ARS perdidos</p>
                    </div>
                    <div style={{background:`${e.color}12`,border:`0.5px solid ${e.color}`,borderRadius:8,padding:"10px 12px",textAlign:"center"}}>
                      <p style={{fontSize:9,color:e.color,textTransform:"uppercase",fontWeight:600,marginBottom:4}}>Neto mensual</p>
                      <p style={{fontSize:26,fontFamily:C.mono,fontWeight:700,color:e.color}}>+{e.neto}</p>
                      <p style={{fontSize:9,color:e.color,marginTop:2}}>${e.ingreso_neto}M ARS/mes</p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:10,paddingTop:8,borderTop:`0.5px solid ${C.bdr}`,fontSize:11,flexWrap:"wrap",gap:6}}>
                    <span style={{color:C.text2}}>Inversión: <strong style={{color:C.text}}>${e.inv_usd.toLocaleString()} USD/mes</strong></span>
                    <span style={{color:C.text2}}>CPA real: <strong style={{color:e.color}}>${e.cpa} USD/alta</strong></span>
                  </div>
                </div>
              ))}

              <div style={{padding:"10px 14px",background:C.redP,border:`0.5px solid ${C.red}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <p style={{fontSize:11,color:C.red,fontWeight:600}}>⚠ El churn consume 131 clientes/mes = $3.6M ARS en todos los escenarios</p>
                <p style={{fontSize:11,color:"#891515",fontFamily:C.mono,fontWeight:700}}>Reducir al 1.5% libera +$1.9M/mes adicionales</p>
              </div>
            </Card>

          </div>
        )}

        {tab==="recupero"&&(
          <div>
            {/* KPIs principales */}
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="ONUs pendientes AB"    value="497"      sub="64% del backlog total"              type="dn"/>
              <KPI label="Valor neto recuperable" value="$25.5M"  sub="497 × $51.408 neto · ARS"           type="ok"/>
              <KPI label="Costo fijo mensual"     value="$2.25M"  sub="salario + cargas · sin movilidad"   type="nv"/>
              <KPI label="ROI peor caso"          value="1.42x"   sub="positivo desde el día 1"            type="ok"/>
            </div>

            <Ins type="i" html="<strong>Área nueva:</strong> Retiro / Recupero de Equipos — Almirante Brown · 1 persona con vehículo propio · Combustible incluido en salario · TC $1.450 ARS/USD · ONU: USD 35 + IVA = $61.408 ARS"/>

            {/* Estructura del puesto + comisiones */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,margin:"12px 0"}}>
              <Card title="Estructura del puesto">
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:C.bg3}}>
                      {["Concepto","Importe","Nota"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",textAlign:h==="Importe"?"right":"left",color:C.text2,fontSize:10,textTransform:"uppercase",fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {c:"Salario bruto",      v:"$1.500.000", n:"Incluye combustible"},
                      {c:"Cargas sociales (50%)",v:"$750.000",  n:"Jubilación, ART, etc."},
                      {c:"Movilidad extra",    v:"$0",         n:"Vehículo propio"},
                    ].map((r,i)=>(
                      <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`}}>
                        <td style={{padding:"7px 10px",color:C.text}}>{r.c}</td>
                        <td style={{padding:"7px 10px",textAlign:"right",fontFamily:C.mono,fontWeight:600,color:C.navy}}>{r.v}</td>
                        <td style={{padding:"7px 10px",color:C.text2,fontSize:11}}>{r.n}</td>
                      </tr>
                    ))}
                    <tr style={{background:C.bg3,fontWeight:700}}>
                      <td style={{padding:"7px 10px",fontWeight:700,color:C.navy}}>COSTO FIJO TOTAL</td>
                      <td style={{padding:"7px 10px",textAlign:"right",fontFamily:C.mono,fontWeight:700,color:C.navy}}>$2.250.000</td>
                      <td style={{padding:"7px 10px",color:C.text2,fontSize:11}}>por mes</td>
                    </tr>
                  </tbody>
                </table>
              </Card>

              <Card title="Estructura de comisiones">
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead>
                    <tr style={{background:C.bg3}}>
                      {["Actividad","Comisión","Cuándo cobra","Margen empresa"].map(h=>(
                        <th key={h} style={{padding:"7px 10px",textAlign:"left",color:C.text2,fontSize:10,textTransform:"uppercase",fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {a:"Retiro de ONU",            c:"$10.000",  t:"Al cerrar ticket",     m:"$51.408"},
                      {a:"Cliente activado — Mod. A", c:"$15.000", t:"Cobro único al activar",m:"$23.375"},
                      {a:"Cliente — Mod. B cuota 1",  c:"$7.500",  t:"Al firmar acuerdo",     m:"—"},
                      {a:"Cliente — Mod. B cuota 2",  c:"$7.500",  t:"Al cobrar 2da cuota",   m:"$23.375"},
                    ].map((r,i)=>(
                      <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`}}>
                        <td style={{padding:"7px 10px",color:C.text,fontSize:11}}>{r.a}</td>
                        <td style={{padding:"7px 10px",fontFamily:C.mono,fontWeight:600,color:C.green}}>{r.c}</td>
                        <td style={{padding:"7px 10px",color:C.text2,fontSize:11}}>{r.t}</td>
                        <td style={{padding:"7px 10px",fontFamily:C.mono,color:C.blue,fontSize:11}}>{r.m}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Ins type="i" html="El recurso siempre cobra <strong>$15.000 por cliente activado</strong> sin importar si paga todo o en cuotas. Mod. B incentiva seguimiento hasta la 2da cuota."/>
              </Card>
            </div>

            {/* Tabla 4 escenarios */}
            <Card title="Distribución mensual — 4 escenarios · persona vs empresa" style={{marginBottom:12}}>
              <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:mob?600:0}}>
                <thead>
                  <tr style={{background:C.bg3}}>
                    <th style={{padding:"8px 12px",textAlign:"left",color:C.text2,fontSize:10,textTransform:"uppercase",fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>Concepto</th>
                    {[
                      {label:"Peor absoluto",color:C.red},
                      {label:"Peor realista",color:C.amber},
                      {label:"Base",        color:C.blue},
                      {label:"Bueno ⭐",    color:C.green},
                    ].map((h,i)=>(
                      <th key={i} style={{padding:"8px 12px",textAlign:"right",color:h.color,fontSize:10,textTransform:"uppercase",fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {grupo:"ACTIVIDAD", rows:[
                      {c:"ONUs retiradas/mes",            v:["66","86","108","132"]},
                      {c:"Clientes recuperados/mes",      v:["2","3","5","7"]},
                      {c:"Planes de pago/mes",            v:["3","5","8","12"]},
                    ]},
                    {grupo:"INGRESOS EMPRESA", rows:[
                      {c:"Retiro de ONUs",                v:["$4.05M","$5.28M","$6.63M","$8.11M"], bold:true},
                      {c:"Recupero clientes (ARPU)",      v:["$53k","$79k","$131k","$184k"]},
                      {c:"Planes de pago cobrados",       v:["$115k","$192k","$307k","$460k"]},
                      {c:"TOTAL INGRESOS",                v:["$4.22M","$5.55M","$7.07M","$8.75M"], total:true},
                    ]},
                    {grupo:"EMPRESA RETIENE", rows:[
                      {c:"Costo fijo (sal+cargas)",       v:["-$2.25M","-$2.25M","-$2.25M","-$2.25M"], neg:true},
                      {c:"Comisiones pagadas",            v:["-$712k","-$942k","-$1.22M","-$1.51M"], neg:true},
                      {c:"RESULTADO NETO EMPRESA",        v:["$1.26M","$2.36M","$3.61M","$4.99M"], total:true, ok:true},
                      {c:"ROI",                           v:["1.42x","1.74x","2.04x","2.32x"], roi:true},
                    ]},
                  ].map((grupo,gi)=>(
                    <>
                      <tr key={`g${gi}`} style={{background:C.bg3}}>
                        <td colSpan={5} style={{padding:"6px 12px",fontSize:10,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:"0.06em"}}>▸ {grupo.grupo}</td>
                      </tr>
                      {grupo.rows.map((r,ri)=>(
                        <tr key={`r${gi}${ri}`} style={{borderBottom:`0.5px solid ${C.bdr}`,background:r.total?C.bg3:"transparent"}}>
                          <td style={{padding:"7px 12px",color:r.total?C.navy:C.text,fontWeight:r.total?700:400}}>{r.c}</td>
                          {r.v.map((v,vi)=>(
                            <td key={vi} style={{padding:"7px 12px",textAlign:"right",fontFamily:C.mono,fontWeight:r.total?700:r.roi?600:400,
                              color:r.ok?[C.red,C.amber,C.blue,C.green][vi]:r.neg?C.red:r.roi?[C.red,C.amber,C.blue,C.green][vi]:C.text}}>{v}</td>
                          ))}
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>

            {/* Timeline + KPIs semáforo */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12}}>
              <Card title="Timeline recupero backlog — 497 ONUs">
                {[
                  {tiempo:"8 meses",ritmo:"5 visitas/día · 60% éxito",onus:"66 ONUs/mes",color:C.red},
                  {tiempo:"6 meses",ritmo:"6 visitas/día · 65% éxito",onus:"86 ONUs/mes",color:C.amber},
                  {tiempo:"5 meses",ritmo:"7 visitas/día · 70% éxito",onus:"108 ONUs/mes",color:C.green},
                ].map((t,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 12px",marginBottom:8,background:C.bg3,borderRadius:8,border:`0.5px solid ${C.bdr}`,borderLeft:`3px solid ${t.color}`}}>
                    <div>
                      <p style={{fontSize:13,fontWeight:600,color:t.color}}>{t.tiempo}</p>
                      <p style={{fontSize:11,color:C.text2,marginTop:2}}>{t.ritmo}</p>
                    </div>
                    <span style={{fontFamily:C.mono,fontWeight:700,fontSize:12,color:t.color}}>{t.onus}</span>
                  </div>
                ))}
                <Ins type="g" html="Escenario base: <strong>108 ONUs/mes = 5 meses</strong> para liquidar el backlog completo"/>
              </Card>

              <Card title="KPIs del área — semáforos operativos">
                {[
                  {label:"ONUs retiradas esta semana", meta:"27+", actual:"—", color:C.text3},
                  {label:"Backlog pendiente total",     meta:"<400", actual:"497", color:C.red},
                  {label:"Recuperos este mes",          meta:"5+",  actual:"—", color:C.text3},
                  {label:"Tiempo coord → visita (días)",meta:"<2",  actual:"—", color:C.text3},
                ].map((k,i)=>(
                  <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:`0.5px solid ${C.bdr}`}}>
                    <span style={{fontSize:11,color:C.text2}}>{k.label}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontSize:10,color:C.text3}}>Meta: {k.meta}</span>
                      <span style={{fontFamily:C.mono,fontWeight:600,fontSize:12,color:k.color,background:`${k.color}18`,padding:"2px 8px",borderRadius:9}}>{k.actual}</span>
                    </div>
                  </div>
                ))}
                <Ins type="w" html="KPIs pendientes de datos reales · actualizar cuando arranque el área"/>
              </Card>
            </div>

          </div>
        )}

                {tab==="objetivos"&&(
          <div>

            {/* Header mes */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div>
                <p style={{fontSize:13,color:C.text2}}>Progreso mensual · <strong style={{color:C.text}}>Marzo 2026</strong> · se actualiza con cada bajada de CSV</p>
              </div>
              <div style={{display:"flex",gap:16,fontSize:11}}>
                {[
                  {color:"#1A7A3C",bg:"#E5F5EC",label:"En objetivo >80%"},
                  {color:"#C47A00",bg:"#FEF6DC",label:"En progreso 50-80%"},
                  {color:"#D13030",bg:"#FEE9E9",label:"Requiere acción <50%"},
                ].map((s,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:5}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:s.color}}/>
                    <span style={{color:C.text2}}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grid de objetivos */}
            {[
              {
                area:"Ventas",
                icono:"📈",
                nombre:"Altas del mes",
                actual:D.OBJ.altas_actual, meta:D.OBJ.altas_meta, unidad:"altas",
                pct:D.OBJ.altas_pct,
                fuente:"CSV ISPCube · fecha alta mar 26",
                contexto:"Meta plan completo: 420/mes · orgánico actual: 195/mes",
                accion:"Activar Meta+Google+TikTok y IA ventas WSP",
                historico:[219,172,152],
                labHist:["Ene","Feb","Mar"],
              },
              {
                area:"Atención al cliente",
                icono:"💬",
                nombre:"Reducción de churn",
                actual:D.OBJ.churn_actual, meta:D.OBJ.churn_meta, unidad:"%",
                pct:D.OBJ.churn_pct,
                inverso:true,
                fuente:"CSV ISPCube · 2.9% base activa",
                contexto:"Churn 2.9% → meta 1.5% · reducir 1.4pp en 12 meses",
                accion:"IA WSP cobranza D5/15/25 · onboarding automático",
                historico:[2.5,2.4,2.3],
                labHist:["Ene","Feb","Mar"],
              },
              {
                area:"Operaciones · Red",
                icono:"📦",
                nombre:"Cajas instaladas",
                actual:D.OBJ.cajas_actual, meta:D.OBJ.cajas_meta, unidad:"cajas",
                pct:D.OBJ.cajas_pct,
                fuente:"Declarado · equipo técnico",
                contexto:"1.000 cajas acum. → objetivo 3.000 en 13 meses",
                accion:"Mantener ritmo · 3.000 cajas = red AB completa may 27",
                historico:[150,150,150],
                labHist:["Ene","Feb","Mar"],
              },
              {
                area:"Operaciones · Clientes",
                icono:"🔧",
                nombre:"Instalaciones clientes",
                actual:D.OBJ.inst_actual, meta:D.OBJ.inst_meta, unidad:"instalac.",
                pct:D.OBJ.inst_pct,
                fuente:"CSV ISPCube · altas habilitadas mar 26",
                contexto:"Cada alta = 1 instalación técnica realizada",
                accion:"Más altas → más instalaciones · ligado a ventas",
                historico:[195,257,259],
                labHist:["Ene","Feb","Mar"],
              },
              {
                area:"Soporte técnico",
                icono:"🛠️",
                nombre:"Tickets resueltos",
                actual:null, meta:null, unidad:"tickets",
                pct:null,
                fuente:"No disponible en CSV ISPCube actual",
                contexto:"Requiere módulo soporte ISPCube o sistema externo",
                accion:"Habilitar módulo tickets · o integrar Mesa de Ayuda",
                historico:[null,null,null],
                labHist:["Ene","Feb","Mar"],
                sinDatos:true,
              },
              {
                area:"Cobranza",
                icono:"💳",
                nombre:"Migración a SIRO",
                actual:D.OBJ.siro_actual, meta:D.OBJ.siro_meta, unidad:"% cartera",
                pct:D.OBJ.siro_pct,
                fuente:"CSV caja · SIRO / cobrado mar 26",
                contexto:"SIRO: $0 oct 25 → crecimiento mensual · objetivo 40%",
                accion:"Campaña WSP incentivo 5% descuento · meta 40%",
                historico:[1.4,5.7,10.8],
                labHist:["Ene","Feb","Mar"],
              },
            ].map((obj,i)=>{
              const pct  = obj.pct;
              const rojo   = "#D13030", rP = "#FEE9E9";
              const ambar  = "#C47A00", aP = "#FEF6DC";
              const verde  = "#1A7A3C", vP = "#E5F5EC";
              const col  = obj.sinDatos ? C.text3 : pct >= 80 ? verde : pct >= 50 ? ambar : rojo;
              const bgC  = obj.sinDatos ? C.bg3   : pct >= 80 ? vP    : pct >= 50 ? aP    : rP;
              const etiq = obj.sinDatos ? "Sin datos" : pct >= 80 ? "En objetivo" : pct >= 50 ? "En progreso" : "Requiere acción";

              return (
                <div key={i} style={{background:C.bg2,border:`0.5px solid ${C.bdr}`,borderRadius:12,padding:"16px 18px",marginBottom:12,borderLeft:`3px solid ${col}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                    <div>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                        <span style={{fontSize:14}}>{obj.icono}</span>
                        <span style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.07em",fontWeight:600}}>{obj.area}</span>
                      </div>
                      <p style={{fontSize:14,fontWeight:600,color:C.text}}>{obj.nombre}</p>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <span style={{background:bgC,color:col,padding:"3px 10px",borderRadius:20,fontSize:10,fontWeight:700}}>{etiq}</span>
                      {!obj.sinDatos && (
                        <p style={{fontSize:22,fontFamily:C.mono,fontWeight:700,color:col,marginTop:4}}>
                          {pct}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  {!obj.sinDatos && (
                    <div style={{marginBottom:10}}>
                      <div style={{height:8,background:C.bg3,borderRadius:4,overflow:"hidden",border:`0.5px solid ${C.bdr}`,marginBottom:6}}>
                        <div style={{width:`${Math.min(pct,100)}%`,height:"100%",background:col,borderRadius:4,transition:"width 0.5s"}}/>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                        <span style={{color:C.text2,fontFamily:C.mono}}>
                          {obj.inverso
                            ? `Actual: ${obj.actual}${obj.unidad} → Meta: ${obj.meta}${obj.unidad}`
                            : `Actual: ${obj.actual?.toLocaleString("es-AR")} ${obj.unidad}`}
                        </span>
                        <span style={{color:col,fontFamily:C.mono,fontWeight:600}}>
                          Meta: {obj.meta?.toLocaleString("es-AR")} {obj.unidad}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Histórico mini */}
                  {!obj.sinDatos && (
                    <div style={{display:"flex",gap:6,marginBottom:10}}>
                      {obj.historico.map((v,j)=>(
                        <div key={j} style={{flex:1,background:C.bg3,borderRadius:6,padding:"5px 6px",textAlign:"center",border:`0.5px solid ${C.bdr}`}}>
                          <p style={{fontSize:9,color:C.text3}}>{obj.labHist[j]}</p>
                          <p style={{fontSize:11,fontFamily:C.mono,fontWeight:600,color:j===obj.historico.length-1?col:C.text2,marginTop:1}}>
                            {v != null ? `${v}${typeof v==='number'&&v<10&&obj.unidad==="%" ? "%" : ""}` : "—"}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",borderTop:`0.5px solid ${C.bdr}`,paddingTop:8}}>
                    <div>
                      <p style={{fontSize:10,color:C.text3,marginBottom:2}}>Fuente: {obj.fuente}</p>
                      <p style={{fontSize:11,color:C.text2}}>{obj.contexto}</p>
                    </div>
                    <div style={{background:`${col}12`,borderRadius:6,padding:"5px 10px",maxWidth:"40%",textAlign:"right"}}>
                      <p style={{fontSize:10,color:col,fontWeight:600}}>▶ {obj.accion}</p>
                    </div>
                  </div>
                </div>
              );
            })}

          </div>
        )}

        <div style={{marginTop:28,textAlign:"center",color:C.text3,fontSize:11,paddingBottom:16}}>
          WeConnect · Dashboard Ejecutivo · Netsharing SA · Datos ISPCube + Supabase · {new Date().toLocaleDateString("es-AR")}
        </div>
      </div>
    </div>
  );
}
