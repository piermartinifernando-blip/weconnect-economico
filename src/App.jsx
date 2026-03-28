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
  COBROS:[5.66,7.59,12.62,18.00,24.57,30.87,31.64,41.41,44.76,47.42,62.50,64.90,70.20,76.62,78.08,85.40,92.87,95.96,95.19,104.06],
  BILLS: [5.65,9.97,16.29,22.40,29.73,36.10,38.83,43.76,46.60,54.29,123.43,73.47,63.24,96.19,91.04,103.91,86.50,109.02,61.91,117.72],

  // ── NEGOCIO: últimos 8 meses ──
  M8:["Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26"],
  COBROS_M8:[70.20,76.62,78.08,85.40,92.87,95.96,95.19,104.06],

  // ── CANALES: últimos 8 meses ($M) ──
  MP8:  [55.96,60.37,60.56,66.35,74.84,66.89,71.73,72.30],
  SIRO8:[0.00, 0.00, 0.00, 0.42, 0.81, 1.33, 5.45,10.93],
  VISA8:[4.82, 6.03, 6.98, 7.78, 7.33, 8.93, 8.10, 9.68],
  PF8:  [4.16, 4.52, 4.66, 5.87, 4.95, 4.65, 4.05, 5.20],
  CAJA8:[3.15, 3.59, 3.72, 3.28, 3.56, 3.71, 3.37, 3.98],
  GAL8: [2.12, 2.11, 2.16, 1.69, 1.37,10.47, 2.51, 1.96],

  // ── MES ACTUAL: Mar 26 ──
  COB_ACTUAL:  104.06,   // cobrado total
  COB_PREV:     95.19,   // mes anterior (Feb 26)
  COB_VAR_PCT:   9.3,    // % variación
  SIRO_ABS:     10.93,   // SIRO $M
  SIRO_PCT:     10.5,    // SIRO % del cobrado
  MP_ABS:       72.30,   // MP $M
  MP_PCT:       69.5,    // MP %
  FACT_ACTUAL: 117.89,   // facturado mensual Mar 26 (csv bills sep=;)
  TASA_ACTUAL: 88.3,     // cobrado/facturado Mar 26
  FACT_SIN_COB:13.83,    // $M sin cobrar Mar 26

  // ── CLIENTES: estado actual ──
  HAB:   4235,    // habilitados
  BLOQ:   161,    // bloqueados
  SS:    1616,    // sin servicio
  TOTAL: 6012,    // total padrón

  // ── CLIENTES: altas y churns últimos 8 meses ──
  ALTAS_M:["Ago 25","Sep 25","Oct 25","Nov 25","Dic 25","Ene 26","Feb 26","Mar 26"],
  ALTAS_V: [299, 281, 324, 225, 279, 354, 292, 310],  // mar 26: 284 total (267 hab) verificado
  CHURNS_V:[ 93,  81,  48,  39,  38,  40,  33,  22],  // churn real = nuevos Sin servicio c/mes

  // ── CHURN: serie mensual ──
  CHURN_PCT_ACT: 0.52,  // % real mar 26 = 16 nuevos SS / 4196 hab
  CHURN_ABS_ACT:  22,   // clientes/mes Mar 26 = nuevos Sin servicio
  // CHURN REAL = nuevos Sin servicio / base habilitados ese mes
  CHURN_MENS:[
    {mes:"Sep 24",pct:2.1,cant:59}, {mes:"Oct 24",pct:2.3,cant:67}, {mes:"Nov 24",pct:2.0,cant:60}, {mes:"Dic 24",pct:1.9,cant:59},
    {mes:"Ene 25",pct:2.2,cant:70}, {mes:"Feb 25",pct:2.4,cant:79}, {mes:"Mar 25",pct:2.6,cant:88}, {mes:"Abr 25",pct:2.8,cant:101},
    {mes:"May 25",pct:2.7,cant:100},{mes:"Jun 25",pct:2.9,cant:110},{mes:"Jul 25",pct:3.1,cant:121},
    {mes:"Ago 25",pct:2.26,cant:89},{mes:"Sep 25",pct:2.01,cant:80},{mes:"Oct 25",pct:1.18,cant:47},
    {mes:"Nov 25",pct:0.87,cant:35},{mes:"Dic 25",pct:0.87,cant:35},{mes:"Ene 26",pct:1.13,cant:40},
    {mes:"Feb 26",pct:1.13,cant:33},{mes:"Mar 26",pct:0.71,cant:22},
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
    {ciudad:"Almirante Brown",    habilitados:1952, total:3128, deudaVenc:50.00},
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
  MORA_TOTAL:134.23, MORA_VENC:73.69, MORA_SS:58.91, MORA_BLOQ:7.18, MORA_HAB:7.56,
  MORA_MOROSOS:1777, // ss(1556) + bloq(234)
  MORA_PCT:29.9,     // morosos / total

  // ── OBJETIVOS: actuales y metas ──
  OBJ:{
    altas_actual:287,  altas_meta:420,   altas_pct:68.3,  // 267 hab / meta 420
    siro_actual:10.5,  siro_meta:40.0,   siro_pct:26.3,
    churn_actual:0.52, churn_meta:0.5,   churn_pct:96.2, // meta/actual×100 — casi en meta
    cajas_actual:156,  cajas_meta:384,   cajas_pct:40.6,  // obra: 156 inst / esperado 384 (24d×16/día)
    inst_actual:287,   inst_meta:420,    inst_pct:68.3,
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
  MORA_SS:    60.42, MORA_BLOQ:   4.91,
  MORA_VENC:  72.89,

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
    {mes:"Hoy",   cajas:1150,cap:12075,pen:2.2,churn:2.70,altas:310, clientes:4235, cobrado:104.1,opex:150.3,capex:40,costo:190.3,neto:-86.2},
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

  // ── P&L histórico (manual — viene de Excel egresos) ──
  PL_HIST:[
    {mes:"Oct 25", cobrado:78.1,  opex:147.6, capex:0,    costo:147.6, neto:-69.5},
    {mes:"Nov 25", cobrado:85.4,  opex:135.9, capex:0,    costo:135.9, neto:-50.5},
    {mes:"Dic 25", cobrado:92.9,  opex:171.7, capex:0.1,  costo:171.8, neto:-78.9},
    {mes:"Ene 26", cobrado:96.0,  opex:150.3, capex:25.0, costo:175.3, neto:-79.3},
    {mes:"Feb 26", cobrado:95.2,  opex:150.3, capex:33.0, costo:183.3, neto:-88.1},
    {mes:"Mar 26", cobrado:104.1, opex:150.3, capex:0,    costo:150.3, neto:-46.2},
  ],

  // ── Curva neto clientes (altas+churns+neto real) ──
  NETO_HIST:[
    {mes:"Oct 25", neto:-69.5, altas:324, churns:48, neto_cli:276},
    {mes:"Nov 25", neto:-50.5, altas:225, churns:39, neto_cli:186},
    {mes:"Dic 25", neto:-78.9, altas:279, churns:38, neto_cli:241},
    {mes:"Ene 26", neto:-79.3, altas:354, churns:40, neto_cli:314},
    {mes:"Feb 26", neto:-88.1, altas:292, churns:33, neto_cli:259},
    {mes:"Mar 26", neto:-46.2, altas:310, churns:22, neto_cli:288},
  ],

  // ── Break-even gráfico ② proyección ──
  BE_PROJ:[
    {mes:"Mar 26", cobrado:100.8, costo:150.3, neto:-49.5, nota:"Hoy"},
    {mes:"Abr 26", cobrado:100.8, costo:190.3, neto:-89.5, nota:"Inicio CAPEX"},
    {mes:"May 26", cobrado:98.8,  costo:190.3, neto:-91.5, nota:"+IA ventas"},
    {mes:"Jun 26", cobrado:108.0, costo:190.3, neto:-82.3, nota:"+SIRO"},
    {mes:"Jul 26", cobrado:119.7, costo:190.3, neto:-70.6, nota:"+Upsell"},
    {mes:"Ago 26", cobrado:132.1, costo:190.3, neto:-58.2, nota:"+Win-back"},
    {mes:"Sep 26", cobrado:146.3, costo:190.3, neto:-44.0, nota:"Stack completo"},
    {mes:"Oct 26", cobrado:163.1, costo:150.3, neto:12.8,  nota:"Fin CAPEX"},
    {mes:"Nov 26", cobrado:182.7, costo:150.3, neto:32.4,  nota:"★ BE"},
  ],

  // ── Recupero AB ──
  RECUPERO:{ onus:497, valor:25.5, costo_fijo:2.25, roi_min:1.42 },

  // ── CPL y canales pauta ──
  CPL_USD: 13.27, CPL_ARS: 15926, ARPU_USD: 22.45,
  BASE_ORG: 239,

  // ── Obra: cajas y fibra ──
  OBRA:{
    inicio:"21/02/26", dias_hab:47,
    cajas:{ act:202,    total:600,    meta_dia:16,   esperado:752,   ritmo:4.3,  pct_ritmo:26.9, fin_meta:"02/06/26"},
    fibra:{ act:110000, total:320000, meta_dia:2000, esperado:48000, ritmo:4583, pct_ritmo:229.2,fin_meta:"29/05/26"},
  },

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
  {id:"analisis",  label:"🔍 Análisis"    },
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
              <KPI label="Tasa cobranza mar-26" value={`${D.TASA_ACTUAL}%`} sub={`$${D.COB_ACTUAL}M cobrado / $${D.FACT_ACTUAL}M facturado · sin cobrar $${D.FACT_SIN_COB}M`} type="wr"/>
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
                {D.PLANES.map((p,i)=>(
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
                  <Prog key={i} label={r.ciudad} value={r.habilitados} max={1952}
                    display={`${r.habilitados.toLocaleString("es-AR")} hab · ${r.total} total`}
                    color={i<2?C.blue:C.green}/>
                ))}
              </Card>
            </div>

            {/* Curva neto ingreso - egresos */}
            <Card title="Curva neto: cobrado − OPEX − CAPEX ($M) · altas y churns reales (eje der.)" style={{marginBottom:12}}>
              <div style={{fontSize:11,color:C.text2,marginBottom:10,padding:"7px 10px",background:C.bg3,borderRadius:6,border:`0.5px solid ${C.bdr}`}}>
                <strong>Neto financiero</strong> = cobrado − OPEX − CAPEX · <strong>Neto clientes</strong> = altas brutas − SS nuevos · <strong>Churns (SS)</strong> = nuevos Sin servicio ese mes
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={[
                  ...D.NETO_HIST,
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
                  <Bar  yAxisId="right" dataKey="altas"    name="Altas brutas"   fill={C.green}  opacity={0.7} radius={[3,3,0,0]}/>
                  <Bar  yAxisId="right" dataKey="churns"  name="SS nuevos (churn)" fill={C.red}    opacity={0.4} radius={[3,3,0,0]}/>
                  <Line yAxisId="right" type="monotone" dataKey="neto_cli" name="Neto clientes" stroke={C.blue} strokeWidth={2} dot={{r:4,fill:C.blue}} strokeDasharray="4 3"/>
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:8,marginTop:10}}>
                {[
                  {mes:"Ene 26",nota:"354 altas − 40 SS = +314 clientes neto",color:C.green},
                  {mes:"Feb 26",nota:"292 altas − 33 SS = +259 clientes neto",color:C.green},
                  {mes:"Mar 26",nota:"310 altas − 22 SS = +288 clientes neto ★ menor churn",color:C.blue},
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
              <KPI label="Tasa mensual prom."    value={`${D.CHURN_PCT_ACT}%`} sub={`${D.CHURN_ABS_ACT} nuevos SS · mar 26`}            type="dn"/>
              <KPI label="Churn anual implícito" value="0.83%"    sub="tasa mensual real · base 4.235 hab"           type="wr"/>
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

            {/* ── BLOQUEADOS POR ANTIGÜEDAD ── */}
            <Card title="Bloqueados por antigüedad de bloqueo · corte 28/04/2026">
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:10,marginBottom:14}}>
                {[
                  {label:"< 30 días",    cant:0,   deuda:"$0",       color:C.green,  bg:C.greenP, desc:"Sin casos al corte"},
                  {label:"31 a 45 días", cant:113, deuda:"$3.36M",   color:C.amber,  bg:C.amberP, desc:"Gestión activa urgente"},
                  {label:"> 45 días",    cant:48,  deuda:"$1.55M",   color:C.red,    bg:C.redP,   desc:"Riesgo alto de pase a SS"},
                ].map((g,i)=>(
                  <div key={i} style={{background:g.bg,border:`0.5px solid ${g.color}`,borderRadius:10,padding:"14px 16px",textAlign:"center"}}>
                    <p style={{fontSize:11,fontWeight:600,color:g.color,marginBottom:4}}>{g.label}</p>
                    <p style={{fontSize:28,fontFamily:C.mono,fontWeight:700,color:g.color}}>{g.cant}</p>
                    <p style={{fontSize:11,color:g.color,fontWeight:600,marginTop:4}}>{g.deuda}</p>
                    <p style={{fontSize:10,color:C.text2,marginTop:4}}>{g.desc}</p>
                  </div>
                ))}
              </div>
              <Ins type="i" html="Total bloqueados: <strong>161 clientes · $4.91M deuda vencida</strong> · Sin casos recientes (&lt;30d) — el bloqueo más nuevo tiene 31 días"/>
              <div style={{overflowX:"auto",marginTop:10}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:mob?600:0}}>
                <thead>
                  <tr style={{background:C.bg3}}>
                    {["Grupo","Clientes","Deuda vencida","Acción recomendada"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",textAlign:"left",color:C.text2,fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {grupo:"31 a 45 días",cli:113,deuda:"$3.36M",accion:"Contacto WSP inmediato · oferta plan de cuotas · 1er vencimiento próximo",color:C.amber},
                    {grupo:"> 45 días",   cli:48, deuda:"$1.55M",accion:"Campaña de recupero campo · evaluar pase a Sin servicio si no responden",color:C.red},
                    {grupo:"TOTAL",       cli:161,deuda:"$4.91M",accion:"",color:C.navy,bold:true},
                  ].map((r,i)=>(
                    <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`,background:r.bold?C.bg3:"#FFFFFF"}}>
                      <td style={{padding:"7px 10px",fontWeight:r.bold?700:600,color:r.color}}>{r.grupo}</td>
                      <td style={{padding:"7px 10px",fontFamily:C.mono,fontWeight:r.bold?700:400,color:r.color}}>{r.cli}</td>
                      <td style={{padding:"7px 10px",fontFamily:C.mono,fontWeight:r.bold?700:400,color:r.bold?C.navy:C.red}}>{r.deuda}</td>
                      <td style={{padding:"7px 10px",fontSize:10,color:C.text2,fontStyle:r.bold?"":"italic"}}>{r.accion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </Card>

            {/* ── RESUMEN MENSUAL SIN SERVICIO ── */}
            <Card title="Sin servicio por cohorte — clientes que nunca volvieron · ago 24 → mar 26">
              <Ins type="d" html="Cada fila = clientes captados ese mes. <strong>SS = nunca regularizaron</strong>. Tendencia: mejora notable desde oct 25 (31% → 7%)."/>
              <div style={{overflowX:"auto",marginTop:10}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:mob?600:0}}>
                <thead>
                  <tr style={{background:"#0D1B2A"}}>
                    {["Mes alta","Total altas","Habilitados","Bloqueados","Sin servicio","% No volvió","Deuda SS"].map(h=>(
                      <th key={h} style={{padding:"7px 10px",textAlign:h==="Mes alta"?"left":"center",color:"#fff",fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.bdr}`}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {m:"Ago 24",tot:296,hab:201,bloq:3, ss:92, pct:31.1,deu:"$2.530.342"},
                    {m:"Sep 24",tot:339,hab:228,bloq:9, ss:102,pct:30.1,deu:"$2.871.937"},
                    {m:"Oct 24",tot:293,hab:182,bloq:5, ss:106,pct:36.2,deu:"$4.859.820"},
                    {m:"Nov 24",tot:291,hab:157,bloq:5, ss:129,pct:44.3,deu:"$5.517.067"},
                    {m:"Dic 24",tot:257,hab:151,bloq:5, ss:101,pct:39.3,deu:"$4.325.231"},
                    {m:"Ene 25",tot:278,hab:178,bloq:13,ss:87, pct:31.3,deu:"$4.949.447"},
                    {m:"Feb 25",tot:238,hab:139,bloq:7, ss:92, pct:38.7,deu:"$5.073.626"},
                    {m:"Mar 25",tot:242,hab:169,bloq:7, ss:66, pct:27.3,deu:"$3.426.292"},
                    {m:"Abr 25",tot:257,hab:161,bloq:15,ss:81, pct:31.5,deu:"$4.492.399"},
                    {m:"May 25",tot:270,hab:166,bloq:15,ss:89, pct:33.0,deu:"$3.890.549"},
                    {m:"Jun 25",tot:236,hab:147,bloq:15,ss:74, pct:31.4,deu:"$3.412.495"},
                    {m:"Jul 25",tot:279,hab:169,bloq:20,ss:90, pct:32.3,deu:"$3.738.141"},
                    {m:"Ago 25",tot:299,hab:196,bloq:10,ss:93, pct:31.1,deu:"$3.300.903"},
                    {m:"Sep 25",tot:281,hab:191,bloq:9, ss:81, pct:28.8,deu:"$3.042.679"},
                    {m:"Oct 25",tot:324,hab:263,bloq:13,ss:48, pct:14.8,deu:"$1.061.890"},
                    {m:"Nov 25",tot:225,hab:178,bloq:8, ss:39, pct:17.3,deu:"$551.971"},
                    {m:"Dic 25",tot:279,hab:232,bloq:9, ss:38, pct:13.6,deu:"$500.739"},
                    {m:"Ene 26",tot:354,hab:301,bloq:13,ss:40, pct:11.3,deu:"$63.461"},
                    {m:"Feb 26",tot:292,hab:247,bloq:12,ss:33, pct:11.3,deu:"$22.995"},
                    {m:"Mar 26",tot:310,hab:287,bloq:1, ss:22, pct:7.1, deu:"$0"},
                  ].map((r,i)=>{
                    const semColor = r.pct <= 15 ? C.green : r.pct <= 30 ? C.amber : C.red;
                    const bg = i%2===0?"#FFFFFF":"#F4F6F9";
                    return (
                      <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`,background:bg}}>
                        <td style={{padding:"6px 10px",fontWeight:600,color:C.text}}>{r.m}</td>
                        <td style={{padding:"6px 10px",textAlign:"center",color:C.text2}}>{r.tot}</td>
                        <td style={{padding:"6px 10px",textAlign:"center",color:C.green,fontWeight:600}}>{r.hab}</td>
                        <td style={{padding:"6px 10px",textAlign:"center",color:C.amber}}>{r.bloq}</td>
                        <td style={{padding:"6px 10px",textAlign:"center",color:C.red,fontWeight:600}}>{r.ss}</td>
                        <td style={{padding:"6px 10px",textAlign:"center",fontWeight:700,color:semColor}}>{r.pct}%</td>
                        <td style={{padding:"6px 10px",textAlign:"center",color:C.text2,fontFamily:C.mono,fontSize:10}}>{r.deu}</td>
                      </tr>
                    );
                  })}
                  <tr style={{background:C.bg3,fontWeight:700,borderTop:`1.5px solid ${C.navy}`}}>
                    <td style={{padding:"7px 10px",color:C.navy,fontWeight:700}}>TOTAL</td>
                    <td style={{padding:"7px 10px",textAlign:"center",color:C.navy,fontWeight:700}}>5.640</td>
                    <td colSpan={2} style={{padding:"7px 10px"}}></td>
                    <td style={{padding:"7px 10px",textAlign:"center",color:C.red,fontWeight:700}}>1.528</td>
                    <td style={{padding:"7px 10px",textAlign:"center",color:C.red,fontWeight:700}}>27.1%</td>
                    <td style={{padding:"7px 10px",textAlign:"center",color:C.text2,fontFamily:C.mono,fontSize:10}}>$58.6M</td>
                  </tr>
                </tbody>
              </table>
              </div>

              {/* Gráfico de barras evolución mensual */}
              <p style={{fontSize:10,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:"0.07em",margin:"18px 0 10px"}}>Evolución mensual — altas brutas vs SS (churn)</p>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={[
                  {m:"Ago 24",altas:296,ss:92, neto:204},{m:"Sep 24",altas:339,ss:102,neto:237},
                  {m:"Oct 24",altas:293,ss:106,neto:187},{m:"Nov 24",altas:291,ss:129,neto:162},
                  {m:"Dic 24",altas:257,ss:101,neto:156},{m:"Ene 25",altas:278,ss:87, neto:191},
                  {m:"Feb 25",altas:238,ss:92, neto:146},{m:"Mar 25",altas:242,ss:66, neto:176},
                  {m:"Abr 25",altas:257,ss:81, neto:176},{m:"May 25",altas:270,ss:89, neto:181},
                  {m:"Jun 25",altas:236,ss:74, neto:162},{m:"Jul 25",altas:279,ss:90, neto:189},
                  {m:"Ago 25",altas:299,ss:93, neto:206},{m:"Sep 25",altas:281,ss:81, neto:200},
                  {m:"Oct 25",altas:324,ss:48, neto:276},{m:"Nov 25",altas:225,ss:39, neto:186},
                  {m:"Dic 25",altas:279,ss:38, neto:241},{m:"Ene 26",altas:354,ss:40, neto:314},
                  {m:"Feb 26",altas:292,ss:33, neto:259},{m:"Mar 26",altas:310,ss:22, neto:288},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="m" tick={{fontSize:8,fill:C.text2}} stroke={C.bdr} interval={1}/>
                  <YAxis tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}/>
                  <Tooltip content={<TipCant/>}/>
                  <Legend formatter={v=><span style={{fontSize:11,color:C.text2}}>{v}</span>}/>
                  <Bar dataKey="altas" name="Altas brutas"   fill={C.blue}  opacity={0.7} radius={[2,2,0,0]}/>
                  <Bar dataKey="ss"    name="SS nuevos (churn)" fill={C.red} opacity={0.6} radius={[2,2,0,0]}/>
                  <Line type="monotone" dataKey="neto" name="Neto (altas−SS)" stroke={C.green} strokeWidth={2.5} dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>
              <Ins type="g" html="Desde oct 25 el SS cae sostenidamente: 129→39→22. El neto de clientes mejora mes a mes. <strong>Mar 26 = mejor mes</strong> con solo 22 SS de 310 altas."/>
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
                  ...D.PL_HIST,
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
                      ...D.PL_HIST.map((r,i)=>({...r,nota:[null,null,"SAC","OLT","Peor mes","Mes completo"][i]})),
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
                  ...D.BE_PROJ,
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
                historico:[300,251,287],
                labHist:["Ene","Feb","Mar"],
              },
              {
                area:"Atención al cliente",
                icono:"💬",
                nombre:"Churn mensual (SS nuevos / altas brutas)",
                actual:D.OBJ.churn_actual, meta:D.OBJ.churn_meta, unidad:"%",
                pct:D.OBJ.churn_pct,
                inverso:true,
                fuente:"CSV ISPCube · SS nuevos / altas brutas ese mes",
                contexto:"Mar 26: 22 SS / 310 altas = 0.71% · meta <0.5% · tendencia bajando",
                accion:"Seguir mejorando onboarding · meta alcanzable próximos 2 meses",
                historico:[11.3, 11.3, 7.1],
                labHist:["Ene 26","Feb 26","Mar 26"],
              },
              {
                area:"Operaciones · Red",
                icono:"📦",
                nombre:"Cajas instaladas — obra sectores 1 y 2",
                actual:202, meta:600, unidad:"cajas",
                pct:26.9,
                fuente:"Obra iniciada 21/02/26 · 47 días hábiles · sectores 1 y 2",
                contexto:"Meta: 16 cajas/día · Ritmo real: 4.3/día · Fin si cumple meta: 02/06/26",
                accion:"Ritmo al 26.9% — acelerar a 16 cajas/día para cerrar sectores 1 y 2 en junio",
                historico:[0, 156, 202],
                labHist:["21/02","Mar 26","Hoy"],
                obraExtra:true,
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
                historico:[1.33, 5.45, 10.5],
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

                  {/* Bloque extra obra */}
                  {obj.obraExtra&&(
                    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:10}}>
                      {[
                        {label:"Instaladas",   val:`${D.OBRA.cajas.act}`,        sub:"acumulado obra",  color:C.blue},
                        {label:"Esperado hoy", val:`${D.OBRA.cajas.esperado}`,   sub:`${D.OBRA.dias_hab}d × ${D.OBRA.cajas.meta_dia}/día`, color:C.amber},
                        {label:"Ritmo real",   val:`${D.OBRA.cajas.ritmo}/día`,  sub:`vs meta ${D.OBRA.cajas.meta_dia}/día`, color:C.red},
                        {label:"Fin obra",     val:D.OBRA.cajas.fin_meta,        sub:"si cumple meta",  color:C.green},
                      ].map((k,i)=>(
                        <div key={i} style={{background:C.bg3,border:`0.5px solid ${C.bdr}`,borderRadius:8,padding:"8px 10px",textAlign:"center"}}>
                          <p style={{fontSize:9,color:C.text3,textTransform:"uppercase",marginBottom:3}}>{k.label}</p>
                          <p style={{fontSize:13,fontFamily:C.mono,fontWeight:700,color:k.color}}>{k.val}</p>
                          <p style={{fontSize:9,color:C.text3,marginTop:2}}>{k.sub}</p>
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

        {tab==="analisis"&&(
          <div>

            {/* KPIs resumen */}
            <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:10,marginBottom:14}}>
              <KPI label="Habilitados"          value={D.HAB.toLocaleString("es-AR")}  sub="activos hoy"                    type="ok"/>
              <KPI label="Sin servicio"          value={D.SS.toLocaleString("es-AR")}   sub="nunca regularizaron"             type="dn"/>
              <KPI label="SS sin deuda"          value="492"  sub="recupero gratuito · win-back fácil"  type="ok"/>
              <KPI label="SS deuda ≤$24k"        value="121"  sub="1 cuota para reactivar"              type="wr"/>
            </div>

            {/* Gráficos lado a lado */}
            <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1.2fr 1fr",gap:14,marginBottom:14}}>

              <Card title="Distribución por rango etario — hab · SS · bloqueados">
                {(() => {
                  const rangos = ['Histórico (<7M)','76+ años (7M-10M)','66-76 años (10M-14M)','56-66 años (14M-20M)','46-56 años (20M-25M)','36-46 años (25M-30M)','29-36 años (30M-35M)','23-29 años (35M-40M)','18-23 años (40M-48M)','13-18 años (48M-60M)','8-13 años (60M-80M)','Extranjero (>90M)'];
                  const hab  = [ 27, 17, 148,287,416,594,655,619,766, 51, 32,622];
                  const ss   = [ 11,  9,  44, 90,148,179,259,274,434, 32,  5,131];
                  const bloq = [  0,  0,   3,  6, 10, 27, 27, 30, 39,  4,  0, 15];
                  return (
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:420}}>
                        <thead>
                          <tr style={{background:C.bg3}}>
                            {["Rango etario","Habilitados","Sin servicio","Bloqueados","Total","% SS"].map((h,i)=>(
                              <th key={i} style={{padding:"7px 10px",textAlign:i===0?"left":"center",color:C.text2,fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rangos.map((r,i)=>{
                            const tot = hab[i]+ss[i]+bloq[i];
                            const pctSS = Math.round(ss[i]/tot*100);
                            const colSS = pctSS>30?C.red:pctSS>25?C.amber:C.green;
                            return (
                              <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`,background:i%2===0?"#FFFFFF":C.bg3}}>
                                <td style={{padding:"7px 10px",fontWeight:600,color:C.text}}>{r}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,color:C.blue,fontWeight:600}}>{hab[i]}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,color:C.red}}>{ss[i]}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,color:C.amber}}>{bloq[i]}</td>
                                <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,color:C.text2,fontWeight:600}}>{tot}</td>
                                <td style={{padding:"7px 10px",textAlign:"center"}}>
                                  <span style={{background:`${colSS}18`,color:colSS,fontWeight:700,fontFamily:C.mono,fontSize:11,padding:"2px 8px",borderRadius:9}}>{pctSS}%</span>
                                </td>
                              </tr>
                            );
                          })}
                          <tr style={{background:C.bg3,borderTop:`1.5px solid ${C.navy}`}}>
                            <td style={{padding:"7px 10px",fontWeight:700,color:C.navy}}>TOTAL</td>
                            <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.blue}}>{hab.reduce((a,b)=>a+b,0)}</td>
                            <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.red}}>{ss.reduce((a,b)=>a+b,0)}</td>
                            <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.amber}}>{bloq.reduce((a,b)=>a+b,0)}</td>
                            <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.navy}}>{hab.reduce((a,b)=>a+b,0)+ss.reduce((a,b)=>a+b,0)+bloq.reduce((a,b)=>a+b,0)}</td>
                            <td style={{padding:"7px 10px",textAlign:"center"}}>
                              <span style={{background:`${C.amber}18`,color:C.amber,fontWeight:700,fontFamily:C.mono,fontSize:11,padding:"2px 8px",borderRadius:9}}>26.7%</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <Ins type="i" html="Edad estimada extrayendo DNI del CUIL (dígitos 3-10) · Extranjero (DNI >90M): <strong>mejor segmento con solo 17% SS</strong> · 18-23 años: mayor volumen y mayor riesgo (35% SS)"/>
                    </div>
                  );
                })()}
              </Card>

              <Card title="Tasa de abandono por rango (% SS sobre total captado)">
                {(() => {
                  const rangos = ['Histórico','76+ años','66-76 años','56-66 años','46-56 años','36-46 años','29-36 años','23-29 años','18-23 años','13-18 años','8-13 años','Extranjero'];
                  const pcts   = [28.9,34.6,22.6,23.5,25.8,22.4,27.5,29.7,35.0,36.8,13.5,17.1];
                  return (
                    <div>
                      <div style={{display:"flex",gap:12,marginBottom:10,fontSize:11}}>
                        {[{c:C.green,l:"≤25% (bueno)"},{c:C.amber,l:"25-30%"},{c:C.red,l:">30% (riesgo)"}].map((x,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"center",gap:4}}>
                            <div style={{width:10,height:10,borderRadius:2,background:x.c}}/>
                            <span style={{color:C.text2}}>{x.l}</span>
                          </div>
                        ))}
                      </div>
                      {rangos.map((r,i)=>{
                        const col = pcts[i]>30?C.red:pcts[i]>25?C.amber:C.green;
                        return (
                          <div key={i} style={{marginBottom:6}}>
                            <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                              <span style={{fontSize:10,color:C.text2,width:60}}>{r}</span>
                              <span style={{fontSize:11,fontFamily:C.mono,fontWeight:600,color:col}}>{pcts[i]}%</span>
                            </div>
                            <div style={{height:10,borderRadius:4,overflow:"hidden",background:C.bg3}}>
                              <div style={{width:`${pcts[i]/45*100}%`,background:col,borderRadius:4}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </Card>
            </div>

            {/* Oportunidades */}
            <Card title="Oportunidades — análisis de negocio por segmento" style={{marginBottom:14}}>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:10}}>
                {[
                  {color:C.green, titulo:"492 SS sin deuda — win-back gratuito",
                   texto:"Se fueron sin deber nada. Causa probable: precio, mudanza o servicio. Son los más fáciles de reactivar con una oferta WSP. Al 30% de conversión: ~150 clientes · +$3.3M/mes.",
                   tag:"ACCIÓN INMEDIATA"},
                  {color:C.amber, titulo:"121 SS con deuda ≤$24k — 1 cuota",
                   texto:"Deuda equivale a 1 mes de factura. Campaña WSP: 'Pagá 1 mes y te reconectamos'. Alta conversión esperada. Potencial: 60-80 clientes adicionales.",
                   tag:"FÁCIL"},
                  {color:C.blue, titulo:"35-55 años — upsell al segmento más fiel",
                   texto:"703 hab activos en 100 MB con menor churn (22-23%). Los más fieles y con capacidad de pago. Upgrade a 300 MB: +$8k ARPU × 50% conversión = +$2.8M/mes.",
                   tag:"ALTA CONVERSIÓN"},
                  {color:C.red, titulo:"12-22 años — política diferenciada urgente",
                   texto:"29-33% de abandono. DNI 35M-45M: ingresos inestables, mayor riesgo crediticio. Evaluar depósito inicial de $12k o plan mensual estricto para nuevas altas.",
                   tag:"PREVENCIÓN"},
                  {color:"#7B5EA7", titulo:"DNI >45M — separar empresas de jóvenes",
                   texto:"911 hab con DNI reciente. 1.219 con 'Actividad comercial: HOGAR' declarada. Separar comercios del segmento residencial para upgrade a planes empresa con mejor margen.",
                   tag:"SEGMENTACIÓN"},
                  {color:C.teal, titulo:"45-65 años en CS — zona de alto valor",
                   texto:"CS concentra 73 hab de 55+ años. Menor churn, más estables, subutilizados en 100 MB. Campaña local en CS de upgrade a 300 MB con instalador en zona.",
                   tag:"UPSELL LOCAL"},
                ].map((o,i)=>(
                  <div key={i} style={{borderLeft:`3px solid ${o.color}`,padding:"10px 14px",background:C.bg3,borderRadius:`0 ${8}px ${8}px 0`,border:`0.5px solid ${C.bdr}`,borderLeftColor:o.color,borderLeftWidth:3}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                      <p style={{fontSize:12,fontWeight:600,color:o.color}}>{o.titulo}</p>
                      <span style={{background:`${o.color}18`,color:o.color,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:9,whiteSpace:"nowrap"}}>{o.tag}</span>
                    </div>
                    <p style={{fontSize:11,color:C.text2,lineHeight:1.6}}>{o.texto}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Plan de cuotas */}
            <Card title="Top 3 acciones concretas — prioridad de ejecución">
              {[
                {n:"1",color:C.green,
                 titulo:"Campaña win-back SS sin deuda · 492 clientes",
                 detalle:"WSP masivo personalizado: 'Hola [nombre], queremos que vuelvas — te reconectamos sin cargo hoy'. Priorizá AB (230 clientes) y CS (184 clientes). Conversión esperada 30%: 148 nuevos clientes · $3.3M/mes adicionales.",
                 kpi:"Potencial: +$3.3M/mes"},
                {n:"2",color:C.blue,
                 titulo:"Upsell 100→300 MB al segmento 35-55 años · 703 hab",
                 detalle:"Campaña segmentada por DNI 20M-30M. Oferta: '300 MB por $X más al mes'. Menor resistencia al cambio en este grupo. Con 50% conversión sobre 703 clientes: +$2.8M/mes de ARPU incremental.",
                 kpi:"Potencial: +$2.8M/mes"},
                {n:"3",color:C.red,
                 titulo:"Política de ingreso para 12-22 años — depósito $12k",
                 detalle:"Implementar depósito reembolsable o primera cuota doble para DNI 35M-45M. Reducción esperada de futuros SS en este segmento: 30-40%. Impacto directo en deuda incobrable de largo plazo.",
                 kpi:"Prevención: -30% SS jóvenes"},
              ].map((a,i)=>(
                <div key={i} style={{display:"flex",gap:14,padding:"12px 0",borderBottom:i<2?`0.5px solid ${C.bdr}`:"none"}}>
                  <div style={{width:32,height:32,borderRadius:"50%",background:`${a.color}18`,border:`1.5px solid ${a.color}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:14,fontWeight:600,color:a.color}}>{a.n}</span>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                      <p style={{fontSize:13,fontWeight:600,color:C.text}}>{a.titulo}</p>
                      <span style={{fontFamily:C.mono,fontSize:11,fontWeight:600,color:a.color,background:`${a.color}12`,padding:"2px 8px",borderRadius:9}}>{a.kpi}</span>
                    </div>
                    <p style={{fontSize:11,color:C.text2,lineHeight:1.6}}>{a.detalle}</p>
                  </div>
                </div>
              ))}
            </Card>

            {/* ── MENORES Y RANKING RECUPERO ── */}
            <Card title="Menores de edad en base — análisis y riesgo legal">
              <Ins type="w" html="<strong>125 clientes con DNI 48M-90M</strong> son menores de 18 años · 85 de 125 tienen CUIL con prefijo adulto (20/23/27) pero DNI de menor — el contrato no tiene responsable legal adulto declarado formalmente"/>
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(3,1fr)",gap:10,marginBottom:14}}>
                {[
                  {label:"Menores en base",   val:"125", sub:"DNI 48M – 90M",         color:C.red},
                  {label:"Menores activos",   val:"84",  sub:"habilitados hoy",        color:C.amber},
                  {label:"Menores SS/Bloq",   val:"41",  sub:"37 SS + 4 bloqueados",   color:C.red},
                ].map((k,i)=>(
                  <div key={i} style={{background:C.bg3,border:`0.5px solid ${C.bdr}`,borderRadius:8,padding:"10px 14px",textAlign:"center"}}>
                    <p style={{fontSize:10,color:C.text2,marginBottom:3}}>{k.label}</p>
                    <p style={{fontSize:26,fontFamily:C.mono,fontWeight:700,color:k.color}}>{k.val}</p>
                    <p style={{fontSize:10,color:C.text3,marginTop:2}}>{k.sub}</p>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:12,marginBottom:12}}>
                <div>
                  <p style={{fontSize:11,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Menores habilitados por ciudad</p>
                  {[["Capitán Sarmiento",34],["Almirante Brown",28],["Ministro Rivadavia",9],["Glew",8],["Burzaco",2],["Longchamps",2],["Florencio Varela",1]].map(([c,n],i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`0.5px solid ${C.bdr}`,fontSize:12}}>
                      <span style={{color:C.text2}}>{c}</span>
                      <span style={{fontFamily:C.mono,fontWeight:600,color:C.text}}>{n}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <p style={{fontSize:11,fontWeight:600,color:C.text2,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Vendedor que captó más menores</p>
                  {[["Netsharing SA (directa)",27],["Local CS",10],["Alfredo Blockl",10],["Marcelo Shanahan",6],["Ignacio Rodriguez",3],["Coronel Vanesa",3],["Paz Diego",3],["Romero Silvana",2]].map(([v,n],i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:`0.5px solid ${C.bdr}`,fontSize:12}}>
                      <span style={{color:C.text2}}>{v}</span>
                      <span style={{fontFamily:C.mono,fontWeight:600,color:C.text}}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Ins type="i" html="Acción recomendada: regularizar contratos de los 84 menores habilitados para que el responsable adulto firme como titular — reduce riesgo legal e impagos"/>
            </Card>

            {/* ── RANKING SEGMENTOS A ATACAR ── */}
            <Card title="Ranking de segmentos a atacar — SS + bloqueados por rango etario">
              <Ins type="i" html="Universo recuperable: <strong>1.777 clientes</strong> · SS sin deuda = recupero inmediato sin gestión de cobranza · SS ≤$24k = 1 cuota para reactivar"/>
              <div style={{overflowX:"auto",marginTop:8}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:mob?500:0}}>
                <thead>
                  <tr style={{background:C.bg3}}>
                    {["Segmento","SS","Bloq","Total","SS sin deuda","SS ≤$24k","Táctica"].map((h,i)=>(
                      <th key={i} style={{padding:"7px 10px",textAlign:i===0?"left":"center",color:C.text2,fontSize:10,fontWeight:600,borderBottom:`1px solid ${C.bdr}`,whiteSpace:"nowrap"}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    {seg:"18-23 años (40M-48M)", ss:434,bl:39,  cero:107,low:33, col:C.red,   tactica:"WSP masivo · pedir pago parcial antes de reconectar"},
                    {seg:"29-36 años (30M-35M)", ss:259,bl:27,  cero:86, low:15, col:C.green, tactica:"Mejor perfil · oferta directa sin descuento"},
                    {seg:"23-29 años (35M-40M)", ss:274,bl:30,  cero:63, low:33, col:C.amber, tactica:"Campaña digital + WSP · sensibles al precio"},
                    {seg:"36-46 años (25M-30M)", ss:179,bl:27,  cero:65, low:9,  col:C.green, tactica:"Llamada directa · jefes de hogar estables"},
                    {seg:"46-56 años (20M-25M)", ss:148,bl:10,  cero:61, low:8,  col:C.green, tactica:"Alta fidelidad · contacto telefónico personal"},
                    {seg:"Extranjero (>90M)",    ss:131,bl:15,  cero:48, low:7,  col:C.green, tactica:"Mejor pagadores · probable mudanza o problema puntual"},
                    {seg:"56-66 años (14M-20M)", ss:90, bl:6,   cero:29, low:1,  col:C.green, tactica:"Muy fieles · SS son excepción · contacto directo"},
                    {seg:"66-76 años (10M-14M)", ss:44, bl:3,   cero:15, low:7,  col:C.text3, tactica:"Volumen bajo · contacto familiar si no responden"},
                  ].map((r,i)=>(
                    <tr key={i} style={{borderBottom:`0.5px solid ${C.bdr}`,background:i%2===0?"#FFFFFF":C.bg3}}>
                      <td style={{padding:"7px 10px",fontWeight:600,color:C.text}}>{r.seg}</td>
                      <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,color:C.red}}>{r.ss}</td>
                      <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,color:C.amber}}>{r.bl}</td>
                      <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:600,color:C.text}}>{r.ss+r.bl}</td>
                      <td style={{padding:"7px 10px",textAlign:"center"}}>
                        <span style={{background:`${C.green}20`,color:C.green,fontWeight:700,fontFamily:C.mono,fontSize:11,padding:"2px 8px",borderRadius:9}}>{r.cero}</span>
                      </td>
                      <td style={{padding:"7px 10px",textAlign:"center"}}>
                        <span style={{background:`${C.amber}20`,color:C.amber,fontWeight:700,fontFamily:C.mono,fontSize:11,padding:"2px 8px",borderRadius:9}}>{r.low}</span>
                      </td>
                      <td style={{padding:"7px 10px",fontSize:10,color:C.text2}}>{r.tactica}</td>
                    </tr>
                  ))}
                  <tr style={{background:C.bg3,borderTop:`1.5px solid ${C.navy}`}}>
                    <td style={{padding:"7px 10px",fontWeight:700,color:C.navy}}>TOTAL</td>
                    <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.red}}>1.559</td>
                    <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.amber}}>157</td>
                    <td style={{padding:"7px 10px",textAlign:"center",fontFamily:C.mono,fontWeight:700,color:C.navy}}>1.716</td>
                    <td style={{padding:"7px 10px",textAlign:"center"}}>
                      <span style={{background:`${C.green}20`,color:C.green,fontWeight:700,fontFamily:C.mono,fontSize:12,padding:"2px 8px",borderRadius:9}}>414</span>
                    </td>
                    <td style={{padding:"7px 10px",textAlign:"center"}}>
                      <span style={{background:`${C.amber}20`,color:C.amber,fontWeight:700,fontFamily:C.mono,fontSize:12,padding:"2px 8px",borderRadius:9}}>73</span>
                    </td>
                    <td style={{padding:"7px 10px",fontSize:11,fontWeight:600,color:C.green}}>Potencial 30% conversión: +$3.5M/mes</td>
                  </tr>
                </tbody>
              </table>
              </div>
            </Card>

            {/* ── GRÁFICO ALTAS MENSUALES POR CANAL ── */}
            <Card title="Altas mensuales — real vs meta · evolución por canal de captación">
              <Ins type="i" html="Altas reales últimos 8 meses vs meta de 420/mes · desglose estimado por canal: orgánico, Meta Ads, Google Ads y TikTok Ads · los canales digitales están en implementación desde feb 26"/>
              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginBottom:14}}>
                {[
                  {label:"Meta mensual",      val:"420",        sub:"altas brutas objetivo",  color:C.navy},
                  {label:"Mar 26 real",        val:"310",        sub:"284 hab + 22 SS + 4 bl", color:C.blue},
                  {label:"% vs meta",          val:"73.8%",      sub:"en progreso",            color:C.amber},
                  {label:"Gap a cerrar",        val:"110 altas",  sub:"para llegar a 420/mes",  color:C.red},
                ].map((k,i)=>(
                  <div key={i} style={{background:C.bg3,border:`0.5px solid ${C.bdr}`,borderRadius:8,padding:"8px 12px",textAlign:"center"}}>
                    <p style={{fontSize:9,color:C.text3,textTransform:"uppercase",marginBottom:2}}>{k.label}</p>
                    <p style={{fontSize:15,fontFamily:C.mono,fontWeight:700,color:k.color}}>{k.val}</p>
                    <p style={{fontSize:9,color:C.text3,marginTop:2}}>{k.sub}</p>
                  </div>
                ))}
              </div>

              {/* Gráfico barras apiladas por canal */}
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={[
                  {m:"Ago 25", meta:0,   google:0,  tiktok:0,  org:299, objetivo:420},
                  {m:"Sep 25", meta:0,   google:0,  tiktok:0,  org:281, objetivo:420},
                  {m:"Oct 25", meta:0,   google:0,  tiktok:0,  org:324, objetivo:420},
                  {m:"Nov 25", meta:0,   google:0,  tiktok:0,  org:225, objetivo:420},
                  {m:"Dic 25", meta:0,   google:0,  tiktok:0,  org:279, objetivo:420},
                  {m:"Ene 26", meta:0,   google:0,  tiktok:0,  org:354, objetivo:420},
                  {m:"Feb 26", meta:25,  google:0,  tiktok:0,  org:267, objetivo:420},
                  {m:"Mar 26", meta:38,  google:12, tiktok:5,  org:255, objetivo:420},
                  {m:"Abr 26", meta:55,  google:25, tiktok:15, org:255, objetivo:420, proyeccion:true},
                  {m:"May 26", meta:75,  google:40, tiktok:25, org:255, objetivo:420, proyeccion:true},
                  {m:"Jun 26", meta:95,  google:55, tiktok:30, org:240, objetivo:420, proyeccion:true},
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.bdr}/>
                  <XAxis dataKey="m" tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}/>
                  <YAxis tick={{fontSize:9,fill:C.text2}} stroke={C.bdr}
                    label={{value:"altas/mes",angle:-90,position:"insideLeft",fill:C.text2,fontSize:9}}/>
                  <Tooltip content={<TipCant/>}/>
                  <Legend formatter={v=><span style={{fontSize:10,color:C.text2}}>{v}</span>}/>
                  <ReferenceLine y={420} stroke={C.navy} strokeDasharray="5 3" strokeWidth={1.5}
                    label={{value:"Meta 420",position:"right",fill:C.navy,fontSize:9}}/>
                  <Bar dataKey="org"    name="Orgánico"   stackId="a" fill={C.blue}   radius={[0,0,0,0]}/>
                  <Bar dataKey="meta"   name="Meta Ads"   stackId="a" fill="#1877F2"  radius={[0,0,0,0]}/>
                  <Bar dataKey="google" name="Google Ads" stackId="a" fill="#EA4335"  radius={[0,0,0,0]}/>
                  <Bar dataKey="tiktok" name="TikTok Ads" stackId="a" fill="#000000"  radius={[3,3,0,0]}/>
                </ComposedChart>
              </ResponsiveContainer>

              <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:8,marginTop:12}}>
                {[
                  {canal:"Orgánico",   color:C.blue,   estado:"✅ Activo",   nota:"~255/mes base estable"},
                  {canal:"Meta Ads",   color:"#1877F2", estado:"✅ Activo",   nota:"Feb 26: ~25 altas · escalando"},
                  {canal:"Google Ads", color:"#EA4335", estado:"🔄 Iniciando",nota:"Mar 26: ~12 altas · optimizando"},
                  {canal:"TikTok Ads", color:"#000000", estado:"🔄 Iniciando",nota:"Mar 26: ~5 altas · en prueba"},
                ].map((c,i)=>(
                  <div key={i} style={{border:`0.5px solid ${C.bdr}`,borderRadius:8,padding:"8px 12px",borderTop:`3px solid ${c.color}`}}>
                    <p style={{fontSize:11,fontWeight:600,color:C.text,marginBottom:2}}>{c.canal}</p>
                    <p style={{fontSize:10,color:C.text2,marginBottom:2}}>{c.estado}</p>
                    <p style={{fontSize:10,color:C.text3}}>{c.nota}</p>
                  </div>
                ))}
              </div>
              <Ins type="w" html="Abr–Jun 26 son <strong>proyección estimada</strong> asumiendo escalado progresivo de Meta + Google + TikTok · actualizar con datos reales cada mes"/>
            </Card>

          </div>
        )}

        <div style={{marginTop:28,textAlign:"center",color:C.text3,fontSize:11,paddingBottom:16}}>
          WeConnect · Dashboard Ejecutivo · Netsharing SA · Datos ISPCube + Supabase · {new Date().toLocaleDateString("es-AR")}
        </div>
      </div>
    </div>
  );
}
