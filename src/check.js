export function checkApplication({ manifest, components = [], routes = [], migrations = [] }) {
  const errors = []
  if (!manifest?.schema || manifest.schema !== 'ligaturejs.application.v1') errors.push('Invalid application manifest schema')
  const names = new Set()
  for (const component of components) { if (names.has(component.name)) errors.push(`Duplicate component: ${component.name}`); names.add(component.name); if (!component.render) errors.push(`Missing render: ${component.name}`) }
  const ids = new Set()
  for (const migration of migrations) { if (ids.has(migration.id)) errors.push(`Duplicate migration: ${migration.id}`); ids.add(migration.id) }
  for (const route of routes) if (!route.method || !route.path) errors.push('Route missing method or path')
  return { ok: errors.length === 0, errors }
}
