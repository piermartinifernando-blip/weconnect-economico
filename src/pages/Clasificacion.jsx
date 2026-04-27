import { useState, useEffect, useCallback } from 'react'
import { KpiCard, LoadingState, ErrorState } from '../components/UI'
import { COLORS as C } from '../lib/constants'
import { fmt, fmtNum } from '../lib/formatters'
import { supabase } from '../lib/supabase'

// ═══ DATA FETCHERS ═══
async function fetchEgresos(filtro) {
  let q = supabase.from('egresos').select(`
    id, fecha_documento, periodo, detalle, importe_total, tipo_egreso, medio_pago,
    estado_pago, estado_control, observaciones, origen, es_intercompany,
    sociedad_pagadora_id, sociedad_consumidora_id,
    centro_costo_geo_id, centro_costo_func_id,
    rubro:cat_rubros(id, nombre),
    subrubro:cat_subrubros(id, nombre),
    proveedor:proveedores(id, nombre),
    sociedad_pagadora:sociedades!egresos_sociedad_pagadora_id_fkey(id, nombre),
    sociedad_consumidora:sociedades!egresos_sociedad_consumidora_id_fkey(id, nombre)
  `).order('importe_total', { ascending: false })
  
  if (filtro === 'revisar') q = q.eq('estado_control', 'revisar')
  if (filtro === 'ok') q = q.eq('estado_control', 'ok')
  if (filtro === 'sin_tipo') q = q.is('tipo_egreso', null)
  if (filtro === 'sin_sociedad') q = q.is('sociedad_consumidora_id', null)
  if (filtro === 'sin_centro_geo') q = q.is('centro_costo_geo_id', null)
  if (filtro === 'sin_centro_func') q = q.is('centro_costo_func_id', null)
  
  const { data, error } = await q.limit(200)
  return { data: data || [], error }
}

async function fetchCatalogos() {
  const [rubros, subrubros, centros, sociedades] = await Promise.all([
    supabase.from('cat_rubros').select('id, nombre').order('nombre'),
    supabase.from('cat_subrubros').select('id, nombre, rubro_id').order('nombre'),
    supabase.from('cat_centros_costo').select('id, nombre, tipo').order('tipo, nombre'),
    supabase.from('sociedades').select('id, nombre').order('nombre'),
  ])
  return {
    rubros: rubros.data || [],
    subrubros: subrubros.data || [],
    centrosGeo: (centros.data || []).filter(c => c.tipo === 'geografico'),
    centrosFunc: (centros.data || []).filter(c => c.tipo === 'funcional'),
    sociedades: sociedades.data || [],
  }
}

async function fetchStats() {
  const { data } = await supabase.from('egresos').select('id, estado_control, tipo_egreso, subrubro_id, centro_costo_geo_id, centro_costo_func_id, sociedad_consumidora_id, sociedad_pagadora_id')
  if (!data) return null
  return {
    total: data.length,
    revisar: data.filter(r => r.estado_control === 'revisar').length,
    ok: data.filter(r => r.estado_control === 'ok').length,
    sin_tipo: data.filter(r => !r.tipo_egreso).length,
    sin_sociedad: data.filter(r => !r.sociedad_consumidora_id).length,
    sin_centro_geo: data.filter(r => !r.centro_costo_geo_id).length,
    sin_centro_func: data.filter(r => !r.centro_costo_func_id).length,
  }
}

async function updateEgreso(id, changes) {
  const { error } = await supabase.from('egresos').update({ ...changes, updated_at: new Date().toISOString() }).eq('id', id)
  return error
}

async function crearCentroFuncional(nombre) {
  const { data, error } = await supabase.from('cat_centros_costo').insert({ nombre, tipo: 'funcional' }).select().single()
  return { data, error }
}

// ═══ STYLES ═══
const selectStyle = {
  width: '100%', padding: '5px 6px', borderRadius: 6,
  border: `1px solid ${C.brd}`, background: C.bg, color: C.tx, fontSize: 11,
}
const btnStyle = (bg, color) => ({
  padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
  background: bg, color, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap',
})
const tagStyle = (bg, color) => ({
  padding: '3px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: bg, color, display: 'inline-block',
})

// ═══ COMPONENT ═══
export default function Clasificacion() {
  const [egresos, setEgresos] = useState([])
  const [cat, setCat] = useState({ rubros: [], subrubros: [], centrosGeo: [], centrosFunc: [], sociedades: [] })
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('revisar')
  const [editId, setEditId] = useState(null)
  const [ed, setEd] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState(null)
  const [nuevoFunc, setNuevoFunc] = useState('')
  const [showNuevoFunc, setShowNuevoFunc] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [eg, catalogs, st] = await Promise.all([fetchEgresos(filtro), fetchCatalogos(), fetchStats()])
    setEgresos(eg.data)
    setCat(catalogs)
    if (st) setStats(st)
    setLoading(false)
  }, [filtro])

  useEffect(() => { load() }, [load])

  const startEdit = (row) => {
    setEditId(row.id)
    setEd({
      sociedad_pagadora_id: row.sociedad_pagadora_id || '',
      sociedad_consumidora_id: row.sociedad_consumidora_id || '',
      tipo_egreso: row.tipo_egreso || '',
      subrubro_id: row.subrubro?.id || '',
      centro_costo_geo_id: row.centro_costo_geo_id || '',
      centro_costo_func_id: row.centro_costo_func_id || '',
    })
    setShowNuevoFunc(false)
    setNuevoFunc('')
  }

  const cancelEdit = () => { setEditId(null); setEd({}); setShowNuevoFunc(false) }

  const saveEdit = async (id) => {
    setSaving(true)
    const changes = {}
    if (ed.sociedad_pagadora_id) changes.sociedad_pagadora_id = ed.sociedad_pagadora_id
    if (ed.sociedad_consumidora_id) changes.sociedad_consumidora_id = ed.sociedad_consumidora_id
    if (ed.tipo_egreso) changes.tipo_egreso = ed.tipo_egreso
    if (ed.subrubro_id) changes.subrubro_id = ed.subrubro_id
    if (ed.centro_costo_geo_id) changes.centro_costo_geo_id = ed.centro_costo_geo_id
    if (ed.centro_costo_func_id) changes.centro_costo_func_id = ed.centro_costo_func_id

    // Auto intercompany
    if (ed.sociedad_pagadora_id && ed.sociedad_consumidora_id) {
      changes.es_intercompany = ed.sociedad_pagadora_id !== ed.sociedad_consumidora_id
    }

    // Check completeness
    const row = egresos.find(e => e.id === id)
    const tienePagadora = changes.sociedad_pagadora_id || row?.sociedad_pagadora_id
    const tieneConsumidora = changes.sociedad_consumidora_id || row?.sociedad_consumidora_id
    const tieneTipo = changes.tipo_egreso || row?.tipo_egreso
    const tieneSubrubro = changes.subrubro_id || row?.subrubro?.id
    const tieneGeo = changes.centro_costo_geo_id || row?.centro_costo_geo_id
    const tieneFunc = changes.centro_costo_func_id || row?.centro_costo_func_id

    if (tienePagadora && tieneConsumidora && tieneTipo && tieneSubrubro && tieneGeo && tieneFunc) {
      changes.estado_control = 'ok'
    }

    const error = await updateEgreso(id, changes)
    if (error) {
      setMsg({ type: 'error', text: `Error: ${error.message}` })
    } else {
      setMsg({ type: 'ok', text: changes.estado_control === 'ok' ? '✅ Línea completa' : '💾 Guardado parcial' })
      await load()
    }
    setEditId(null); setEd({}); setSaving(false); setShowNuevoFunc(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const crearFunc = async () => {
    if (!nuevoFunc.trim()) return
    const { data, error } = await crearCentroFuncional(nuevoFunc.trim())
    if (data) {
      setCat(prev => ({ ...prev, centrosFunc: [...prev.centrosFunc, data].sort((a, b) => a.nombre.localeCompare(b.nombre)) }))
      setEd(prev => ({ ...prev, centro_costo_func_id: data.id }))
      setShowNuevoFunc(false)
      setNuevoFunc('')
      setMsg({ type: 'ok', text: `✅ Centro "${data.nombre}" creado` })
      setTimeout(() => setMsg(null), 3000)
    } else {
      setMsg({ type: 'error', text: `Error: ${error?.message}` })
    }
  }

  if (loading) return <LoadingState />

  const pctOk = stats ? Math.round(stats.ok / Math.max(stats.total, 1) * 100) : 0

  const filtros = [
    { id: 'revisar', label: `Por revisar (${stats?.revisar || 0})`, color: C.amb },
    { id: 'sin_tipo', label: `Sin OPEX/CAPEX (${stats?.sin_tipo || 0})`, color: C.red },
    { id: 'sin_sociedad', label: `Sin sociedad (${stats?.sin_sociedad || 0})`, color: C.red },
    { id: 'sin_centro_geo', label: `Sin centro geo (${stats?.sin_centro_geo || 0})`, color: C.pur },
    { id: 'sin_centro_func', label: `Sin centro func (${stats?.sin_centro_func || 0})`, color: C.pur },
    { id: 'ok', label: `Completos (${stats?.ok || 0})`, color: C.grn },
    { id: 'todos', label: `Todos (${stats?.total || 0})`, color: C.tx2 },
  ]

  return (
    <div>
      {/* BARRA DE PROGRESO */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 13, color: C.tx2, marginBottom: 8 }}>
          Clasificación de egresos — {stats?.total || 0} registros importados desde Matriz
        </div>
        <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: C.sf }}>
          <div style={{ width: `${pctOk}%`, background: C.grn, transition: 'width .5s', borderRadius: 7 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 4 }}>
          <span style={{ color: C.grn, fontWeight: 700 }}>{pctOk}% clasificado ({stats?.ok || 0} líneas)</span>
          <span style={{ color: C.amb, fontWeight: 700 }}>{stats?.revisar || 0} pendientes</span>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <KpiCard title="Total" value={fmtNum(stats?.total || 0)} icon="📋" />
        <KpiCard title="Completos" value={fmtNum(stats?.ok || 0)} icon="✅" sub={`${pctOk}%`} />
        <KpiCard title="Pendientes" value={fmtNum(stats?.revisar || 0)} icon="⚠️" />
        <KpiCard title="Sin tipo" value={fmtNum(stats?.sin_tipo || 0)} icon="🔴" />
        <KpiCard title="Sin sociedad" value={fmtNum(stats?.sin_sociedad || 0)} icon="🏢" />
      </div>

      {/* MENSAJE */}
      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 14, fontWeight: 600,
          background: msg.type === 'ok' ? 'rgba(16,185,129,.15)' : 'rgba(239,68,68,.15)',
          color: msg.type === 'ok' ? C.grn : C.red,
        }}>{msg.text}</div>
      )}

      {/* FILTROS */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {filtros.map(f => (
          <button key={f.id} onClick={() => setFiltro(f.id)} style={{
            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            background: filtro === f.id ? f.color : C.sf,
            color: filtro === f.id ? '#fff' : C.tx2,
          }}>{f.label}</button>
        ))}
      </div>

      {/* TABLA */}
      <div style={{ background: C.sf, borderRadius: 12, border: `1px solid ${C.brd}`, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: C.sf2, borderBottom: `1px solid ${C.brd}` }}>
              {['Período', 'Detalle / Proveedor', 'Monto', 'Rubro', 'Pagadora', 'Consumidora', 'Tipo', 'Subrubro', 'C. Geográfico', 'C. Funcional', 'Acción'].map(h => (
                <th key={h} style={{ padding: '10px 8px', textAlign: h === 'Monto' ? 'right' : 'left', fontSize: 10, fontWeight: 700, color: C.tx2, textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {egresos.length === 0 ? (
              <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: C.tx2 }}>
                {filtro === 'ok' ? '🎉 No hay registros completos todavía' : '✅ Sin registros pendientes en este filtro'}
              </td></tr>
            ) : egresos.map((row, i) => {
              const isEd = editId === row.id
              const faltan = []
              if (!row.sociedad_pagadora_id) faltan.push('pagadora')
              if (!row.sociedad_consumidora_id) faltan.push('consumidora')
              if (!row.tipo_egreso) faltan.push('tipo')
              if (!row.subrubro) faltan.push('subrubro')
              if (!row.centro_costo_geo_id) faltan.push('geo')
              if (!row.centro_costo_func_id) faltan.push('func')

              return (
                <tr key={row.id} style={{
                  borderBottom: `1px solid ${C.brd}`,
                  background: isEd ? 'rgba(147,51,234,.08)' : i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,.015)',
                }}>
                  {/* Período */}
                  <td style={{ padding: '8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: C.tx2, whiteSpace: 'nowrap' }}>{row.periodo}</td>

                  {/* Detalle + Proveedor */}
                  <td style={{ padding: '8px', maxWidth: 200 }}>
                    <div style={{ fontWeight: 500, color: C.tx, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{row.detalle || '—'}</div>
                    <div style={{ fontSize: 10, color: C.tx2, marginTop: 1 }}>{row.proveedor?.nombre || ''}</div>
                  </td>

                  {/* Monto */}
                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: C.tx, whiteSpace: 'nowrap' }}>{fmt(row.importe_total)}</td>

                  {/* Rubro */}
                  <td style={{ padding: '8px' }}>
                    {row.rubro ? <span style={tagStyle('rgba(147,51,234,.15)', C.pri)}>{row.rubro.nombre}</span> : <span style={{ color: C.red, fontSize: 10 }}>—</span>}
                  </td>

                  {/* Sociedad pagadora */}
                  <td style={{ padding: '8px', minWidth: 130 }}>
                    {isEd ? (
                      <select value={ed.sociedad_pagadora_id} onChange={e => setEd({ ...ed, sociedad_pagadora_id: e.target.value })} style={selectStyle}>
                        <option value="">— Elegir —</option>
                        {cat.sociedades.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    ) : row.sociedad_pagadora ? (
                      <span style={{ fontSize: 10, color: C.tx2 }}>{row.sociedad_pagadora.nombre}</span>
                    ) : <span style={{ color: C.red, fontSize: 10 }}>❌</span>}
                  </td>

                  {/* Sociedad consumidora */}
                  <td style={{ padding: '8px', minWidth: 130 }}>
                    {isEd ? (
                      <select value={ed.sociedad_consumidora_id} onChange={e => setEd({ ...ed, sociedad_consumidora_id: e.target.value })} style={selectStyle}>
                        <option value="">— Elegir —</option>
                        {cat.sociedades.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    ) : row.sociedad_consumidora ? (
                      <span style={{ fontSize: 10, color: C.tx2 }}>{row.sociedad_consumidora.nombre}</span>
                    ) : <span style={{ color: C.red, fontSize: 10 }}>❌</span>}
                  </td>

                  {/* Tipo OPEX/CAPEX */}
                  <td style={{ padding: '8px', minWidth: 90 }}>
                    {isEd ? (
                      <select value={ed.tipo_egreso} onChange={e => setEd({ ...ed, tipo_egreso: e.target.value })} style={selectStyle}>
                        <option value="">—</option>
                        <option value="OPEX">OPEX</option>
                        <option value="CAPEX">CAPEX</option>
                      </select>
                    ) : row.tipo_egreso ? (
                      <span style={tagStyle(row.tipo_egreso === 'OPEX' ? 'rgba(245,158,11,.15)' : 'rgba(239,68,68,.15)', row.tipo_egreso === 'OPEX' ? C.amb : C.red)}>{row.tipo_egreso}</span>
                    ) : <span style={{ color: C.red, fontSize: 10 }}>❌</span>}
                  </td>

                  {/* Subrubro */}
                  <td style={{ padding: '8px', minWidth: 120 }}>
                    {isEd ? (
                      <select value={ed.subrubro_id} onChange={e => setEd({ ...ed, subrubro_id: e.target.value })} style={selectStyle}>
                        <option value="">— Elegir —</option>
                        {cat.subrubros.filter(s => !row.rubro || s.rubro_id === row.rubro.id).length > 0
                          ? cat.subrubros.filter(s => s.rubro_id === row.rubro?.id).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                          : cat.subrubros.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                        }
                      </select>
                    ) : row.subrubro ? (
                      <span style={{ fontSize: 10, color: C.tx2 }}>{row.subrubro.nombre}</span>
                    ) : <span style={{ color: C.amb, fontSize: 10 }}>⚠️</span>}
                  </td>

                  {/* Centro geográfico */}
                  <td style={{ padding: '8px', minWidth: 120 }}>
                    {isEd ? (
                      <select value={ed.centro_costo_geo_id} onChange={e => setEd({ ...ed, centro_costo_geo_id: e.target.value })} style={selectStyle}>
                        <option value="">— Elegir —</option>
                        {cat.centrosGeo.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                      </select>
                    ) : row.centro_costo_geo_id ? (
                      <CentroLabel id={row.centro_costo_geo_id} centros={cat.centrosGeo} />
                    ) : <span style={{ color: C.amb, fontSize: 10 }}>⚠️</span>}
                  </td>

                  {/* Centro funcional */}
                  <td style={{ padding: '8px', minWidth: 140 }}>
                    {isEd ? (
                      <div>
                        {showNuevoFunc ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <input value={nuevoFunc} onChange={e => setNuevoFunc(e.target.value)} placeholder="Nombre..."
                              style={{ ...selectStyle, flex: 1 }} onKeyDown={e => e.key === 'Enter' && crearFunc()} />
                            <button onClick={crearFunc} style={btnStyle(C.grn, '#fff')}>✓</button>
                            <button onClick={() => setShowNuevoFunc(false)} style={btnStyle(C.red, '#fff')}>✕</button>
                          </div>
                        ) : (
                          <div>
                            <select value={ed.centro_costo_func_id} onChange={e => setEd({ ...ed, centro_costo_func_id: e.target.value })} style={selectStyle}>
                              <option value="">— Elegir —</option>
                              {cat.centrosFunc.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <button onClick={() => setShowNuevoFunc(true)} style={{ ...btnStyle('rgba(6,182,212,.15)', C.cyn), marginTop: 4, fontSize: 10, width: '100%' }}>+ Nuevo funcional</button>
                          </div>
                        )}
                      </div>
                    ) : row.centro_costo_func_id ? (
                      <CentroLabel id={row.centro_costo_func_id} centros={cat.centrosFunc} />
                    ) : <span style={{ color: C.amb, fontSize: 10 }}>⚠️</span>}
                  </td>

                  {/* Acción */}
                  <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                    {isEd ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => saveEdit(row.id)} disabled={saving} style={btnStyle(C.grn, '#fff')}>
                          {saving ? '...' : '💾'}
                        </button>
                        <button onClick={cancelEdit} style={btnStyle(C.red, '#fff')}>✕</button>
                      </div>
                    ) : faltan.length > 0 ? (
                      <button onClick={() => startEdit(row)} style={btnStyle('rgba(6,182,212,.15)', C.cyn)}>
                        Clasificar
                      </button>
                    ) : (
                      <span style={tagStyle('rgba(16,185,129,.15)', C.grn)}>✓ OK</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: C.tx2, textAlign: 'center' }}>
        Mostrando {egresos.length} de {stats?.total || 0} registros · Filtro: {filtros.find(f => f.id === filtro)?.label}
      </div>
    </div>
  )
}

// Helper component
function CentroLabel({ id, centros }) {
  const centro = centros.find(c => c.id === id)
  return centro ? <span style={{ fontSize: 10, color: C.tx2 }}>{centro.nombre}</span> : <span style={{ fontSize: 10, color: C.tx2 }}>—</span>
}
