import { useState, useEffect, useCallback } from 'react'
import { KpiCard, LoadingState, ErrorState } from '../components/UI'
import { COLORS as C } from '../lib/constants'
import { fmt, fmtNum } from '../lib/formatters'
import { supabase } from '../lib/supabase'

const NETSHARING_ID = '234cbb7d-3172-4c56-9ae2-b79967031cd0'

async function fetchEgresos(filtro) {
  let q = supabase.from('egresos').select(`
    id, fecha_documento, periodo, detalle, importe_total, tipo_egreso, medio_pago,
    estado_pago, estado_control, observaciones, origen, es_intercompany,
    sociedad_pagadora_id, sociedad_consumidora_id,
    centro_costo_geo_id, centro_costo_func_id, subrubro_id,
    rubro:cat_rubros(id, nombre, tipo_egreso_default, es_intercompany),
    subrubro:cat_subrubros(id, nombre),
    proveedor:proveedores(id, nombre)
  `).order('importe_total', { ascending: false })
  if (filtro === 'revisar') q = q.eq('estado_control', 'revisar')
  if (filtro === 'importado') q = q.eq('estado_control', 'importado')
  if (filtro === 'ok') q = q.eq('estado_control', 'ok')
  if (filtro === 'sin_tipo') q = q.is('tipo_egreso', null)
  if (filtro === 'sin_sociedad') q = q.is('sociedad_consumidora_id', null)
  if (filtro === 'sin_subrubro') q = q.is('subrubro_id', null)
  if (filtro === 'intercompany') q = q.eq('es_intercompany', true)
  const { data, error } = await q.limit(200)
  return { data: data || [], error }
}

async function fetchCatalogos() {
  const [rubros, subrubros, centros, sociedades] = await Promise.all([
    supabase.from('cat_rubros').select('id, nombre, tipo_egreso_default, es_intercompany').order('orden'),
    supabase.from('cat_subrubros').select('id, nombre, rubro_id').order('nombre'),
    supabase.from('cat_centros_costo').select('id, nombre, tipo').order('tipo, nombre'),
    supabase.from('sociedades').select('id, nombre').order('nombre'),
  ])
  return {
    rubros: rubros.data || [], subrubros: subrubros.data || [],
    centrosGeo: (centros.data || []).filter(c => c.tipo === 'geografico'),
    centrosFunc: (centros.data || []).filter(c => c.tipo === 'funcional'),
    sociedades: sociedades.data || [],
  }
}

async function fetchStats() {
  const { data } = await supabase.from('egresos').select('id, estado_control, tipo_egreso, subrubro_id, centro_costo_geo_id, centro_costo_func_id, sociedad_consumidora_id, sociedad_pagadora_id, es_intercompany')
  if (!data) return null
  const net = data.filter(r => r.sociedad_consumidora_id === NETSHARING_ID)
  return {
    total: data.length,
    revisar: data.filter(r => r.estado_control === 'revisar').length,
    importado: data.filter(r => r.estado_control === 'importado').length,
    ok: data.filter(r => r.estado_control === 'ok').length,
    sin_tipo: data.filter(r => !r.tipo_egreso).length,
    sin_sociedad: data.filter(r => !r.sociedad_consumidora_id).length,
    sin_subrubro: data.filter(r => !r.subrubro_id).length,
    intercompany: data.filter(r => r.es_intercompany).length,
    sin_centro_geo: net.filter(r => !r.centro_costo_geo_id).length,
    sin_centro_func: net.filter(r => !r.centro_costo_func_id).length,
  }
}

const sel = { width: '100%', padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.brd}`, background: C.bg, color: C.tx, fontSize: 13 }
const tg = (bg, col) => ({ padding: '3px 10px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: bg, color: col, display: 'inline-block' })

export default function Clasificacion() {
  const [egresos, setEgresos] = useState([])
  const [cat, setCat] = useState({ rubros: [], subrubros: [], centrosGeo: [], centrosFunc: [], sociedades: [] })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('importado')
  const [openId, setOpenId] = useState(null)
  const [ed, setEd] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [eg, catalogs, st] = await Promise.all([fetchEgresos(filtro), fetchCatalogos(), fetchStats()])
    setEgresos(eg.data); setCat(catalogs); if (st) setStats(st)
    setLoading(false)
  }, [filtro])

  useEffect(() => { load() }, [load])

  const toggleRow = (row) => {
    if (openId === row.id) { setOpenId(null); return }
    setOpenId(row.id)
    setEd({
      sociedad_pagadora_id: row.sociedad_pagadora_id || '',
      sociedad_consumidora_id: row.sociedad_consumidora_id || '',
      tipo_egreso: row.tipo_egreso || '',
      subrubro_id: row.subrubro?.id || '',
      centro_costo_geo_id: row.centro_costo_geo_id || '',
      centro_costo_func_id: row.centro_costo_func_id || '',
    })
  }

  const isNet = (id) => id === NETSHARING_ID

  const isRowComplete = (row, edits) => {
    const pag = edits?.sociedad_pagadora_id || row?.sociedad_pagadora_id
    const cons = edits?.sociedad_consumidora_id || row?.sociedad_consumidora_id
    const tipo = edits?.tipo_egreso || row?.tipo_egreso
    const sub = edits?.subrubro_id || row?.subrubro?.id
    if (!pag || !cons || !tipo || !sub) return false
    if (isNet(cons)) {
      const geo = edits?.centro_costo_geo_id || row?.centro_costo_geo_id
      const func = edits?.centro_costo_func_id || row?.centro_costo_func_id
      if (!geo || !func) return false
    }
    return true
  }

  const saveEdit = async (id) => {
    setSaving(true)
    const changes = {}
    if (ed.sociedad_pagadora_id) changes.sociedad_pagadora_id = ed.sociedad_pagadora_id
    if (ed.sociedad_consumidora_id) changes.sociedad_consumidora_id = ed.sociedad_consumidora_id
    if (ed.tipo_egreso) changes.tipo_egreso = ed.tipo_egreso
    if (ed.subrubro_id) changes.subrubro_id = ed.subrubro_id

    const cons = ed.sociedad_consumidora_id || egresos.find(e => e.id === id)?.sociedad_consumidora_id
    if (isNet(cons)) {
      if (ed.centro_costo_geo_id) changes.centro_costo_geo_id = ed.centro_costo_geo_id
      if (ed.centro_costo_func_id) changes.centro_costo_func_id = ed.centro_costo_func_id
    } else {
      changes.centro_costo_geo_id = null
      changes.centro_costo_func_id = null
    }

    if (ed.sociedad_pagadora_id && ed.sociedad_consumidora_id) {
      changes.es_intercompany = ed.sociedad_pagadora_id !== ed.sociedad_consumidora_id
    }

    const row = egresos.find(e => e.id === id)
    if (isRowComplete(row, { ...ed, ...changes })) {
      changes.estado_control = 'ok'
    }
    changes.updated_at = new Date().toISOString()

    const { error } = await supabase.from('egresos').update(changes).eq('id', id)
    if (error) { setMsg({ t: 'e', m: `Error: ${error.message}` }) }
    else { setMsg({ t: 'ok', m: changes.estado_control === 'ok' ? '✅ Línea clasificada completa' : '💾 Guardado parcial — faltan campos' }); setOpenId(null); await load() }
    setSaving(false)
    setTimeout(() => setMsg(null), 4000)
  }

  if (loading) return <LoadingState />
  const totalClasificable = stats ? stats.total - stats.intercompany : 0
  const pctOk = totalClasificable > 0 ? Math.round(stats.ok / totalClasificable * 100) : 0

  const filtros = [
    { id: 'importado', n: stats?.importado, c: C.amb, l: 'Importados' },
    { id: 'sin_tipo', n: stats?.sin_tipo, c: C.red, l: 'Sin OPEX/CAPEX' },
    { id: 'sin_sociedad', n: stats?.sin_sociedad, c: C.red, l: 'Sin sociedad' },
    { id: 'sin_subrubro', n: stats?.sin_subrubro, c: C.org || C.red, l: 'Sin subrubro' },
    { id: 'sin_centro_geo', n: stats?.sin_centro_geo, c: C.pur, l: 'NET sin centro geo' },
    { id: 'sin_centro_func', n: stats?.sin_centro_func, c: C.pur, l: 'NET sin centro func' },
    { id: 'intercompany', n: stats?.intercompany, c: C.cyn, l: 'Intercompany' },
    { id: 'ok', n: stats?.ok, c: C.grn, l: 'Completos' },
    { id: 'todos', n: stats?.total, c: C.tx2, l: 'Todos' },
  ]

  const getFaltan = (row) => {
    const f = []
    if (!row.sociedad_pagadora_id) f.push('Pagadora')
    if (!row.sociedad_consumidora_id) f.push('Consumidora')
    if (!row.tipo_egreso) f.push('Tipo')
    if (!row.subrubro) f.push('Subrubro')
    if (row.sociedad_consumidora_id === NETSHARING_ID) {
      if (!row.centro_costo_geo_id) f.push('C.Geo')
      if (!row.centro_costo_func_id) f.push('C.Func')
    }
    return f
  }

  // Subrubros filtrados por rubro del registro
  const getSubrubrosForRow = (row) => {
    if (row.rubro?.id) {
      const filtered = cat.subrubros.filter(s => s.rubro_id === row.rubro.id)
      if (filtered.length > 0) return filtered
    }
    return cat.subrubros
  }

  // Tipo egreso sugerido por el rubro
  const getTipoSugerido = (row) => {
    if (row.rubro?.tipo_egreso_default && row.rubro.tipo_egreso_default !== 'INTERCOMPANY') {
      return row.rubro.tipo_egreso_default
    }
    return null
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: C.tx2, marginBottom: 8 }}>Clasificación de egresos — {stats?.total || 0} registros ({stats?.intercompany || 0} intercompany)</div>
        <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: C.sf }}>
          <div style={{ width: `${pctOk}%`, background: C.grn, transition: 'width .5s', borderRadius: 7 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
          <span style={{ color: C.grn, fontWeight: 700 }}>{pctOk}% clasificado ({stats?.ok || 0} de {totalClasificable})</span>
          <span style={{ color: C.amb, fontWeight: 700 }}>{(stats?.importado || 0) + (stats?.revisar || 0)} pendientes</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard title="Total" value={fmtNum(stats?.total || 0)} icon="📋" />
        <KpiCard title="Completos" value={fmtNum(stats?.ok || 0)} icon="✅" sub={`${pctOk}%`} />
        <KpiCard title="Importados" value={fmtNum(stats?.importado || 0)} icon="📥" />
        <KpiCard title="Sin tipo" value={fmtNum(stats?.sin_tipo || 0)} icon="🔴" />
        <KpiCard title="Sin sociedad" value={fmtNum(stats?.sin_sociedad || 0)} icon="🏢" />
        <KpiCard title="Intercompany" value={fmtNum(stats?.intercompany || 0)} icon="🔄" />
      </div>

      {msg && <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600, background: msg.t === 'ok' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)', color: msg.t === 'ok' ? C.grn : C.red }}>{msg.m}</div>}

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {filtros.map(f => (
          <button key={f.id} onClick={() => { setFiltro(f.id); setOpenId(null) }} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600,
            background: filtro === f.id ? f.c : C.sf, color: filtro === f.id ? '#fff' : C.tx2,
          }}>{f.l} ({f.n || 0})</button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {egresos.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: C.tx2, background: C.sf, borderRadius: 12 }}>✅ Sin registros en este filtro</div>
        ) : egresos.map((row) => {
          const isOpen = openId === row.id
          const faltan = getFaltan(row)
          const showCentros = isOpen && isNet(ed.sociedad_consumidora_id)
          const tipoSugerido = getTipoSugerido(row)

          return (
            <div key={row.id} style={{ background: C.sf, borderRadius: 12, border: `1px solid ${isOpen ? C.pri : C.brd}`, overflow: 'hidden' }}>
              <div onClick={() => toggleRow(row)} style={{
                display: 'grid', gridTemplateColumns: '80px 1fr 110px 180px 1fr 40px',
                padding: '12px 16px', cursor: 'pointer', alignItems: 'center',
                background: isOpen ? 'rgba(147,51,234,.06)' : 'transparent',
              }}>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: C.tx2 }}>{row.periodo}</div>
                <div>
                  <div style={{ fontWeight: 600, color: C.tx, fontSize: 13 }}>{row.detalle || '—'}</div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: C.tx }}>{fmt(row.importe_total)}</div>
                <div style={{ paddingLeft: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {row.rubro ? <span style={tg('rgba(147,51,234,.15)', C.pri)}>{row.rubro.nombre}</span> : null}
                  {row.es_intercompany && <span style={tg('rgba(6,182,212,.15)', C.cyn)}>INTER</span>}
                </div>
                <div style={{ paddingLeft: 12, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {faltan.length === 0 ? (
                    <span style={tg('rgba(16,185,129,.15)', C.grn)}>✅ Completo</span>
                  ) : faltan.map(f => (
                    <span key={f} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(239,68,68,.1)', color: C.red }}>{f}</span>
                  ))}
                </div>
                <div style={{ textAlign: 'right', fontSize: 16, color: C.tx2 }}>{isOpen ? '▲' : '▼'}</div>
              </div>

              {isOpen && (
                <div style={{ padding: '16px 20px', borderTop: `1px solid ${C.brd}`, background: 'rgba(147,51,234,.03)' }}>
                  {ed.sociedad_pagadora_id && ed.sociedad_consumidora_id && ed.sociedad_pagadora_id !== ed.sociedad_consumidora_id && (
                    <div style={{ ...tg('rgba(245,158,11,.15)', C.amb), marginBottom: 12 }}>⚠️ INTERCOMPANY — pagadora ≠ consumidora</div>
                  )}

                  {!isNet(ed.sociedad_consumidora_id) && ed.sociedad_consumidora_id && (
                    <div style={{ ...tg('rgba(6,182,212,.15)', C.cyn), marginBottom: 12 }}>ℹ️ Sociedad no ISP — sin centros de costo</div>
                  )}

                  {tipoSugerido && !ed.tipo_egreso && (
                    <div style={{ ...tg('rgba(147,51,234,.15)', C.pri), marginBottom: 12, cursor: 'pointer' }}
                      onClick={() => setEd({ ...ed, tipo_egreso: tipoSugerido === 'Mixto' ? 'OPEX' : (tipoSugerido === 'CAPEX Obra' ? 'CAPEX' : tipoSugerido) })}>
                      💡 Sugerido por rubro: {tipoSugerido} — clic para aplicar
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: C.tx2, fontWeight: 700, display: 'block', marginBottom: 6 }}>SOCIEDAD PAGADORA *</label>
                      <select value={ed.sociedad_pagadora_id} onChange={e => setEd({ ...ed, sociedad_pagadora_id: e.target.value })} style={sel}>
                        <option value="">— Elegir sociedad —</option>
                        {cat.sociedades.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: C.tx2, fontWeight: 700, display: 'block', marginBottom: 6 }}>SOCIEDAD CONSUMIDORA *</label>
                      <select value={ed.sociedad_consumidora_id} onChange={e => setEd({ ...ed, sociedad_consumidora_id: e.target.value })} style={sel}>
                        <option value="">— Elegir sociedad —</option>
                        {cat.sociedades.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: C.tx2, fontWeight: 700, display: 'block', marginBottom: 6 }}>TIPO DE EGRESO *</label>
                      <select value={ed.tipo_egreso} onChange={e => setEd({ ...ed, tipo_egreso: e.target.value })} style={sel}>
                        <option value="">— Elegir tipo —</option>
                        <option value="OPEX">OPEX — Gasto operativo</option>
                        <option value="CAPEX">CAPEX — Inversión</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: showCentros ? '1fr 1fr 1fr' : '1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ fontSize: 11, color: C.tx2, fontWeight: 700, display: 'block', marginBottom: 6 }}>SUBRUBRO * (filtrado por {row.rubro?.nombre || 'rubro'})</label>
                      <select value={ed.subrubro_id} onChange={e => setEd({ ...ed, subrubro_id: e.target.value })} style={sel}>
                        <option value="">— Elegir subrubro —</option>
                        {getSubrubrosForRow(row).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>

                    {showCentros && (
                      <>
                        <div>
                          <label style={{ fontSize: 11, color: C.tx2, fontWeight: 700, display: 'block', marginBottom: 6 }}>CENTRO GEOGRÁFICO *</label>
                          <select value={ed.centro_costo_geo_id} onChange={e => setEd({ ...ed, centro_costo_geo_id: e.target.value })} style={sel}>
                            <option value="">— Elegir ubicación —</option>
                            {cat.centrosGeo.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: C.tx2, fontWeight: 700, display: 'block', marginBottom: 6 }}>CENTRO FUNCIONAL *</label>
                          <select value={ed.centro_costo_func_id} onChange={e => setEd({ ...ed, centro_costo_func_id: e.target.value })} style={sel}>
                            <option value="">— Elegir función —</option>
                            {cat.centrosFunc.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button onClick={() => setOpenId(null)} style={{
                      padding: '10px 24px', borderRadius: 8, border: `1px solid ${C.brd}`,
                      background: 'transparent', color: C.tx2, fontSize: 13, cursor: 'pointer',
                    }}>Cancelar</button>
                    <button onClick={() => saveEdit(row.id)} disabled={saving} style={{
                      padding: '10px 32px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: C.grn, color: '#fff', fontSize: 14, fontWeight: 700,
                    }}>{saving ? 'Guardando...' : '💾 Guardar clasificación'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: C.tx2, textAlign: 'center' }}>
        Mostrando {egresos.length} de {stats?.total || 0} registros
      </div>
    </div>
  )
}
