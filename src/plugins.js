const contractVersion = 'ligaturejs.plugin.v1'

export const pluginContract = Object.freeze({
  schema: contractVersion,
  version: 1,
  lifecycle: Object.freeze(['install', 'uninstall']),
  compatibility: 'Plugins must declare a stable name and may only use the public API passed to install.'
})

export function definePlugin(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new TypeError('definePlugin(definition) requires an object')
  if (!/^[a-z][a-z0-9-]*$/.test(definition.name || '')) throw new TypeError('Plugin name must be kebab-case')
  if (definition.version !== undefined && typeof definition.version !== 'string') throw new TypeError('Plugin version must be a string')
  if (typeof definition.install !== 'function') throw new TypeError(`${definition.name} requires install(api)`)
  if (definition.uninstall !== undefined && typeof definition.uninstall !== 'function') throw new TypeError(`${definition.name} uninstall must be a function`)
  return Object.freeze({ schema: contractVersion, name: definition.name, version: definition.version ?? '1.0.0', install: definition.install, uninstall: definition.uninstall })
}

export function createPluginRegistry({ api = Object.freeze({}), plugins = [] } = {}) {
  const entries = new Map()
  let registry
  for (const plugin of plugins) register(plugin)
  function register(plugin) {
    if (!plugin || plugin.schema !== contractVersion) throw new TypeError('Only ligaturejs.plugin.v1 plugins can be registered')
    if (entries.has(plugin.name)) throw new Error(`Duplicate plugin: ${plugin.name}`)
    plugin.install(api)
    entries.set(plugin.name, plugin)
    return registry
  }
  async function close() {
    for (const plugin of [...entries.values()].reverse()) if (plugin.uninstall) await plugin.uninstall(api)
    entries.clear()
  }
  registry = Object.freeze({ register, close, get: name => entries.get(name), list: () => Object.freeze([...entries.values()].map(({ name, version }) => Object.freeze({ name, version }))) })
  return registry
}
