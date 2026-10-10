export function defineRepository(definition) {
  if (!definition?.name) throw new Error('Repository requires a name')
  if (typeof definition.name !== 'string' || !definition.name.trim()) throw new Error('Repository requires a non-empty name')
  if (definition.methods !== undefined && (!definition.methods || typeof definition.methods !== 'object' || Array.isArray(definition.methods))) throw new Error('Repository methods must be an object')
  const methods = Object.fromEntries(Object.entries(definition.methods ?? {}).map(([name, fn]) => { if (!/^[$A-Z_a-z][$\w]*$/.test(name)) throw new Error(`Repository method '${name}' has an invalid name`); if (typeof fn !== 'function') throw new Error(`Repository method '${name}' must be a function`); return [name, fn] }))
  return Object.freeze({ name: definition.name.trim(), methods: Object.freeze(methods) })
}
