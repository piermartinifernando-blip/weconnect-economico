import { supabase } from './supabase'

async function query(fn) {
  try {
    const { data, error } = await fn()
    if (error) throw error
    return { data, error: null }
  } catch (err) {
    console.error('WeConnect query error:', err.message)
    return { data: null, error: err.message }
  }
}

// INGRESOS — cols: mes, cobrado/facturado
export const getCobranzaMensual = () =>
  query(() => supabase.from('vw_cobranza_mensual').select('*').order('mes'))

export const getFacturacionMensual = () =>
  query(() => supabase.from('vw_facturacion_mensual').select('*').order('mes'))

export const getCobranzaCanales = () =>
  query(() => supabase.from('vw_cobranza_canales_mensual').select('*'))

export const getCobranzaPorCiudad = () =>
  query(() => supabase.from('vw_cobranza_por_ciudad').select('*'))

// CLIENTES — cols: zona, estado, cantidad, deuda_vencida
export const getClientesPorCiudad = () =>
  query(() => supabase.from('vw_clientes_por_ciudad').select('*'))

export const getClientesPorPlan = () =>
  query(() => supabase.from('vw_clientes_por_plan').select('*'))

export const getClientesPorRegion = () =>
  query(() => supabase.from('vw_clientes_por_region').select('*'))

export const getAltasMensual = () =>
  query(() => supabase.from('vw_altas_mensual').select('*').order('mes'))

export const getChurnEventos = () =>
  query(() => supabase.from('vw_churn_eventos_mensual').select('*').order('mes'))

export const getChurnMensualReal = () =>
  query(() => supabase.from('vw_churn_mensual_real').select('*').order('mes'))

// Alias para compatibilidad con Clientes.jsx
export const getChurnMensual = () =>
  query(() => supabase.from('vw_churn_mensual_real').select('*').order('mes'))

export const getBloqueadosTramos = () =>
  query(() => supabase.from('vw_bloqueados_tramos').select('*'))

// KPIs ACTUALES
export const getKpisActuales = () =>
  query(() => supabase.from('vw_kpis_actuales').select('*'))

export const getEstadoOperativo = () =>
  query(() => supabase.from('vw_estado_actual_operativo').select('*'))

// MORA — total y por región
export const getMoraActual = () =>
  query(() => supabase.from('vw_mora_actual').select('*'))

export const getMoraPorRegion = () =>
  query(() => supabase.from('vw_clientes_por_region').select('*'))

export const getMoraPorCiudad = () =>
  query(() => supabase.from('vw_clientes_por_ciudad').select('*'))

// EGRESOS — cols: periodo, tipo_egreso, total, registros
export const getEgresosNetMensual = () =>
  query(() => supabase.from('vw_egresos_net_mensual').select('*').order('periodo'))

export const getEgresosPorRubro = (periodo = null) =>
  query(() => {
    let q = supabase.from('vw_egresos_por_rubro').select('*')
    if (periodo) q = q.eq('periodo', periodo)
    return q.order('total', { ascending: false })
  })

export const getEgresosPorSubrubro = (rubro = null) =>
  query(() => {
    let q = supabase.from('vw_egresos_por_subrubro').select('*')
    if (rubro) q = q.eq('rubro', rubro)
    return q.order('total', { ascending: false })
  })

export const getEgresosPorProveedor = (rubro = null, periodo = null) =>
  query(() => {
    let q = supabase.from('vw_egresos_por_proveedor').select('*')
    if (rubro) q = q.eq('rubro', rubro)
    if (periodo) q = q.eq('periodo', periodo)
    return q.order('total', { ascending: false })
  })

export const getEgresosPorCentro = () =>
  query(() => supabase.from('vw_egresos_por_centro').select('*').order('total', { ascending: false }))

export const getEgresosDetalle = (proveedor = null, rubro = null, limit = 100) =>
  query(() => {
    let q = supabase.from('egresos').select('id, fecha_documento, periodo, detalle, importe_total, tipo_egreso, medio_pago, estado_pago, origen, estado_control')
    if (proveedor) q = q.ilike('detalle', `%${proveedor}%`)
    return q.order('fecha_documento', { ascending: false }).limit(limit)
  })

export const getEgresosOtrasSociedades = () =>
  query(() => supabase.from('vw_egresos_otras_sociedades').select('*').order('total', { ascending: false }))

// RESULTADO MENSUAL (P&L integrado)
export const getResultadoMensual = () =>
  query(() => supabase.from('vw_resultado_mensual').select('*').order('mes'))

// P&L — combina cobranza + egresos
export const getPnL = async () => {
  const [cobRes, egRes] = await Promise.all([
    supabase.from('vw_cobranza_mensual').select('*').order('mes'),
    supabase.from('vw_egresos_net_mensual').select('*').order('periodo'),
  ])
  if (cobRes.error) return { data: null, error: cobRes.error.message }
  if (egRes.error) return { data: null, error: egRes.error.message }

  const cobranza = cobRes.data || []
  const egresos = egRes.data || []
  const periodos = [...new Set(egresos.map(e => e.periodo))].sort()

  const pl = periodos.map(p => {
    const cobr = cobranza.find(c => c.mes === p)
    const opex = egresos.filter(e => e.periodo === p && e.tipo_egreso === 'OPEX').reduce((s, e) => s + Number(e.total), 0)
    const capex = egresos.filter(e => e.periodo === p && e.tipo_egreso === 'CAPEX').reduce((s, e) => s + Number(e.total), 0)
    const ingresos = Number(cobr?.cobrado || 0)
    return { periodo: p, ingresos, opex, capex, egresos_total: opex + capex, resultado_operativo: ingresos - opex, resultado_neto: ingresos - opex - capex }
  })
  return { data: pl, error: null }
}

// AUDITORÍA
export const getCalidadImportacion = () =>
  query(() => supabase.from('vw_calidad_importacion').select('*'))

export const getImportLog = (limit = 20) =>
  query(() => supabase.from('import_log').select('*').order('fecha_import', { ascending: false }).limit(limit))

// CATÁLOGOS lectura
export const getRubros = () =>
  query(() => supabase.from('cat_rubros').select('*').order('orden'))

export const getSubrubros = (rubroId = null) =>
  query(() => {
    let q = supabase.from('cat_subrubros').select('*, rubro:cat_rubros(nombre)')
    if (rubroId) q = q.eq('rubro_id', rubroId)
    return q.order('nombre')
  })

export const getCentrosCosto = () =>
  query(() => supabase.from('cat_centros_costo').select('*').order('tipo,nombre'))

export const getProveedores = () =>
  query(() => supabase.from('proveedores').select('*').order('nombre'))

export const getSociedades = () =>
  query(() => supabase.from('sociedades').select('*').order('nombre'))

// CARGA MANUAL
export const insertEgreso = (egreso) =>
  query(() => supabase.from('egresos').insert(egreso).select().single())

export const updateEgreso = (id, changes) =>
  query(() => supabase.from('egresos').update(changes).eq('id', id).select().single())

// CATÁLOGOS escritura
export const upsertRubro = (rubro) =>
  query(() => supabase.from('cat_rubros').upsert(rubro).select().single())

export const upsertSubrubro = (subrubro) =>
  query(() => supabase.from('cat_subrubros').upsert(subrubro).select().single())

export const upsertCentroCosto = (cc) =>
  query(() => supabase.from('cat_centros_costo').upsert(cc).select().single())

export const upsertProveedor = (prov) =>
  query(() => supabase.from('proveedores').upsert(prov).select().single())
