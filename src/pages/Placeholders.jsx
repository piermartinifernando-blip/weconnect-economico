import { COLORS as C } from '../lib/constants'

function Placeholder({ title, description, items }) {
  return (
    <div style={{ padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 14, color: C.tx2, marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>{description}</div>
      {items && (
        <div style={{ textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
          {items.map((item, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: `1px solid ${C.brd}`, fontSize: 13, color: C.tx2 }}>
              → {item}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function CargaManual() {
  return <Placeholder
    title="Carga manual de egresos"
    description="Formulario para cargar egresos que no vienen de Xubio: sueldos en negro, fondos fijos, pagos a tercerizados."
    items={['Formulario con desplegables dinámicos', 'Rubros y subrubros desde catálogos', 'Proveedor con autocompletado', 'Validación antes de guardar']}
  />
}

export function Catalogos() {
  return <Placeholder
    title="Administración de catálogos"
    description="ABM de rubros, subrubros, centros de costo, proveedores y sociedades."
    items={['Agregar / desactivar rubros y subrubros', 'Gestionar proveedores y aliases', 'Centros de costo geográficos y funcionales', 'Sociedades del grupo']}
  />
}

export function Auditoria() {
  return <Placeholder
    title="Auditoría e importaciones"
    description="Log de importaciones, calidad de datos, score de completitud."
    items={['Historial de imports (Xubio, manual, Matriz)', 'Registros sin descripción / sin rubro / sin centro', 'Duplicados detectados', 'Score de calidad por origen']}
  />
}
