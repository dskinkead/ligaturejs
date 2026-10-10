export function createApplicationManifest({ name, version, routes = [], repositories = [], components = [], capabilities = [] }) {
  if (!name || !version) throw new Error('Application manifest requires name and version')
  return { schema: 'ligaturejs.application.v1', name, version, capabilities: [...capabilities].sort(), routes: [...routes].sort((a, b) => `${a.method}:${a.path}`.localeCompare(`${b.method}:${b.path}`)), repositories: [...repositories].sort(), components: [...components].sort() }
}
