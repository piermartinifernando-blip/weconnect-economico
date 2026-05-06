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

export const getChurnMensual = () =>
  query(() => supabase.from('vw_churn_mensual_real').select('*').order('mes'))

export const getBloqueadosTramos = () =>
  query(() => supabase.from('vw_bloqueados_tramos').select('*'))

// KPIs ACTUALES
export const getKpisActuales = () =>
  query(() => supabase.from('vw_kpis_actuales').select('*'))

export const getEstadoOperativo = () =>
  query(() => supabase.from('vw_estado_actual_operativo').select('*'))

// MORA
export const getMoraActual = () =>
  query(() => supabase.from('vw_mora_actual').select('*'))

export const getMoraPorRegion = () =>
  query(() => supabase.from('vw_clientes_por_region').select('*'))

export const getMoraPorCiudad = () =>
  query(() => supabase.from('vw_clientes_por_ciudad').select('*'))

// EGRESOS — vista vw_egresos_net_mensual cols: periodo, rubro, monto, registros, tipo
export const getEgresosNetMensual = () =>
  query(() => supabase.from('vw_egresos_net_mensual').select('*').order('periodo'))

// vista vw_egresos_por_rubro cols: rubro, monto_total, registros, meses
export const getEgresosPorRubro = () =>
  query(() => supabase.from('vw_egresos_por_rubro').select('*').order('monto_total', { ascending: false }))

// vista vw_egresos_por_subrubro cols: rubro, subrubro, monto_total, registros
export const getEgresosPorSubrubro = (rubro = null) =>
  query(() => {
    let q = supabase.from('vw_egresos_por_subrubro').select('*')
    if (rubro) q = q.eq('rubro', rubro)
    return q.order('monto_total', { ascending: false })
  })

// vista vw_egresos_por_proveedor cols: proveedor, monto_total, registros, rubros_distintos, tiene_intercompany
export const getEgresosPorProveedor = (rubro = null) =>
  query(() => {
    let q = supabase.from('vw_egresos_por_proveedor').select('*')
    // nota: la vista no tiene filtro por rubro, se filtra en el frontend
    return q.order('monto_total', { ascending: false })
  })

// vista vw_egresos_por_centro cols: centro_costo, monto_total, registros
export const getEgresosPorCentro = () =>
  query(() => supabase.from('vw_egresos_por_centro').select('*').order('monto_total', { ascending: false }))

export const getEgresosDetalle = (proveedor = null, rubro = null, limit = 100) =>
  query(() => {
    let q = supabase.from('egresos').select('id, fecha_documento, periodo, detalle, importe_total, tipo_egreso, medio_pago, estado_pago, origen, estado_control')
    if (proveedor) q = q.ilike('detalle', `%${proveedor}%`)
    return q.order('fecha_documento', { ascending: false }).limit(limit)
  })

export const getEgresosOtrasSociedades = () =>
  query(() => supabase.from('vw_egresos_otras_sociedades').select('*').order('monto', { ascending: false }))

// RESULTADO MENSUAL — vista vw_resultado_mensual cols: periodo, facturado, cobrado, opex, capex, resultado_operativo, resultado_neto
export const getResultadoMensual = () =>
  query(() => supabase.from('vw_resultado_mensual').select('*').order('periodo'))

// P&L — usa la vista vw_resultado_mensual directamente
export const getPnL = async () => {
  const { data, error } = await supabase.from('vw_resultado_mensual').select('*').order('periodo')
  if (error) return { data: null, error: error.message }

  const pl = (data || []).map(p => ({
    periodo: p.periodo,
    ingresos: Number(p.cobrado || 0),
    facturado: Number(p.facturado || 0),
    opex: Number(p.opex || 0),
    capex: Number(p.capex || 0),
    egresos_total: Number(p.opex || 0) + Number(p.capex || 0),
    resultado_operativo: Number(p.resultado_operativo || 0),
    resultado_neto: Number(p.resultado_neto || 0),
  }))
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
