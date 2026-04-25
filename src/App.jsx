import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "./supabase";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart,
} from "recharts";
import { CAPEX_OBRA_PROMEDIO, RED_BASE_MONTH, RED_TODAY_MONTH, RED_TARGET_MONTH, RED_BASE_BOXES, RED_CURRENT_BOXES, RED_TARGET_BOXES, RED_SUBSCRIBERS_PER_BOX, RED_CONSERVATIVE_RATE, RED_BROWN_GROSS_AVG, RED_BROWN_CHURN_AVG, RED_BROWN_NET_AVG, RED_BROWN_GROSS_RATE, RED_BROWN_NET_RATE, LOGO_SRC } from "./config/constants";
import { fmtMoney, fmtMoney1, fmtNum, fmtPct, toMillions } from "./utils/format";
import { monthShort, currentYearMonth, buildMonthRange, lerp, monthDiff } from "./utils/dates";
import { COBERTURA_KML } from "./config/coverage";
import { normalizeCity, parseKmlPolygons } from "./utils/kml";
      <div className="map-legend-box">
        <div className="map-legend-title">Capas activas</div>
        {Object.entries(categoryMeta).map(([key, meta]) => (
          <div className="map-legend-row" key={key}>
            <span className="map-dot" style={{ background: meta.color, opacity: visible[key] ? 1 : 0.25 }}></span>
            <span>{meta.label} ({fmtNum(counts[key] || 0)})</span>
          </div>
        ))}
      </div>
    </div>
  );
}


const loadLeafletAssets = async () => {
  if (!document.querySelector('link[data-weconnect-leaflet="1"]')) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
    link.setAttribute("data-weconnect-leaflet", "1");
    document.head.appendChild(link);
  }

  if (window.L) return window.L;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });

  return window.L;
};

const TABS = [
  { key: "negocio", label: "📊 Negocio" },
  { key: "costos", label: "💰 Costos ISP" },
  { key: "clientes", label: "👥 Clientes" },
  { key: "churn", label: "📉 Churn" },
  { key: "mora", label: "⚠️ Mora" },
  { key: "red", label: "🗺 Red" },
  { key: "be", label: "📈 Break-even" },
  
  
  
  
  { key: "recupero", label: "📦 Recupero AB" },
  
  { key: "plan", label: "🚀 Plan de mejoras" },
];

function Kpi({ label, value, sub, tone = "nv" }) {
  return (
    <div className={`kpi ${tone}`}>
      <div className="kl">{label}</div>
      <div className={`kv c-${tone}`}>{value}</div>
      {sub ? <div className="ks">{sub}</div> : null}
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card">
      <div className="ct">{title}</div>
      {children}
    </div>
  );
}

function PlaceholderSection({ title, text = "Pendiente de conexión a datos reales." }) {
  return (
    <div className="g2">
      <div className="card">
        <div className="ct">{title}</div>
        <div className="ins ins-i">{text}</div>
      </div>
      <div className="card">
        <div className="ct">Estado</div>
        <div className="ins ins-w">Maqueta visual lista. Próximo paso: conectar consultas y métricas.</div>
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("clientes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [kpis, setKpis] = useState(null);
  const [cobranza, setCobranza] = useState([]);
  const [facturacion, setFacturacion] = useState([]);
  const [resultado, setResultado] = useState([]);
  const [mora, setMora] = useState(null);
  const [churn, setChurn] = useState([]);
  const [region, setRegion] = useState([]);
  const [planBase, setPlanBase] = useState([]);
  const [estadoOperativo, setEstadoOperativo] = useState(null);
  const [bloqueadosTramos, setBloqueadosTramos] = useState([]);
  const [cobranzaCiudad, setCobranzaCiudad] = useState([]);
  const [cobranzaCanales, setCobranzaCanales] = useState([]);
  const [altasMensuales, setAltasMensuales] = useState([]);
  const [churnCohortes, setChurnCohortes] = useState([]);
  const [clientesDetalle, setClientesDetalle] = useState([]);

  useEffect(() => {
    const loadAll = async () => {
      try {
        setLoading(true);
        setError("");

        const core = await Promise.all([
          supabase.from("vw_kpis_actuales").select("*").single(),
          supabase.from("vw_cobranza_mensual").select("*").order("mes", { ascending: true }),
          supabase.from("vw_facturacion_mensual").select("*").order("mes", { ascending: true }),
          supabase.from("vw_resultado_mensual").select("*").order("mes", { ascending: true }),
          supabase.from("vw_mora_actual").select("*").single(),
          supabase.from("vw_churn_mensual_real").select("*").order("mes", { ascending: true }),
          supabase.from("vw_clientes_por_region").select("*"),
          supabase.from("vw_clientes_por_plan_base").select("*"),
          supabase.from("vw_estado_actual_operativo").select("*").single(),
          supabase.from("vw_bloqueados_tramos").select("*"),
        ]);

        const errs = core.map((x) => x.error).filter(Boolean);
        if (errs.length) throw new Error(errs.map((e) => e.message).join(" | "));

        setKpis(core[0].data);
        setCobranza(core[1].data || []);
        setFacturacion(core[2].data || []);
        setResultado(core[3].data || []);
        setMora(core[4].data);
        setChurn(core[5].data || []);
        setRegion(core[6].data || []);
        setPlanBase(core[7].data || []);
        setEstadoOperativo(core[8].data);
        setBloqueadosTramos(core[9].data || []);

        const optional = await Promise.allSettled([
          supabase.from("vw_cobranza_por_ciudad").select("*").order("mes", { ascending: true }),
          supabase.from("vw_cobranza_canales_mensual").select("*").order("mes", { ascending: true }),
          supabase.from("vw_altas_mensuales_habilitados").select("*").order("mes", { ascending: true }),
          supabase.from("vw_churn_cohortes").select("*").order("cohorte", { ascending: true }),
          supabase
            .from("clientes_ispcube")
            .select("lat,lng,estado,deuda,deuda_vencida,ciudad,medio_pago,fecha_alta,fecha_bloqueo")
            .range(0, 9999),
        ]);

        const [ciudadRes, canalesRes, altasRes, cohortesRes, clientesDetalleRes] = optional.map((r) =>
          r.status === "fulfilled" ? r.value : null
        );

        setCobranzaCiudad(ciudadRes?.data || []);
        setCobranzaCanales(canalesRes?.data || []);
        setAltasMensuales(altasRes?.data || []);
        setChurnCohortes(cohortesRes?.data || []);
        setClientesDetalle(clientesDetalleRes?.data || []);
      } catch (e) {
        setError(e.message || "Error cargando datos");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  const cobranzaByMes = useMemo(() => {
    const map = new Map();
    cobranza.forEach((r) => map.set(r.mes, Number(r.cobrado || 0)));
    return map;
  }, [cobranza]);

  const resultadoAuditado = useMemo(() => {
    return (resultado || []).map((r) => ({
      ...r,
      cobrado_auditado: cobranzaByMes.has(r.mes) ? cobranzaByMes.get(r.mes) : Number(r.cobrado || 0),
    }));
  }, [resultado, cobranzaByMes]);

  const ultimoResultado = resultadoAuditado.at(-1) || {};

  const ultimoMesCerradoResultado = useMemo(() => {
    const ymNow = currentYearMonth();
    const valid = resultadoAuditado.filter((r) => Number(r.opex || 0) > 0 && Number(r.cobrado_auditado || 0) > 0);
    const cerrados = valid.filter((r) => r.mes < ymNow);
    return cerrados.at(-1) || valid.at(-1) || resultadoAuditado.at(-1) || {};
  }, [resultadoAuditado]);

  const arpuReferencia = useMemo(() => {
    const arpuKpi = Number(kpis?.arpu_real ?? kpis?.arpu ?? kpis?.arpu_facturas ?? kpis?.arpu_real_facturas) || 0;
    if (arpuKpi > 10000 && arpuKpi < 100000) return arpuKpi;
    const baseClientes = Number(kpis?.habilitados || 0) || Number(kpis?.clientes_total || 0) || 0;
    const factMes = Number(ultimoMesCerradoResultado.facturado || 0);
    const arpuFact = baseClientes > 0 ? factMes / baseClientes : 0;
    if (arpuFact > 10000 && arpuFact < 100000) return arpuFact;
    return 27497;
  }, [kpis, ultimoMesCerradoResultado]);

  const beOperativo = Math.ceil((Number(ultimoMesCerradoResultado.opex || 0) || 0) / arpuReferencia);
  const beTotalActual = Math.ceil(((Number(ultimoMesCerradoResultado.opex || 0) || 0) + CAPEX_OBRA_PROMEDIO) / arpuReferencia);
  const clientesActivos = Number(kpis?.habilitados || 0);
  const gapOperativo = Math.max(beOperativo - clientesActivos, 0);
  const gapTotal = Math.max(beTotalActual - clientesActivos, 0);

  const topCobranza = useMemo(() => {
    return cobranza.slice(-3).map((r) => ({ mes: r.mes, cobrado: Number(r.cobrado || 0) }));
  }, [cobranza]);

  const mesesCobranzaCerrados = useMemo(() => {
    const ymNow = currentYearMonth();
    return (cobranza || []).filter((r) => r.mes && r.mes < ymNow);
  }, [cobranza]);

  const crecimiento3m = useMemo(() => {
    const rows = mesesCobranzaCerrados.slice(-3);
    if (rows.length < 2) return 0;
    const first = Number(rows[0]?.cobrado || 0);
    const last = Number(rows[rows.length - 1]?.cobrado || 0);
    if (!first) return 0;
    return ((last / first) - 1) * 100;
  }, [mesesCobranzaCerrados]);

  const chartFactCob = useMemo(() => {
    const map = new Map();
    facturacion.forEach((r) => map.set(r.mes, { mes: r.mes, label: monthShort(r.mes), facturado: Number(r.facturado || 0), cobrado: 0 }));
    cobranza.forEach((r) => {
      const prev = map.get(r.mes) || { mes: r.mes, label: monthShort(r.mes), facturado: 0, cobrado: 0 };
      prev.cobrado = Number(r.cobrado || 0);
      map.set(r.mes, prev);
    });
    return Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-8);
  }, [facturacion, cobranza]);

  const chartCanales = useMemo(() => {
    if (!cobranzaCanales.length) return [];
    const months = [...new Set(cobranzaCanales.map((r) => r.mes))].sort().slice(-8);
    const byMes = new Map();
    months.forEach((mes) => byMes.set(mes, { mes, label: monthShort(mes), "Mercado Pago": 0, SIRO: 0, "Visa/MC": 0, "Pago Fácil": 0, Otros: 0 }));
    cobranzaCanales.forEach((r) => {
      if (!byMes.has(r.mes)) return;
      const row = byMes.get(r.mes);
      const canal = String(r.canal || "Otros");
      row[canal] = Number(r.cobrado || 0);
    });
    return Array.from(byMes.values());
  }, [cobranzaCanales]);

  const chartClientesCiudad = useMemo(() => {
    const rows = (region || []).map((r) => ({ ciudad: r.region || r.ciudad || "", total: Number(r.clientes_total || 0) }));
    const map = new Map();
    rows.forEach((r) => {
      const c = String(r.ciudad || "").toLowerCase().trim();
      if (["almirante brown", "brown", "burzaco", "glew", "longchamps", "longchamp", "ministro rivadavia"].includes(c)) {
        map.set("Almirante Brown", (map.get("Almirante Brown") || 0) + r.total);
      } else if (c === "florencio varela") {
        map.set("Florencio Varela", (map.get("Florencio Varela") || 0) + r.total);
      } else if (c === "capitan sarmiento" || c === "capitán sarmiento") {
        map.set("Capitán Sarmiento", (map.get("Capitán Sarmiento") || 0) + r.total);
      } else if (r.ciudad) {
        map.set(r.ciudad, (map.get(r.ciudad) || 0) + r.total);
      }
    });
    return Array.from(map.entries()).map(([ciudad, total]) => ({ ciudad, total })).sort((a, b) => b.total - a.total);
  }, [region]);

  const chartCobranzaCiudad = useMemo(() => {
    if (!cobranzaCiudad.length) return [];
    const latestMes = cobranzaCiudad.at(-1)?.mes;
    const rows = cobranzaCiudad.filter((r) => r.mes === latestMes);
    const map = new Map();
    rows.forEach((r) => map.set(r.ciudad, (map.get(r.ciudad) || 0) + Number(r.cobrado || 0)));
    return Array.from(map.entries()).map(([ciudad, cobrado]) => ({ ciudad, cobrado })).sort((a, b) => b.cobrado - a.cobrado);
  }, [cobranzaCiudad]);


  const redCapacityToday = RED_CURRENT_BOXES * RED_SUBSCRIBERS_PER_BOX;
  const redCapacityTarget = RED_TARGET_BOXES * RED_SUBSCRIBERS_PER_BOX;
  const redGapBoxes = RED_TARGET_BOXES - RED_CURRENT_BOXES;
  const redGapCapacity = redGapBoxes * RED_SUBSCRIBERS_PER_BOX;
  const redConservativeToday = redCapacityToday * RED_CONSERVATIVE_RATE;
  const redConservativeTarget = redCapacityTarget * RED_CONSERVATIVE_RATE;
  const redGrossToday = redCapacityToday * RED_BROWN_GROSS_RATE;
  const redGrossTarget = redCapacityTarget * RED_BROWN_GROSS_RATE;
  const redNetToday = redCapacityToday * RED_BROWN_NET_RATE;
  const redNetTarget = redCapacityTarget * RED_BROWN_NET_RATE;

  const redGrowthData = useMemo(() => {
    const months = buildMonthRange(RED_BASE_MONTH, RED_TARGET_MONTH);
    const startIdx = 0;
    const currentIdx = months.indexOf(RED_TODAY_MONTH);
    const endIdx = months.length - 1;

    return months.map((mes, idx) => {
      const meta =
        idx <= endIdx ? lerp(RED_BASE_BOXES, RED_TARGET_BOXES, idx / Math.max(endIdx, 1)) : null;

      let real = null;
      if (mes === RED_BASE_MONTH) real = RED_BASE_BOXES;
      if (mes === RED_TODAY_MONTH) real = RED_CURRENT_BOXES;

      const boxesEscenario = meta || null;
      const capacidad = boxesEscenario ? boxesEscenario * RED_SUBSCRIBERS_PER_BOX : null;
      return {
        mes,
        label: monthShort(mes),
        real,
        meta,
        capacidad,
        conservador: capacidad ? capacidad * RED_CONSERVATIVE_RATE : null,
        bruto_real: capacidad ? capacidad * RED_BROWN_GROSS_RATE : null,
        neto_real: capacidad ? capacidad * RED_BROWN_NET_RATE : null,
      };
    });
  }, []);

  const chartCostos = useMemo(() => {
    return resultadoAuditado.slice(-8).map((r) => ({
      mes: r.mes,
      label: monthShort(r.mes),
      ingresos: toMillions(r.cobrado_auditado),
      opex: toMillions(r.opex),
      capex: toMillions(r.capex),
    }));
  }, [resultadoAuditado]);

  const planesOrdenados = useMemo(() => {
    const rows = (planBase || []).map((r) => ({
      plan: r.plan_base || "Otros",
      clientes_total: Number(r.clientes_total || 0),
    })).sort((a, b) => b.clientes_total - a.clientes_total);
    const total = rows.reduce((acc, r) => acc + r.clientes_total, 0) || 1;
    return rows.map((r) => ({
      ...r,
      pct: (r.clientes_total / total) * 100,
    }));
  }, [planBase]);

  const clientes3050 = useMemo(() => {
    return (planBase || [])
      .filter((r) => ["30 MB", "50 MB"].includes(String(r.plan_base || "")))
      .reduce((acc, r) => acc + Number(r.clientes_total || 0), 0);
  }, [planBase]);

  const altasSeries = useMemo(() => {
    return (altasMensuales || []).map((r) => ({
      mes: r.mes,
      altas: Number(r.altas ?? r.altas_habilitados ?? 0),
    }));
  }, [altasMensuales]);

  const clienteGrowthChart = useMemo(() => {
    const churnMap = new Map((churn || []).map((r) => [r.mes, Number(r.churn_abs || 0)]));
    const months = [...new Set([
      ...altasSeries.map((r) => r.mes),
      ...(churn || []).map((r) => r.mes),
    ])].sort().slice(-8);
    return months.map((mes) => {
      const altas = altasSeries.find((r) => r.mes === mes)?.altas || 0;
      const churnAbs = churnMap.get(mes) || 0;
      return {
        mes: monthShort(mes),
        altas,
        churn: churnAbs,
        neto: altas - churnAbs,
      };
    });
  }, [altasSeries, churn]);

  const mejorMesAltas = useMemo(() => {
    return altasSeries.reduce((best, row) => (row.altas > (best?.altas || -1) ? row : best), null);
  }, [altasSeries]);

  const promedioAltas = useMemo(() => {
    const rows = altasSeries.slice(-12);
    if (!rows.length) return 0;
    return rows.reduce((acc, r) => acc + r.altas, 0) / rows.length;
  }, [altasSeries]);

  const maxCiudad = Math.max(...chartClientesCiudad.map((r) => r.total), 1);

  const churnPromAbs = useMemo(() => {
    const rows = (churn || []).slice(-6);
    if (!rows.length) return 0;
    return rows.reduce((acc, r) => acc + Number(r.churn_abs || 0), 0) / rows.length;
  }, [churn]);

  const churnAcumuladoPct = useMemo(() => {
    const total = Number(kpis?.clientes_total || 0);
    const inactivos = Number(kpis?.sin_servicio || 0);
    return total > 0 ? (inactivos / total) * 100 : 0;
  }, [kpis]);

  const churnMensualPromPct = useMemo(() => {
    return clientesActivos > 0 ? (churnPromAbs / clientesActivos) * 100 : 0;
  }, [churnPromAbs, clientesActivos]);

  const churnAnualImplicitoPct = useMemo(() => {
    const m = churnMensualPromPct / 100;
    return m > 0 ? (1 - Math.pow(1 - m, 12)) * 100 : 0;
  }, [churnMensualPromPct]);

  const vidaMediaMeses = useMemo(() => {
    const rows = (churnCohortes || [])
      .map((r) => {
        const cohorte = String(r.cohorte || "");
        const totalClientes = Number(r.total_clientes || 0);
        const churnAbs = Number(r.churn_abs || 0);
        const sobrevivientes = Math.max(totalClientes - churnAbs, 0);
        const meses = monthDiff(cohorte, currentYearMonth());
        if (meses === null || totalClientes <= 0) return null;
        return { meses, totalClientes, sobrevivientes };
      })
      .filter(Boolean);

    const numerador = rows.reduce((acc, r) => acc + (r.sobrevivientes * r.meses), 0);
    const denominador = rows.reduce((acc, r) => acc + r.totalClientes, 0);

    return denominador > 0 ? numerador / denominador : 0;
  }, [churnCohortes]);

  const cohortesView = useMemo(() => {
    const rows = (churnCohortes || [])
      .filter((r) => Number(r.total_clientes || 0) >= 30)
      .slice(-5)
      .map((r) => ({
        cohorte: r.cohorte,
        total_clientes: Number(r.total_clientes || 0),
        churn_abs: Number(r.churn_abs || 0),
        churn_pct: Number(r.churn_pct || 0),
      }));
    const maxPct = Math.max(...rows.map((r) => r.churn_pct), 1);
    return rows.map((r) => ({
      ...r,
      width: (r.churn_pct / maxPct) * 100,
      bucket:
        r.cohorte <= "2024-12" ? "Antiguo / maduro" :
        r.cohorte <= "2025-06" ? "Maduro 2025 H1" :
        r.cohorte <= "2025-12" ? "Reciente 2025 H2" :
        "Muy reciente",
    }));
  }, [churnCohortes]);

  const cohortBuckets = useMemo(() => {
    const rows = (churnCohortes || []).map((r) => {
      const totalClientes = Number(r.total_clientes || 0);
      const churnAbs = Number(r.churn_abs || 0);
      const cohorte = String(r.cohorte || "");
      const ageMonths = monthDiff(cohorte, currentYearMonth());
      return {
        totalClientes,
        churnAbs,
        sobrevivientes: Math.max(totalClientes - churnAbs, 0),
        ageMonths,
      };
    });

    const totalBase = rows.reduce((acc, r) => acc + r.totalClientes, 0) || 1;

    const before3 = rows
      .filter((r) => r.ageMonths !== null && r.ageMonths < 3)
      .reduce((acc, r) => acc + r.churnAbs, 0);

    const between36 = rows
      .filter((r) => r.ageMonths !== null && r.ageMonths >= 3 && r.ageMonths < 6)
      .reduce((acc, r) => acc + r.churnAbs, 0);

    const over12 = rows
      .filter((r) => r.ageMonths !== null && r.ageMonths >= 12)
      .reduce((acc, r) => acc + r.sobrevivientes, 0);

    return {
      before3: (before3 / totalBase) * 100,
      between36: (between36 / totalBase) * 100,
      over12: (over12 / totalBase) * 100,
    };
  }, [churnCohortes]);


  const moraPctCartera = useMemo(() => {
    const elegibles = (clientesDetalle || []).filter((r) => {
      const estado = String(r.estado || "").toLowerCase().trim();
      return estado.includes("habil") || estado.includes("bloque");
    });
    const conMora = elegibles.filter((r) => Number(r.deuda_vencida || 0) > 0);
    return elegibles.length > 0 ? (conMora.length / elegibles.length) * 100 : 0;
  }, [clientesDetalle]);

  const deudaTotalCartera = useMemo(() => {
    return (clientesDetalle || []).reduce((acc, r) => acc + Number(r.deuda || 0), 0);
  }, [clientesDetalle]);

  const deudaVencidaElegible = useMemo(() => {
    return (clientesDetalle || []).reduce((acc, r) => {
      const estado = String(r.estado || "").toLowerCase().trim();
      const elegible = estado.includes("habil") || estado.includes("bloque");
      return elegible ? acc + Number(r.deuda_vencida || 0) : acc;
    }, 0);
  }, [clientesDetalle]);

  const clientesMorososTotal = useMemo(() => {
    return (clientesDetalle || []).filter((r) => Number(r.deuda || 0) > 0 || Number(r.deuda_vencida || 0) > 0).length;
  }, [clientesDetalle]);

  const deudaPromMoroso = useMemo(() => {
    return clientesMorososTotal > 0 ? deudaTotalCartera / clientesMorososTotal : 0;
  }, [deudaTotalCartera, clientesMorososTotal]);

  const moraCiudadRows = useMemo(() => {
    const map = new Map([
      ["Almirante Brown", 0],
      ["Florencio Varela", 0],
      ["Capitán Sarmiento", 0],
    ]);
    (clientesDetalle || []).forEach((r) => {
      const estado = String(r.estado || "").toLowerCase().trim();
      const elegible = estado.includes("habil") || estado.includes("bloque");
      const deuda = Number(r.deuda_vencida || 0);
      if (!elegible || deuda <= 0) return;
      const city = normalizeCity(r.ciudad);
      if (!map.has(city)) return;
      map.set(city, (map.get(city) || 0) + deuda);
    });
    const rows = Array.from(map.entries())
      .map(([ciudad, deuda]) => ({ ciudad, deuda }))
      .filter((r) => r.deuda > 0)
      .sort((a, b) => b.deuda - a.deuda);
    const total = rows.reduce((acc, r) => acc + r.deuda, 0) || 1;
    return rows.map((r) => ({ ...r, pct: (r.deuda / total) * 100 }));
  }, [clientesDetalle]);

  const moraMedioPagoRows = useMemo(() => {
    const norm = (v) => {
      const s = String(v || "").trim().toLowerCase();
      if (!s) return "Sin declarar";
      if (s.includes("caja") || s.includes("efectivo")) return "Caja / efectivo";
      if (s.includes("deb") || s.includes("credito") || s.includes("crédito") || s.includes("tarj")) return "Débito/crédito";
      if (s.includes("domic")) return "Cobranzas domicil.";
      return String(v);
    };
    const map = new Map();
    (clientesDetalle || []).forEach((r) => {
      const estado = String(r.estado || "").toLowerCase().trim();
      const elegible = estado.includes("habil") || estado.includes("bloque");
      const deuda = Number(r.deuda_vencida || 0);
      if (!elegible || deuda <= 0) return;
      const key = norm(r.medio_pago);
      map.set(key, (map.get(key) || 0) + 1);
    });
    const rows = Array.from(map.entries())
      .map(([medio, cantidad]) => ({ medio, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 3);
    const total = rows.reduce((acc, r) => acc + r.cantidad, 0) || 1;
    return rows.map((r) => ({ ...r, pct: (r.cantidad / total) * 100 }));
  }, [clientesDetalle]);

  const coberturaPolygons = useMemo(() => parseKmlPolygons(COBERTURA_KML), []);

  const moraMapPoints = useMemo(() => {
    return (clientesDetalle || [])
      .map((r) => {
        const lat = Number(r.lat);
        const lng = Number(r.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        const estado = String(r.estado || "").toLowerCase().trim();
        const ciudadNorm = normalizeCity(r.ciudad);
        if (!["Almirante Brown", "Florencio Varela"].includes(ciudadNorm)) return null;
        let category = null;
        if (estado.includes("sin servicio")) category = "sin_servicio";
        else if (estado.includes("bloque")) category = "bloqueado";
        else if (estado.includes("habil")) category = "habilitado";
        if (!category) return null;
        return { lat, lng, category };
      })
      .filter(Boolean);
  }, [clientesDetalle]);

  const buildGrowthMatrix = (rows, label) => {
    const altasMap = new Map();
    const churnMap = new Map();
    const ymNow = currentYearMonth();

    rows.forEach((r) => {
      const estado = String(r.estado || "").toLowerCase().trim();
      const alta = String(r.fecha_alta || "");
      const bloqueo = String(r.fecha_bloqueo || "");

      if (alta) {
        const mes = alta.slice(0, 7);
        if (mes && mes < ymNow) altasMap.set(mes, (altasMap.get(mes) || 0) + 1);
      }

      if (bloqueo && estado === "sin servicio") {
        const mes = bloqueo.slice(0, 7);
        if (mes && mes < ymNow) churnMap.set(mes, (churnMap.get(mes) || 0) + 1);
      }
    });

    const months = [...new Set([...altasMap.keys(), ...churnMap.keys()])]
      .sort()
      .filter((mes) => (altasMap.get(mes) || 0) + (churnMap.get(mes) || 0) > 0);

    const lastMonthWithAltas = [...months].reverse().find((mes) => (altasMap.get(mes) || 0) > 0);
    const effectiveMonths = lastMonthWithAltas ? months.filter((mes) => mes <= lastMonthWithAltas) : months;

    const data = effectiveMonths.slice(-8).map((mes) => {
      const altas = altasMap.get(mes) || 0;
      const churn = churnMap.get(mes) || 0;
      return { mes, label: monthShort(mes), altas, churn, neto: altas - churn };
    });

    const avgNeto = data.length ? data.reduce((acc, r) => acc + r.neto, 0) / data.length : 0;
    const avgAltas = data.length ? data.reduce((acc, r) => acc + r.altas, 0) / data.length : 0;
    const avgChurn = data.length ? data.reduce((acc, r) => acc + r.churn, 0) / data.length : 0;
    return { label, data, avgNeto, avgAltas, avgChurn };
  };

  const generalClienteMatrix = useMemo(() => {
    const altasMap = new Map();
    const churnMap = new Map();
    const ymNow = currentYearMonth();

    (altasMensuales || []).forEach((r) => {
      const mes = String(r.mes || "");
      const altas = Number(r.altas || r.cantidad || 0);
      if (mes && mes < ymNow) altasMap.set(mes, altas);
    });

    (churn || []).forEach((r) => {
      const mes = String(r.mes || "");
      const churnMes = Number(r.churn_abs || r.churn || 0);
      if (mes && mes < ymNow) churnMap.set(mes, churnMes);
    });

    const months = [...new Set([...altasMap.keys(), ...churnMap.keys()])]
      .sort()
      .filter((mes) => (altasMap.get(mes) || 0) + (churnMap.get(mes) || 0) > 0);

    const lastMonthWithAltas = [...months].reverse().find((mes) => (altasMap.get(mes) || 0) > 0);
    const effectiveMonths = lastMonthWithAltas ? months.filter((mes) => mes <= lastMonthWithAltas) : months;

    const data = effectiveMonths.slice(-8).map((mes) => {
      const altas = altasMap.get(mes) || 0;
      const churnMes = churnMap.get(mes) || 0;
      return { mes, label: monthShort(mes), altas, churn: churnMes, neto: altas - churnMes };
    });

    const avgNeto = data.length ? data.reduce((acc, r) => acc + r.neto, 0) / data.length : 0;
    const avgAltas = data.length ? data.reduce((acc, r) => acc + r.altas, 0) / data.length : 0;
    const avgChurn = data.length ? data.reduce((acc, r) => acc + r.churn, 0) / data.length : 0;
    return { label: "General", data, avgNeto, avgAltas, avgChurn };
  }, [altasMensuales, churn]);

  const clienteMatrices = useMemo(() => {
    const rows = clientesDetalle || [];
    const isBrown = (r) => normalizeCity(r.ciudad) === "Almirante Brown";
    const isVarela = (r) => normalizeCity(r.ciudad) === "Florencio Varela";
    const isCapitan = (r) => normalizeCity(r.ciudad) === "Capitán Sarmiento";
    return [
      generalClienteMatrix,
      buildGrowthMatrix(rows.filter(isBrown), "Almirante Brown"),
      buildGrowthMatrix(rows.filter(isVarela), "Florencio Varela"),
      buildGrowthMatrix(rows.filter(isCapitan), "Capitán Sarmiento"),
    ];
  }, [clientesDetalle, generalClienteMatrix]);

  const planScenarioBars = [
    { escenario: "Conservador", bruto: 240, churn: 50, neto: 190 },
    { escenario: "Optimista", bruto: 300, churn: 45, neto: 255 },
    { escenario: "Ideal", bruto: 400, churn: 25, neto: 375 },
  ];

  const beTargetClientes = beTotalActual;
  const beScenarioProjection = useMemo(() => {
    const start = Number(kpis?.habilitados || 0);
    const months = buildMonthRange(currentYearMonth(), RED_TARGET_MONTH);
    return months.map((mes, idx) => ({
      mes,
      label: monthShort(mes),
      be: beTargetClientes,
      conservador: start + planScenarioBars[0].neto * idx,
      optimista: start + planScenarioBars[1].neto * idx,
      ideal: start + planScenarioBars[2].neto * idx,
    }));
  }, [kpis, beTargetClientes]);

  const beFinancialProjection = useMemo(() => {
    const ymNow = currentYearMonth();
    const closed = (resultadoAuditado || [])
      .filter((r) => r.mes && r.mes < ymNow)
      .filter((r) => Number(r.cobrado_auditado || 0) > 0 && Number(r.opex || 0) > 0);

    const last3 = closed.slice(-3);
    const avgOpex = last3.length
      ? last3.reduce((acc, r) => acc + Number(r.opex || 0), 0) / last3.length
      : Number(ultimoMesCerradoResultado.opex || 0);

    const startIngreso = Number(ultimoMesCerradoResultado.cobrado_auditado || 0);
    const futureMonths = buildMonthRange(ymNow, RED_TARGET_MONTH);

    const historico = last3.map((r) => ({
      mes: r.mes,
      label: monthShort(r.mes),
      opex_real: Number(r.opex || 0) / 1_000_000,
      capex_real: Number(r.capex || 0) / 1_000_000,
      egresos_promedio: null,
      ingreso_actual: Number(r.cobrado_auditado || 0) / 1_000_000,
      conservador: null,
      optimista: null,
      ideal: null,
    }));

    const futuros = futureMonths.map((mes, idx) => {
      const capexProyectado = idx < 6 ? 40_000_000 : 0;
      const egresosPromedio = avgOpex + capexProyectado;
      return {
        mes,
        label: idx === 0 ? "Hoy" : monthShort(mes),
        opex_real: null,
        capex_real: null,
        egresos_promedio: egresosPromedio / 1_000_000,
        ingreso_actual: idx === 0 ? startIngreso / 1_000_000 : null,
        conservador: (startIngreso + planScenarioBars[0].neto * arpuReferencia * idx) / 1_000_000,
        optimista: (startIngreso + planScenarioBars[1].neto * arpuReferencia * idx) / 1_000_000,
        ideal: (startIngreso + planScenarioBars[2].neto * arpuReferencia * idx) / 1_000_000,
      };
    });

    return [...historico, ...futuros];
  }, [resultadoAuditado, ultimoMesCerradoResultado, arpuReferencia]);

  const beScenarioSummary = planScenarioBars.map((s) => ({
    ...s,
    meses: Math.max(Math.ceil(Math.max(beTargetClientes - Number(kpis?.habilitados || 0), 0) / s.neto), 0),
  }));

  const recuperoGeoData = [
    { zona: "Almirante Brown", onus: 508 },
    { zona: "Capitán Sarmiento", onus: 138 },
    { zona: "Glew", onus: 53 },
    { zona: "Ministro Rivadavia", onus: 46 },
    { zona: "Longchamps", onus: 22 },
    { zona: "F. Varela", onus: 9 },
  ];
  const ultimoChurn = churn.at(-1) || {};

  if (loading) {
    return (
      <div className="wrap">
        <GlobalStyles />
        <div className="card">
          <div className="ct">Cargando</div>
          <div className="ins ins-i">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap">
        <GlobalStyles />
        <div className="card">
          <div className="ct">Error</div>
          <div className="ins ins-d">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <GlobalStyles />
      <div className="wrap">
        <div className="hdr">
          <div className="hdr-logo">
            <div className="logo-wrap">
              <img src={LOGO_SRC} alt="WeConnect" className="logo-img" />
            </div>
            <div>
              <div className="logo-name">WeConnect</div>
              <div className="logo-sub">Dashboard Ejecutivo · Netsharing SA</div>
            </div>
          </div>
          <div className="hdr-meta">
            <div className="live-dot"></div>
            <span className="live-lbl">En línea</span>
            <span className="hdr-tag">{fmtNum(kpis?.clientes_total)} clientes</span>
            <span className="hdr-tag">ARPU real {fmtMoney(arpuReferencia)}</span>
          </div>
        </div>

        <div className="tabs-wrap">
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.key} className={`tab ${tab === t.key ? "on" : ""}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab === "negocio" && (
          <div className="sec on">
            <div className="kr k5">
              {topCobranza.map((r, idx) => (
                <Kpi key={r.mes} label={`Cobranza ${monthShort(r.mes)}`} value={fmtMoney(r.cobrado)} sub={idx === topCobranza.length - 1 ? "Último mes cargado" : "Caja real"} tone="ok" />
              ))}
              <Kpi label="ARPU real" value={fmtMoney(arpuReferencia)} sub={`Referencia ${monthShort(ultimoMesCerradoResultado.mes)}`} tone="tl" />
              <Kpi label="Brecha último mes" value={fmtMoney(ultimoResultado.brecha_facturado_cobrado)} sub="Facturado vs cobrado" tone="dn" />
            </div>
            <div className="g2">
              <Card title="Cobrado vs facturado mensual ($M)">
                <div className="leg">
                  <span className="li"><span className="ld" style={{ background: "#1A5FBF" }}></span>Cobrado</span>
                  <span className="li"><span className="ld" style={{ background: "#D13030" }}></span>Facturado</span>
                </div>
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <LineChart data={chartFactCob}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                      <Tooltip formatter={(v) => fmtMoney(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="cobrado" name="Cobrado" stroke="#1A5FBF" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="facturado" name="Facturado" stroke="#D13030" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Evolución canales de cobro — últimos 8 meses">
                {chartCanales.length ? (
                  <div className="ch-lg">
                    <ResponsiveContainer>
                      <BarChart data={chartCanales}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                        <Tooltip formatter={(v) => fmtMoney(v)} />
                        <Legend />
                        <Bar dataKey="Mercado Pago" stackId="a" fill="#1A5FBF" />
                        <Bar dataKey="SIRO" stackId="a" fill="#1A7A3C" />
                        <Bar dataKey="Visa/MC" stackId="a" fill="#7B5EA7" />
                        <Bar dataKey="Pago Fácil" stackId="a" fill="#C47A00" />
                        <Bar dataKey="Otros" stackId="a" fill="#5A6A7A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="ins ins-w">Este gráfico se activará apenas empiece a devolver datos la vista <strong>vw_cobranza_canales_mensual</strong>.</div>}
              </Card>
            </div>
            <div className="g22">
              <Card title="Clientes por ciudad">
                <div className="ch">
                  <ResponsiveContainer>
                    <BarChart data={chartClientesCiudad}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="ciudad" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtNum(v)} />
                      <Bar dataKey="total" fill="#1A5FBF" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Cobranza acumulada por ciudad">
                {chartCobranzaCiudad.length ? (
                  <div className="ch">
                    <ResponsiveContainer>
                      <BarChart data={chartCobranzaCiudad}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="ciudad" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1_000_000)}M`} />
                        <Tooltip formatter={(v) => fmtMoney(v)} />
                        <Bar dataKey="cobrado" fill="#0D7377" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : <div className="ins ins-w">La parte monetaria por ciudad quedará visible cuando esté lista la vista <strong>vw_cobranza_por_ciudad</strong>.</div>}
              </Card>
            </div>
            <div className="kr k3">
              <Kpi label={`Tasa de cobranza ${monthShort(ultimoResultado.mes)}`} value={fmtPct(ultimoResultado.tasa_cobranza_pct, 2)} sub="Aplica solo al mes mostrado" tone="ok" />
              <Kpi label="Crecimiento del cobro" value={fmtPct(crecimiento3m, 2)} sub="Últimos 3 meses cerrados" tone="nv" />
              <Kpi label="ARPU referencia" value={fmtMoney(arpuReferencia)} sub={`Mes base ${monthShort(ultimoMesCerradoResultado.mes)}`} tone="tl" />
            </div>
          </div>
        )}

        {tab === "costos" && (
          <div className="sec on">
            <div className="ins ins-i" style={{ marginBottom: 14 }}>
              Break-even auditado sobre el último mes cerrado con OPEX y cobrado válidos: <strong>{monthShort(ultimoMesCerradoResultado.mes)}</strong>.
            </div>
            <div className="kr k4">
              <Kpi label="OPEX mes base" value={fmtMoney(ultimoMesCerradoResultado.opex)} sub={monthShort(ultimoMesCerradoResultado.mes)} tone="dn" />
              <Kpi label="Clientes para equilibrio operativo" value={fmtNum(beOperativo)} sub={`Sin CAPEX de obra · gap actual ${fmtNum(gapOperativo)}`} tone="wr" />
              <Kpi label="Clientes para equilibrio total actual" value={fmtNum(beTotalActual)} sub={`Incluye CAPEX obra promedio ${fmtMoney(CAPEX_OBRA_PROMEDIO)} · gap ${fmtNum(gapTotal)}`} tone="nv" />
              <Kpi label="ARPU usado" value={fmtMoney(arpuReferencia)} sub="Base real para el cálculo" tone="tl" />
            </div>
            <div className="card">
              <div className="ct">P&L mensual real — ingresos vs egresos</div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead><tr><th>Mes</th><th className="r">Ingresos</th><th className="r">OPEX</th><th className="r">CAPEX</th><th className="r">Resultado OPEX</th><th className="r">Neto total</th></tr></thead>
                  <tbody>
                    {resultadoAuditado.slice(-12).reverse().map((r) => (
                      <tr key={r.mes}>
                        <td>{r.mes}</td>
                        <td className="r">{fmtMoney(r.cobrado_auditado)}</td>
                        <td className="r dn">{fmtMoney(r.opex)}</td>
                        <td className="r">{fmtMoney(r.capex)}</td>
                        <td className="r">{fmtMoney(r.cobrado_auditado - Number(r.opex || 0))}</td>
                        <td className="r">{fmtMoney(r.cobrado_auditado - Number(r.opex || 0) - Number(r.capex || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="g22">
              <Card title="Ingresos vs egresos totales ($M)">
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <ComposedChart data={chartCostos}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtMoney1(Number(v) * 1_000_000)} />
                      <Legend />
                      <Bar dataKey="opex" stackId="egresos" name="OPEX" fill="#D13030" />
                      <Bar dataKey="capex" stackId="egresos" name="CAPEX" fill="#1A5FBF" />
                      <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="#1A7A3C" strokeWidth={3} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Card>
              <Card title="Lectura de equilibrio">
                <div className="ins ins-i"><strong>Equilibrio operativo:</strong> cubre solo OPEX mensual.</div>
                <div className="ins ins-w"><strong>Equilibrio total actual:</strong> suma CAPEX promedio de obra de {fmtMoney(CAPEX_OBRA_PROMEDIO)} por mes mientras dure la ampliación.</div>
                <div className="ins ins-d">El CAPEX de ampliación es transitorio. Una vez terminada la obra, el equilibrio vuelve al nivel operativo.</div>
              </Card>
            </div>
          </div>
        )}

        {tab === "clientes" && (
          <div className="sec on">
            <div className="kr k4">
              <Kpi label="Clientes totales" value={fmtNum(kpis?.clientes_total)} sub="Base actual" tone="nv" />
              <Kpi label="Habilitados / activos" value={fmtNum(kpis?.habilitados)} sub={`${fmtPct((Number(kpis?.habilitados||0)/(Number(kpis?.clientes_total||1)))*100)} del padrón`} tone="ok" />
              <Kpi label="Mejor mes de altas" value={fmtNum(mejorMesAltas?.altas)} sub={mejorMesAltas ? monthShort(mejorMesAltas.mes) : "Sin datos"} tone="ok" />
              <Kpi label="Promedio altas/mes" value={promedioAltas ? `~${fmtNum(Math.round(promedioAltas))}` : "0"} sub="Últimos 12 meses" tone="nv" />
            </div>

            <div className="g22">
              {clienteMatrices.map((m) => (
                <Card key={m.label} title={`Altas, churns y crecimiento neto mensual · ${m.label}`}>
                  <div className="leg">
                    <span className="li"><span className="ld" style={{ background: "#1A7A3C" }}></span>Altas</span>
                    <span className="li"><span className="ld" style={{ background: "rgba(209,48,48,.55)" }}></span>Churns</span>
                    <span className="li"><span className="ld" style={{ background: "#1A5FBF", borderRadius: "50%" }}></span>Neto</span>
                  </div>
                  <div className="ks" style={{ marginBottom: 8 }}>
                    Prom. altas {fmtNum(Math.round(m.avgAltas))} · churn {fmtNum(Math.round(m.avgChurn))} · neto {fmtNum(Math.round(m.avgNeto))}
                  </div>
                  <div className="ch">
                    <ResponsiveContainer>
                      <ComposedChart data={m.data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="altas" name="Altas" fill="#1A7A3C" />
                        <Bar dataKey="churn" name="Churns" fill="rgba(209,48,48,.65)" />
                        <Line type="monotone" dataKey="neto" name="Neto" stroke="#1A5FBF" strokeWidth={2.5} dot={false} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              ))}
            </div>

            <div className="g2">
              <Card title="Distribución de planes">
                {planesOrdenados.map((r) => (
                  <div className="plan-row" key={r.plan}>
                    <span style={{ fontWeight: 600 }}>{r.plan}</span>
                    <span>
                      <span className={`bdg ${r.pct >= 20 ? "bdg-g" : r.pct >= 6 ? "bdg-w" : "bdg-i"}`}>{fmtNum(r.clientes_total)} clientes</span>
                      <span style={{ fontSize: 10, color: "var(--text2)", marginLeft: 6 }}>{fmtPct(r.pct)}</span>
                    </span>
                  </div>
                ))}
                <div className="ins ins-i" style={{ marginTop: 10 }}>
                  {clientes3050 > 0
                    ? `${fmtNum(clientes3050)} clientes en 30/50 MB → espacio claro para upsell al plan base siguiente.`
                    : "La lectura comercial queda concentrada en la mezcla real de planes de la base actual."}
                </div>
              </Card>

              <Card title="Distribución geográfica">
                {chartClientesCiudad.map((r) => (
                  <div className="br" key={r.ciudad}>
                    <div className="bl">{r.ciudad}</div>
                    <div className="bt"><div className="bf" style={{ width: `${(r.total / maxCiudad) * 100}%`, background: "#1A5FBF" }}></div></div>
                    <div className="bv">{fmtNum(r.total)}</div>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        )}

        {tab === "churn" && (
          <div className="sec on">
            <div className="kr k4">
              <Kpi label="Churn acumulado" value={fmtPct(churnAcumuladoPct)} sub={`${fmtNum(kpis?.sin_servicio)} de ${fmtNum(kpis?.clientes_total)} inactivos`} tone="dn" />
              <Kpi label="Tasa mensual prom." value={fmtPct(churnMensualPromPct)} sub={`${fmtNum(Math.round(churnPromAbs))} clientes/mes`} tone="wr" />
              <Kpi label="Churn anual implícito" value={fmtPct(churnAnualImplicitoPct)} sub="Estimación anualizada" tone="dn" />
              <Kpi label="Vida media" value={vidaMediaMeses ? `${vidaMediaMeses.toFixed(1)} meses` : "—"} sub="Vida real de clientes sobre cohortes" tone="wr" />
            </div>

            <div className="g2">
              <Card title="Tasa de churn mensual (%)">
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <LineChart data={(churn || []).slice(-8).map((r) => ({ mes: monthShort(r.mes), churn_abs: Number(r.churn_abs || 0) }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtNum(v)} />
                      <Line type="monotone" dataKey="churn_abs" stroke="#D13030" strokeWidth={3} dot={{ r: 4, fill: "#D13030" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Churn acumulado por cohorte">
                <div style={{ marginBottom: 10 }}>
                  {cohortesView.map((r, idx) => (
                    <div className="cohort-row" key={r.cohorte}>
                      <div className="cohort-lbl">{r.bucket} ({monthShort(r.cohorte)})</div>
                      <div className="cohort-bar">
                        <div className="cohort-fill" style={{
                          width: `${r.width}%`,
                          background: idx < 2 ? "#D13030" : idx < 4 ? "#C47A00" : "#1A7A3C"
                        }}>
                          {fmtPct(r.churn_pct, 1)}
                        </div>
                      </div>
                      <span className="cohort-meta">{fmtNum(r.churn_abs)} churn</span>
                    </div>
                  ))}
                </div>
                <div className="ins ins-d">
                  Las cohortes maduras muestran el churn estructural acumulado de la base ya expuesta al ciclo completo.
                </div>
                <div className="ins ins-g">
                  Las cohortes más recientes sirven para detectar si la calidad de captación y activación viene mejorando.
                </div>
              </Card>
            </div>

            <div className="kr k3">
              <Kpi label="Churnan antes del mes 3" value={fmtPct(cohortBuckets.before3)} sub="Cohortes muy recientes" tone="dn" />
              <Kpi label="Churnan entre mes 3–6" value={fmtPct(cohortBuckets.between36)} sub="Ventana crítica de consolidación" tone="wr" />
              <Kpi label="Más de 12 meses activos" value={fmtPct(cohortBuckets.over12)} sub="Clientes que lograron permanencia" tone="ok" />
            </div>
          </div>
        )}

        {tab === "mora" && (
          <div className="sec on">
            <div className="kr k4">
              <Kpi label="Deuda total cartera" value={fmtMoney(deudaTotalCartera)} sub="habilitados + bloqueados + sin servicio" tone="dn" />
              <Kpi label="Deuda vencida" value={fmtMoney(deudaVencidaElegible)} sub="solo habilitados + bloqueados" tone="dn" />
              <Kpi label="% cartera con mora" value={fmtPct(moraPctCartera)} sub="sobre habilitados + bloqueados" tone="wr" />
              <Kpi label="Deuda prom./moroso" value={fmtMoney(deudaPromMoroso)} sub="deuda total cartera / clientes morosos" tone="wr" />
            </div>

            <div className="g2">
              <Card title="Deuda vencida por ciudad">
                {moraCiudadRows.map((r, idx) => (
                  <div className="br" key={r.ciudad}>
                    <div className="bl">{r.ciudad}</div>
                    <div className="bt">
                      <div className="bf" style={{ width: `${r.pct}%`, background: idx < 2 ? "#D13030" : idx < 4 ? "#C47A00" : "#5A6A7A" }}></div>
                    </div>
                    <div className="bv">{fmtMoney(r.deuda)}</div>
                  </div>
                ))}
                <div className="ins ins-d" style={{ marginTop: 10 }}>
                  {moraCiudadRows.length
                    ? `${moraCiudadRows[0].ciudad} concentra ${fmtPct(moraCiudadRows[0].pct)} de la deuda vencida mostrada.`
                    : "Sin deuda vencida por ciudad para mostrar."}
                </div>

                <hr className="dv" />
                <div className="ct">Causa raíz — medios de pago declarados</div>
                {moraMedioPagoRows.map((r, idx) => (
                  <div className="br" key={r.medio}>
                    <div className="bl">{r.medio}</div>
                    <div className="bt">
                      <div className="bf" style={{ width: `${r.pct}%`, background: idx === 0 ? "#D13030" : idx === 1 ? "#7B5EA7" : "#1A7A3C" }}></div>
                    </div>
                    <div className="bv">{fmtNum(r.cantidad)} ({fmtPct(r.pct)})</div>
                  </div>
                ))}
                <div className="ins ins-d" style={{ marginTop: 10 }}>
                  {moraMedioPagoRows.length
                    ? `${fmtPct(moraMedioPagoRows[0].pct)} de los morosos relevados declara ${moraMedioPagoRows[0].medio.toLowerCase()}.`
                    : "Sin datos de medio de pago para morosos."}
                </div>
              </Card>

              <Card title="Mapa de deudores y clientes activos">
                <MoraMap polygons={coberturaPolygons} points={moraMapPoints} />
              </Card>
            </div>
          </div>
        )}

        {tab === "red" && (
          <div className="sec on">
            <div className="ins ins-i" style={{ marginBottom: 14 }}>
              La ampliación en Almirante Brown parte de <strong>{fmtNum(RED_BASE_BOXES)} cajas</strong> en marzo,
              suma <strong>{fmtNum(RED_CURRENT_BOXES - RED_BASE_BOXES)} cajas</strong> en la etapa actual y busca
              alcanzar <strong>{fmtNum(RED_TARGET_BOXES)} cajas</strong> al cierre del objetivo.
            </div>

            <div className="kr k4">
              <Kpi
                label="Cajas instaladas hoy"
                value={fmtNum(RED_CURRENT_BOXES)}
                sub={`${fmtNum(redGapBoxes)} cajas para la meta`}
                tone="nv"
              />
              <Kpi
                label="Capacidad potencial hoy"
                value={fmtNum(redCapacityToday)}
                sub={`${fmtNum(RED_CURRENT_BOXES)} cajas × ${fmtNum(RED_SUBSCRIBERS_PER_BOX)} abonados`}
                tone="ok"
              />
              <Kpi
                label="Ventas teóricas hoy"
                value={fmtNum(Math.round(redConservativeToday))}
                sub="Escenario conservador 2%"
                tone="tl"
              />
              <Kpi
                label="Crecimiento neto Brown"
                value={fmtNum(Math.round(RED_BROWN_NET_AVG))}
                sub={`Bruto ${fmtNum(Math.round(RED_BROWN_GROSS_AVG))} - churn ${fmtNum(Math.round(RED_BROWN_CHURN_AVG))}`}
                tone="ok"
              />
            </div>

            <div className="g2">
              <Card title="Crecimiento de cajas — real vs meta">
                <div className="leg">
                  <span className="li"><span className="ld" style={{ background: "#1A5FBF" }}></span>Real</span>
                  <span className="li"><span className="ld" style={{ background: "#1A7A3C" }}></span>Meta a marzo</span>
                </div>
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <LineChart data={redGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtNum(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="real" name="Cajas reales" stroke="#1A5FBF" strokeWidth={3} connectNulls={false} />
                      <Line type="monotone" dataKey="meta" name="Meta acumulada" stroke="#1A7A3C" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Lectura de expansión y equilibrio">
                <div className="ins ins-g">
                  Con <strong>{fmtNum(RED_CURRENT_BOXES)}</strong> cajas hoy, la red soporta una capacidad potencial
                  de <strong>{fmtNum(redCapacityToday)}</strong> abonados.
                </div>
                <div className="ins ins-i">
                  La regla conservadora del 2% implica <strong>{fmtNum(Math.round(redConservativeToday))} ventas/mes</strong> hoy
                  y <strong>{fmtNum(Math.round(redConservativeTarget))} ventas/mes</strong> al llegar a {fmtNum(RED_TARGET_BOXES)} cajas.
                </div>
                <div className="ins ins-w">
                  En Brown, los últimos 3 meses cerrados validan <strong>{fmtNum(Math.round(RED_BROWN_GROSS_AVG))} altas brutas/mes</strong>,
                  pero el crecimiento efectivo queda en <strong>{fmtNum(Math.round(RED_BROWN_NET_AVG))} netas/mes</strong> al descontar churn.
                </div>
                <div className="ins ins-d">
                  Para cerrar la brecha de red faltan <strong>{fmtNum(redGapBoxes)} cajas</strong>, equivalentes a
                  <strong> {fmtNum(redGapCapacity)} abonados potenciales</strong>.
                </div>
              </Card>
            </div>

            <div className="g22">
              <Card title="Escenarios de ventas mensuales sobre capacidad">
                <div className="leg">
                  <span className="li"><span className="ld" style={{ background: "#0D7377" }}></span>Conservador 2%</span>
                  <span className="li"><span className="ld" style={{ background: "#1A5FBF" }}></span>Real bruto Brown</span>
                  <span className="li"><span className="ld" style={{ background: "#D13030" }}></span>Real neto Brown</span>
                </div>
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <LineChart data={redGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtNum(Math.round(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="conservador" name="Conservador 2%" stroke="#0D7377" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="bruto_real" name="Brown bruto validado" stroke="#1A5FBF" strokeWidth={2.5} dot={false} />
                      <Line type="monotone" dataKey="neto_real" name="Brown neto validado" stroke="#D13030" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Resumen ejecutivo de crecimiento">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Escenario</th>
                      <th className="r">Mar-26</th>
                      <th className="r">Hoy</th>
                      <th className="r">Objetivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Cajas</td>
                      <td className="r">{fmtNum(RED_BASE_BOXES)}</td>
                      <td className="r">{fmtNum(RED_CURRENT_BOXES)}</td>
                      <td className="r">{fmtNum(RED_TARGET_BOXES)}</td>
                    </tr>
                    <tr>
                      <td>Capacidad potencial</td>
                      <td className="r">{fmtNum(RED_BASE_BOXES * RED_SUBSCRIBERS_PER_BOX)}</td>
                      <td className="r">{fmtNum(redCapacityToday)}</td>
                      <td className="r">{fmtNum(redCapacityTarget)}</td>
                    </tr>
                    <tr>
                      <td>Ventas 2%</td>
                      <td className="r">{fmtNum(Math.round(RED_BASE_BOXES * RED_SUBSCRIBERS_PER_BOX * RED_CONSERVATIVE_RATE))}</td>
                      <td className="r">{fmtNum(Math.round(redConservativeToday))}</td>
                      <td className="r">{fmtNum(Math.round(redConservativeTarget))}</td>
                    </tr>
                    <tr>
                      <td>Brown bruto validado</td>
                      <td className="r">{fmtNum(Math.round(RED_BROWN_GROSS_AVG))}</td>
                      <td className="r">{fmtNum(Math.round(redGrossToday))}</td>
                      <td className="r">{fmtNum(Math.round(redGrossTarget))}</td>
                    </tr>
                    <tr>
                      <td>Brown neto validado</td>
                      <td className="r">{fmtNum(Math.round(RED_BROWN_NET_AVG))}</td>
                      <td className="r">{fmtNum(Math.round(redNetToday))}</td>
                      <td className="r">{fmtNum(Math.round(redNetTarget))}</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
            </div>
          </div>
        )}
        {tab === "be" && (
          <div className="sec on">
            <div className="kr k4">
              <Kpi label="Ingresos último mes" value={fmtMoney(ultimoMesCerradoResultado.cobrado_auditado)} sub={monthShort(ultimoMesCerradoResultado.mes)} tone="ok" />
              <Kpi label="Egresos totales reales" value={fmtMoney(Number(ultimoMesCerradoResultado.opex || 0) + Number(ultimoMesCerradoResultado.capex || 0))} sub="CAPEX + OPEX juntos" tone="dn" />
              <Kpi label="Clientes para break-even" value={fmtNum(beTargetClientes)} sub={`Gap actual ${fmtNum(Math.max(beTargetClientes - Number(kpis?.habilitados || 0), 0))}`} tone="wr" />
              <Kpi label="Escenario base plan" value="255 netos/mes" sub="Optimista recomendado" tone="tl" />
            </div>

            <div className="card">
              <div className="ct">Ingresos vs egresos totales ($M)</div>
              <div className="ch-lg" style={{ height: 430 }}>
                <ResponsiveContainer>
                  <ComposedChart data={beFinancialProjection}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v)}M`} />
                    <Tooltip formatter={(v) => fmtMoney1(Number(v) * 1_000_000)} />
                    <Legend />
                    <Bar dataKey="opex_real" stackId="real" name="OPEX real" fill="#D13030" radius={[0,0,0,0]} />
                    <Bar dataKey="capex_real" stackId="real" name="CAPEX real" fill="#F28B82" radius={[4,4,0,0]} />
                    <Line type="linear" dataKey="egresos_promedio" name="Egresos proyectados promedio" stroke="#5A6A7A" strokeWidth={2} strokeDasharray="6 6" dot={false} />
                    <Line type="linear" dataKey="ingreso_actual" name="Ingreso actual" stroke="#1A5FBF" strokeWidth={3} dot={{ r: 4 }} />
                    <Line type="linear" dataKey="conservador" name="Escenario conservador" stroke="#C47A00" strokeWidth={2.5} dot={false} />
                    <Line type="linear" dataKey="optimista" name="Escenario optimista" stroke="#1A7A3C" strokeWidth={3} dot={false} />
                    <Line type="linear" dataKey="ideal" name="Escenario ideal" stroke="#0D7377" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="ins ins-i" style={{ marginTop: 10 }}>
                Las barras rojas muestran <strong>egresos reales divididos entre OPEX y CAPEX</strong> en los últimos meses cerrados. La línea punteada proyecta egresos con <strong>OPEX promedio de los últimos 3 meses</strong> más <strong>CAPEX de $40M durante 6 meses</strong>; luego el CAPEX se corta.
              </div>
            </div>

            <div className="card">
              <div className="ct">Escenarios del plan — neto mensual y tiempo estimado</div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead>
                    <tr><th>Escenario</th><th className="r">Bruto</th><th className="r">Churn</th><th className="r">Neto</th><th className="r">Meses a BE</th></tr>
                  </thead>
                  <tbody>
                    {beScenarioSummary.map((s, idx) => (
                      <tr key={s.escenario} className={idx === 1 ? "hl" : ""}>
                        <td>{s.escenario}</td>
                        <td className="r">{fmtNum(s.bruto)}</td>
                        <td className="r">{fmtNum(s.churn)}</td>
                        <td className="r ok">{fmtNum(s.neto)}</td>
                        <td className="r">{s.meses === 0 ? "Ya alcanzado" : `${fmtNum(s.meses)} meses`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="ins ins-g" style={{ marginTop: 10 }}>
                El escenario optimista es la referencia recomendada porque combina red, pauta, TV y omnicanal con una trayectoria defendible hacia el equilibrio.
              </div>
            </div>
          </div>
        )}
        {tab === "rrss" && <div className="sec on"><PlaceholderSection title="Redes sociales" text="Maqueta lista. Después conectamos Meta, Google y TikTok o carga manual mensual." /></div>}
        {tab === "ia" && <div className="sec on"><PlaceholderSection title="IA Ventas" text="Pestaña reservada para indicadores de automatización, asistencia y conversión por IA." /></div>}
        {tab === "dvtas" && <div className="sec on"><PlaceholderSection title="Dashboard Ventas IA" text="Acá después cruzamos leads, conversaciones, altas y atribución." /></div>}
        {tab === "aportes" && <div className="sec on"><PlaceholderSection title="Aportes al objetivo" text="Pestaña preparada para ver cuánto aporta cada frente al objetivo mensual." /></div>}
        {tab === "recupero" && (
          <div className="sec on">
            <div className="ins ins-i" style={{ marginBottom: 14 }}>
              Area nueva: <strong>Retiro / Recupero de Equipos — Almirante Brown</strong>. 497 ONUs pendientes · $25.5M ARS neto recuperable · 1 persona con vehículo propio · Combustible incluido en salario · TC $1.450 ARS/USD · ONU: USD 35 + IVA = $61.408 ARS
            </div>

            <div className="kr k4">
              <Kpi label="ONUs pendientes AB" value="497" sub="64% del backlog total" tone="dn" />
              <Kpi label="Valor neto recuperable" value="$25.5M" sub="ARS · 497 × $51.408 neto" tone="ok" />
              <Kpi label="Costo fijo mensual" value="$2.25M" sub="salario + cargas, sin movilidad extra" tone="wr" />
              <Kpi label="ROI peor caso" value="1.42x" sub="positivo desde el día 1" tone="ok" />
            </div>

            <div className="g22">
              <Card title="Estructura del puesto">
                <table className="tbl">
                  <thead><tr><th>Concepto</th><th className="r">Importe</th><th>Nota</th></tr></thead>
                  <tbody>
                    <tr><td>Salario bruto</td><td className="r">$1.500.000</td><td>Incluye combustible</td></tr>
                    <tr><td>Cargas sociales (50%)</td><td className="r">$750.000</td><td>Jubilación, ART, etc.</td></tr>
                    <tr><td>Movilidad extra</td><td className="r">$0</td><td>Vehículo propio</td></tr>
                    <tr className="hl"><td><strong>COSTO FIJO TOTAL</strong></td><td className="r"><strong>$2.250.000</strong></td><td>por mes</td></tr>
                  </tbody>
                </table>
              </Card>

              <Card title="Estructura de comisiones">
                <table className="tbl">
                  <thead><tr><th>Actividad</th><th className="r">Comisión</th><th>Cuándo cobra</th><th className="r">Margen empresa</th></tr></thead>
                  <tbody>
                    <tr><td>Retiro de ONU</td><td className="r">$10.000</td><td>Al cerrar ticket</td><td className="r">$51.408</td></tr>
                    <tr><td>A — Pago completo de deuda</td><td className="r">$15.000</td><td>Cobro único al activar</td><td className="r">$23.375</td></tr>
                    <tr><td>B — Plan de cuotas: cuota 1</td><td className="r">$7.500</td><td>Al firmar el acuerdo</td><td className="r">—</td></tr>
                    <tr><td>B — Plan de cuotas: cuota 2</td><td className="r">$7.500</td><td>Al cobrar 2da cuota del plan</td><td className="r">$23.375</td></tr>
                    <tr className="hl"><td><strong>Total modalidad B</strong></td><td className="r"><strong>$15.000</strong></td><td>Mismo total que modalidad A</td><td className="r"><strong>= modalidad A</strong></td></tr>
                  </tbody>
                </table>
                <div className="ins ins-i" style={{ marginTop: 10 }}>
                  El recurso siempre cobra <strong>$15.000 por cliente activado</strong>, sin importar si paga todo o en cuotas. La diferencia es el timing: pago completo = cobro inmediato; plan cuotas = 2 tramos alineados al cobro real.
                </div>
              </Card>
            </div>

            <div className="card">
              <div className="ct">Distribución mensual — lo que percibe la persona vs lo que retiene la empresa</div>
              <div style={{ overflowX: "auto" }}>
                <table className="tbl">
                  <thead><tr><th>Concepto</th><th className="r">Peor absoluto</th><th className="r">Peor realista</th><th className="r">Base</th><th className="r">Bueno</th></tr></thead>
                  <tbody>
                    <tr className="hl"><td colSpan="5"><strong>▸ ACTIVIDAD</strong></td></tr>
                    <tr><td>ONUs retiradas/mes</td><td className="r">66</td><td className="r">86</td><td className="r">108</td><td className="r">132</td></tr>
                    <tr><td>Clientes recuperados/mes</td><td className="r">2</td><td className="r">3</td><td className="r">5</td><td className="r">7</td></tr>
                    <tr><td>Planes de pago/mes</td><td className="r">3</td><td className="r">5</td><td className="r">8</td><td className="r">12</td></tr>

                    <tr className="hl"><td colSpan="5"><strong>▸ INGRESOS EMPRESA</strong></td></tr>
                    <tr><td>Retiro de ONUs</td><td className="r">$4.05M</td><td className="r">$5.28M</td><td className="r">$6.63M</td><td className="r">$8.11M</td></tr>
                    <tr><td>Recupero clientes (ARPU mensual)</td><td className="r">$53k</td><td className="r">$79k</td><td className="r">$131k</td><td className="r">$184k</td></tr>
                    <tr><td>Planes de pago cobrados</td><td className="r">$115k</td><td className="r">$192k</td><td className="r">$307k</td><td className="r">$460k</td></tr>
                    <tr className="hi"><td><strong>TOTAL INGRESOS</strong></td><td className="r"><strong>$4.22M</strong></td><td className="r"><strong>$5.55M</strong></td><td className="r"><strong>$7.07M</strong></td><td className="r"><strong>$8.75M</strong></td></tr>

                    <tr className="hl"><td colSpan="5"><strong>▸ PERSONA PERCIBE (bruto, antes de retenciones)</strong></td></tr>
                    <tr><td>Salario fijo (incl. combustible)</td><td className="r">$1.50M</td><td className="r">$1.50M</td><td className="r">$1.50M</td><td className="r">$1.50M</td></tr>
                    <tr><td>Comisión ONUs</td><td className="r">$660k</td><td className="r">$860k</td><td className="r">$1.08M</td><td className="r">$1.32M</td></tr>
                    <tr><td>Comisión recuperos</td><td className="r">$30k</td><td className="r">$45k</td><td className="r">$75k</td><td className="r">$105k</td></tr>
                    <tr><td>Comisión planes pago</td><td className="r">$22k</td><td className="r">$38k</td><td className="r">$60k</td><td className="r">$90k</td></tr>
                    <tr><td><strong>TOTAL PERSONA</strong></td><td className="r"><strong>$2.21M</strong></td><td className="r"><strong>$2.44M</strong></td><td className="r"><strong>$2.71M</strong></td><td className="r"><strong>$3.02M</strong></td></tr>
                    <tr><td>Multiplicador</td><td className="r">1.48x</td><td className="r">1.63x</td><td className="r">1.81x</td><td className="r">2.01x</td></tr>

                    <tr className="hl"><td colSpan="5"><strong>▸ EMPRESA RETIENE</strong></td></tr>
                    <tr><td>Costo fijo (sal+cargas)</td><td className="r">-$2.25M</td><td className="r">-$2.25M</td><td className="r">-$2.25M</td><td className="r">-$2.25M</td></tr>
                    <tr><td>Comisiones pagadas</td><td className="r">-$712k</td><td className="r">-$942k</td><td className="r">-$1.22M</td><td className="r">-$1.51M</td></tr>
                    <tr className="hi"><td><strong>RESULTADO NETO EMPRESA</strong></td><td className="r"><strong>$1.26M</strong></td><td className="r"><strong>$2.36M</strong></td><td className="r"><strong>$3.61M</strong></td><td className="r"><strong>$4.99M</strong></td></tr>
                    <tr><td>ROI</td><td className="r">1.42x</td><td className="r">1.74x</td><td className="r">2.04x</td><td className="r">2.32x</td></tr>

                    <tr className="hl"><td colSpan="5"><strong>▸ DISTRIBUCIÓN EXCEDENTE NETO</strong></td></tr>
                    <tr><td>Persona (% del excedente)</td><td className="r">64%</td><td className="r">51%</td><td className="r">43%</td><td className="r">38%</td></tr>
                    <tr><td>Empresa (% del excedente)</td><td className="r">36%</td><td className="r">49%</td><td className="r">57%</td><td className="r">62%</td></tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="g22">
              <Card title="Persona percibe (ARS/mes)">
                <div className="br"><div className="bl">Peor absoluto</div><div className="bt"><div className="bf" style={{ width: "73%", background: "#C47A00" }}></div></div><div className="bv">$2.21M</div></div>
                <div className="br"><div className="bl">Peor realista</div><div className="bt"><div className="bf" style={{ width: "81%", background: "#1A5FBF" }}></div></div><div className="bv">$2.44M</div></div>
                <div className="br"><div className="bl">Base</div><div className="bt"><div className="bf" style={{ width: "90%", background: "#1A7A3C" }}></div></div><div className="bv">$2.71M</div></div>
                <div className="br"><div className="bl">Bueno</div><div className="bt"><div className="bf" style={{ width: "100%", background: "#0D7377" }}></div></div><div className="bv">$3.02M</div></div>
              </Card>

              <Card title="Empresa retiene — resultado neto (ARS/mes)">
                <div className="br"><div className="bl">Peor absoluto</div><div className="bt"><div className="bf" style={{ width: "25%", background: "#C47A00" }}></div></div><div className="bv">$1.26M</div></div>
                <div className="br"><div className="bl">Peor realista</div><div className="bt"><div className="bf" style={{ width: "47%", background: "#1A5FBF" }}></div></div><div className="bv">$2.36M</div></div>
                <div className="br"><div className="bl">Base</div><div className="bt"><div className="bf" style={{ width: "72%", background: "#1A7A3C" }}></div></div><div className="bv">$3.61M</div></div>
                <div className="br"><div className="bl">Bueno</div><div className="bt"><div className="bf" style={{ width: "100%", background: "#0D7377" }}></div></div><div className="bv">$4.99M</div></div>
              </Card>
            </div>

            <div className="g22">
              <Card title="Timeline recupero backlog AB — 497 ONUs">
                <div className="plan-row"><span>8 meses</span><span className="bdg bdg-w">5 visitas/día · 60% éxito · 66 ONUs/mes</span></div>
                <div className="plan-row"><span>6 meses</span><span className="bdg bdg-i">6 visitas/día · 65% éxito · 86 ONUs/mes</span></div>
                <div className="plan-row"><span>5 meses</span><span className="bdg bdg-g">7 visitas/día · 70% éxito · 108 ONUs/mes</span></div>
              </Card>

              <Card title="Semáforos KPI del área — actualizar mensualmente">
                <table className="tbl">
                  <tbody>
                    <tr><td>ONUs retiradas/semana</td><td className="r">—</td><td>obj: ↑18</td><td>◻ Sin dato</td></tr>
                    <tr><td>Backlog total pendiente</td><td className="r">497</td><td>obj: ↓200</td><td className="dn">🔴 Rojo</td></tr>
                    <tr><td>Clientes recuperados/mes</td><td className="r">—</td><td>obj: ↑5</td><td>◻ Sin dato</td></tr>
                    <tr><td>Tiempo coord a visita (días)</td><td className="r">—</td><td>obj: ↓3</td><td>◻ Sin dato</td></tr>
                  </tbody>
                </table>
              </Card>
            </div>

            <div className="kr k4">
              <Kpi label="ONUs retiradas esta semana" value="18" sub="ejemplo de seguimiento" tone="nv" />
              <Kpi label="Backlog pendiente total" value="497" sub="inicio del área" tone="dn" />
              <Kpi label="Recuperos este mes" value="3" sub="ejemplo de activaciones" tone="ok" />
              <Kpi label="Tiempo coord a visita" value="4 días" sub="objetivo ≤ 3" tone="wr" />
            </div>
          </div>
        )}
        {tab === "objetivos" && <div className="sec on"><PlaceholderSection title="Objetivos" text="Próximo paso: conectar objetivos_mensuales y cumplimiento vs real." /></div>}
        {tab === "plan" && (
          <div className="sec on">
            <div className="ins ins-i" style={{ marginBottom: 14 }}>
              El foco pasa de ordenar información a construir una <strong>máquina integrada de crecimiento</strong>:
              red + pauta + omnicanal IA + TV + control de churn.
            </div>

            <div className="kr k4">
              <Kpi label="Pauta objetivo" value="USD 3.500" sub="Meta 2.000 · Google 1.000 · TikTok 500" tone="nv" />
              <Kpi label="Omnicanal IA" value="Fin de abril" sub="Ventas + atención + soporte" tone="ok" />
              <Kpi label="Producto de entrada" value="Internet + TV" sub="3 meses de fútbol gratis" tone="tl" />
              <Kpi label="Meta operativa" value="255 netos/mes" sub="300 brutas - 45 churn" tone="wr" />
            </div>

            <div className="g2">
              <Card title="Plan de mejoras — frentes prioritarios">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Frente</th>
                      <th>Meta</th>
                      <th>Impacto esperado</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Red</td>
                      <td>Escalar de 1.170 a 3.000 cajas</td>
                      <td>Más capacidad comercial y más superficie vendible</td>
                    </tr>
                    <tr>
                      <td>Omnicanal IA</td>
                      <td>Producción fin de abril</td>
                      <td>Responder 24/7, ordenar atención y mejorar cierre</td>
                    </tr>
                    <tr>
                      <td>Oferta comercial</td>
                      <td>Internet + TV + fútbol gratis</td>
                      <td>Subir valor percibido y bajar objeción por precio</td>
                    </tr>
                    <tr>
                      <td>Pauta</td>
                      <td>USD 3.500 / mes</td>
                      <td>Diversificar adquisición y reducir dependencia</td>
                    </tr>
                    <tr>
                      <td>Churn</td>
                      <td>Bajar churn evitable</td>
                      <td>Transformar bruto en neto sostenible</td>
                    </tr>
                  </tbody>
                </table>
              </Card>

              <Card title="Escenarios ejecutivos">
                <div className="plan-row">
                  <span style={{ fontWeight: 600 }}>Conservador</span>
                  <span><span className="bdg bdg-w">175–205 netos/mes</span></span>
                </div>
                <div className="plan-row">
                  <span style={{ fontWeight: 600 }}>Optimista</span>
                  <span><span className="bdg bdg-g">230–290 netos/mes</span></span>
                </div>
                <div className="plan-row">
                  <span style={{ fontWeight: 600 }}>Ideal</span>
                  <span><span className="bdg bdg-i">320–430 netos/mes</span></span>
                </div>

                <div className="ins ins-g" style={{ marginTop: 10 }}>
                  Escenario base recomendado para gestión: <strong>300 altas brutas / 45 churn / 255 netos por mes</strong>.
                </div>
                <div className="ins ins-w">
                  La pauta adicional sola no alcanza. El impacto aparece cuando red, oferta, omnicanal y atención trabajan coordinados.
                </div>
              </Card>
            </div>

            <div className="g22">
              <Card title="Crecimiento actual de red">
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <LineChart data={redGrowthData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmtNum(Math.round(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="real" name="Cajas reales" stroke="#1A5FBF" strokeWidth={3} connectNulls={false} />
                      <Line type="monotone" dataKey="meta" name="Meta acumulada" stroke="#1A7A3C" strokeWidth={2.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Escenarios del plan">
                <div className="ch-lg">
                  <ResponsiveContainer>
                    <BarChart data={planScenarioBars}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="escenario" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="bruto" name="Bruto" fill="#1A5FBF" />
                      <Bar dataKey="churn" name="Churn" fill="#D13030" />
                      <Bar dataKey="neto" name="Neto" fill="#1A7A3C" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
            <div className="g22">
              <Card title="Hoja de ruta 2026">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Mes</th>
                      <th>Hito</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Abril</td>
                      <td>Salida a producción del omnicanal IA + incorporación de TV + estabilización del dashboard</td>
                    </tr>
                    <tr>
                      <td>Mayo</td>
                      <td>Consolidar Meta + Google + TikTok, medir adopción de TV y comparar bruto vs neto</td>
                    </tr>
                    <tr>
                      <td>Junio</td>
                      <td>Ajustar embudo comercial, bajar churn evitable y validar entrada al escenario optimista</td>
                    </tr>
                    <tr>
                      <td>Julio en adelante</td>
                      <td>Escalar red, escalar pauta eficiente y acelerar trayectoria hacia equilibrio</td>
                    </tr>
                  </tbody>
                </table>
              </Card>

              <Card title="Insights ejecutivos">
                <div className="ins ins-i">
                  Brown ya validó una tasa superior al piso conservador del 2%, incluso antes de capturar toda la expansión futura.
                </div>
                <div className="ins ins-g">
                  TV + fútbol gratis puede transformar la propuesta comercial en una zona sensible a precio.
                </div>
                <div className="ins ins-w">
                  El omnicanal IA no es solo eficiencia: es una palanca directa de conversión, atención y retención.
                </div>
                <div className="ins ins-d">
                  La prioridad no es solo crecer en bruto, sino convertir la nueva capacidad de red en <strong>crecimiento neto sostenible</strong>.
                </div>
              </Card>
            </div>
          </div>
        )}

        <div className="foot">WeConnect · Dashboard Ejecutivo · versión visual alineada al aprobado</div>
      </div>
    </>
  );
}

function GlobalStyles() {
  return (
    <style>{`
      :root{--navy:#0D1B2A;--navyM:#1B2E45;--navyL:#243F5E;--red:#D13030;--redP:#FEE9E9;--amber:#C47A00;--amberP:#FEF6DC;--green:#1A7A3C;--greenP:#E5F5EC;--blue:#1A5FBF;--blueP:#E6EFFE;--teal:#0D7377;--tealP:#E3F4F4;--bg:#F4F6F9;--bg2:#FFFFFF;--bg3:#EEF1F5;--text:#0D1B2A;--text2:#5A6A7A;--text3:#9AACBC;--bdr:#DDE3EC;--font:'DM Sans',system-ui,sans-serif;--mono:'DM Mono',monospace;}
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:var(--font);background:var(--bg);color:var(--text);font-size:13px;line-height:1.5;-webkit-text-size-adjust:100%;}
      .wrap{max-width:1240px;margin:0 auto;padding:16px 14px 40px;}
      .hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;padding-bottom:14px;border-bottom:2px solid var(--navy);flex-wrap:wrap;gap:10px;}
      .hdr-logo{display:flex;align-items:center;gap:12px;min-width:0;}
      .logo-wrap{width:48px;height:48px;background:#fff;border-radius:10px;display:flex;align-items:center;justify-content:center;border:.5px solid var(--bdr);overflow:hidden;flex-shrink:0;box-shadow:0 2px 8px rgba(13,27,42,.06);}
      .logo-img{width:100%;height:100%;object-fit:contain;}
      .logo-name{font-size:20px;font-weight:600;color:var(--navy);}
      .logo-sub{font-size:11px;color:var(--text2);}
      .hdr-meta{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
      .live-dot{width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 2s infinite;}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .live-lbl{font-size:11px;color:var(--green);font-weight:500;}
      .hdr-tag{font-size:11px;color:var(--text2);padding:3px 10px;background:var(--bg3);border-radius:20px;border:.5px solid var(--bdr);}
      .tabs-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin-bottom:18px;padding-bottom:2px;}
      .tabs-wrap::-webkit-scrollbar{display:none;}
      .tabs{display:flex;gap:2px;background:var(--bg3);border-radius:10px;padding:3px;width:max-content;min-width:100%;border:.5px solid var(--bdr);}
      .tab{font-size:12px;padding:7px 13px;border-radius:7px;border:none;background:transparent;color:var(--text2);cursor:pointer;font-weight:500;white-space:nowrap;transition:all .15s;}
      .tab.on{background:var(--navy);color:#fff;font-weight:600;box-shadow:0 2px 6px rgba(13,27,42,.28);}
      .kr{display:grid;gap:10px;margin-bottom:14px;}
      .k3{grid-template-columns:repeat(3,minmax(0,1fr));}
      .k4{grid-template-columns:repeat(4,minmax(0,1fr));}
      .k5{grid-template-columns:repeat(5,minmax(0,1fr));}
      @media(max-width:900px){.k5{grid-template-columns:repeat(2,1fr);}}
      @media(max-width:720px){.k4,.k3{grid-template-columns:repeat(2,1fr);}}
      @media(max-width:420px){.k3,.k4,.k5{grid-template-columns:1fr;}}
      .kpi{background:var(--bg2);border:.5px solid var(--bdr);border-radius:10px;padding:13px 14px;border-top:2.5px solid var(--bdr);}
      .kpi.ok{border-top-color:var(--green);} .kpi.wr{border-top-color:var(--amber);} .kpi.dn{border-top-color:var(--red);} .kpi.nv{border-top-color:var(--navy);} .kpi.tl{border-top-color:var(--teal);}
      .kl{font-size:10px;color:var(--text2);margin-bottom:3px;text-transform:uppercase;letter-spacing:.06em;font-weight:500;}
      .kv{font-size:21px;font-weight:600;line-height:1.2;font-family:var(--mono);}
      .ks{font-size:10px;color:var(--text2);margin-top:2px;}
      .c-ok{color:var(--green);} .c-wr{color:var(--amber);} .c-dn{color:var(--red);} .c-nv{color:var(--navy);} .c-tl{color:var(--teal);}
      .card{background:var(--bg2);border:.5px solid var(--bdr);border-radius:12px;padding:14px 16px;margin-bottom:12px;}
      .ct{font-size:10px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.07em;margin-bottom:12px;}
      .g2{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:12px;margin-bottom:12px;}
      .g22{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px;}
      @media(max-width:700px){.g2,.g22{grid-template-columns:1fr;}}
      .ins{border-radius:8px;padding:9px 12px;font-size:12px;line-height:1.65;border-left:3px solid;margin-bottom:8px;}
      .ins-i{background:var(--blueP);color:#103B8A;border-color:var(--blue);}
      .ins-w{background:var(--amberP);color:#7A4C00;border-color:var(--amber);}
      .ins-d{background:var(--redP);color:#891515;border-color:var(--red);}
      .ins-g{background:var(--greenP);color:#0F5226;border-color:var(--green);}
      .ch{position:relative;height:220px;}
      .ch-lg{position:relative;height:260px;}
      .leg{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:10px;font-size:11px;color:var(--text2);}
      .li{display:flex;align-items:center;gap:4px;}
      .ld{width:9px;height:9px;border-radius:2px;flex-shrink:0;}
      .tbl{width:100%;border-collapse:collapse;font-size:11px;}
      .tbl th{text-align:left;font-size:10px;font-weight:600;color:var(--text2);padding:5px 8px;border-bottom:1px solid var(--bdr);text-transform:uppercase;letter-spacing:.05em;}
      .tbl th.r{text-align:right;}
      .tbl td{padding:6px 8px;border-bottom:.5px solid var(--bdr);}
      .tbl td.r{text-align:right;font-family:var(--mono);}
      .tbl tr:last-child td{border-bottom:none;}
      .tbl td.dn{color:var(--red);font-weight:600;}
      .plan-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:.5px solid var(--bdr);font-size:12px;gap:8px;}
      .plan-row:last-child{border-bottom:none;}
      .bdg{font-size:10px;padding:2px 7px;border-radius:9px;font-weight:600;white-space:nowrap;}
      .bdg-g{background:var(--greenP);color:var(--green);} .bdg-w{background:var(--amberP);color:var(--amber);} .bdg-i{background:var(--blueP);color:var(--blue);}
      .br{display:flex;align-items:center;gap:6px;margin-bottom:7px;}
      .bl{width:38%;flex-shrink:0;color:var(--text2);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .bt{flex:1;height:7px;background:var(--bg3);border-radius:4px;overflow:hidden;border:.5px solid var(--bdr);}
      .bf{height:100%;border-radius:3px;}
      .bv{min-width:50px;text-align:right;font-size:11px;font-weight:600;font-family:var(--mono);}
      .cohort-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;}
      .cohort-lbl{min-width:160px;font-size:10px;color:var(--text2);}
      .cohort-bar{flex:1;height:18px;background:var(--bg3);border-radius:3px;overflow:hidden;}
      .cohort-fill{height:100%;display:flex;align-items:center;padding-left:6px;font-size:10px;font-weight:600;color:#fff;}
      .cohort-meta{font-size:10px;font-weight:600;color:var(--text2);min-width:60px;text-align:right;}
      .map-sub{font-size:11px;color:var(--text2);margin-bottom:10px;}.leaflet-map{width:100%;height:520px;border:0.5px solid var(--bdr);border-radius:12px;background:#F8FAFC;overflow:hidden;}
      .map-svg{width:100%;height:460px;border:.5px solid var(--bdr);border-radius:12px;background:#F8FAFC;display:block;}
      .map-legend-box{margin-top:10px;padding:10px 12px;border:.5px solid var(--bdr);border-radius:10px;background:#fff;}
      .map-legend-title{font-size:12px;font-weight:600;color:var(--navy);margin-bottom:8px;}
      .map-legend-row{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--text);margin-bottom:6px;}
      .map-legend-row:last-child{margin-bottom:0;}
      .map-dot{width:14px;height:14px;border-radius:50%;display:inline-block;flex-shrink:0;}
      hr.dv{border:none;border-top:.5px solid var(--bdr);margin:14px 0;}
      .map-filters{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:10px;}.map-filter-item{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--text2);background:var(--bg3);padding:6px 8px;border-radius:8px;border:.5px solid var(--bdr);}.map-filter-item input{margin:0;}.foot{text-align:center;padding:20px 0 8px;font-size:11px;color:var(--text3);}
    `}</style>
  );
}
