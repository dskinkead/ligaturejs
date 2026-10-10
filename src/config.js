import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const defaults = Object.freeze({
  server: 'src/server.js',
  buildDir: '.ligature/build',
  port: 3000,
  host: '127.0.0.1',
  watch: true,
  https: false,
  proxy: Object.freeze({ trust: false, basePath: '' }),
  environment: Object.freeze({})
})

export function validateConfig(value = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Ligature config must export an object')
  const config = { ...defaults, ...value }
  if (typeof config.server !== 'string' || !config.server) throw new TypeError('config.server must be a non-empty string')
  if (typeof config.buildDir !== 'string' || !config.buildDir) throw new TypeError('config.buildDir must be a non-empty string')
  if (!Number.isInteger(config.port) || config.port < 0 || config.port > 65535) throw new TypeError('config.port must be an integer from 0 to 65535')
  if (typeof config.host !== 'string' || !config.host) throw new TypeError('config.host must be a non-empty string')
  if (typeof config.watch !== 'boolean') throw new TypeError('config.watch must be boolean')
  if (config.https !== false) {
    if (!config.https || typeof config.https !== 'object' || Array.isArray(config.https)) throw new TypeError('config.https must be false or an object')
    for (const key of ['key', 'cert']) if (typeof config.https[key] !== 'string' || !config.https[key]) throw new TypeError(`config.https.${key} must be a non-empty path`)
    if (config.https.ca !== undefined && typeof config.https.ca !== 'string') throw new TypeError('config.https.ca must be a path string')
  }
  if (!config.proxy || typeof config.proxy !== 'object' || Array.isArray(config.proxy)) throw new TypeError('config.proxy must be an object')
  if (typeof config.proxy.trust !== 'boolean' && typeof config.proxy.trust !== 'string') throw new TypeError('config.proxy.trust must be boolean or a proxy name')
  if (typeof config.proxy.basePath !== 'string' || (config.proxy.basePath && (!config.proxy.basePath.startsWith('/') || config.proxy.basePath.endsWith('/')))) throw new TypeError('config.proxy.basePath must be empty or a slash-prefixed path without a trailing slash')
  if (!config.environment || typeof config.environment !== 'object' || Array.isArray(config.environment)) throw new TypeError('config.environment must be an object')
  for (const [key, value] of Object.entries(config.environment)) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) throw new TypeError(`config.environment key is invalid: ${key}`)
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') throw new TypeError(`config.environment.${key} must be a scalar`)
  }
  return Object.freeze(config)
}

export async function loadConfig(dir = process.cwd(), overrides = {}) {
  const candidates = ['ligature.config.js', 'ligature.config.mjs', 'ligature.config.json']
  const file = candidates.map(name => path.join(dir, name)).find(candidate => fs.existsSync(candidate))
  let value = {}
  if (file?.endsWith('.json')) value = JSON.parse(fs.readFileSync(file, 'utf8'))
  else if (file) { const imported = await import(`${pathToFileURL(file).href}?v=${fs.statSync(file).mtimeMs}`); value = imported.default ?? imported.config ?? {} }
  const envOverrides = {}
  if (process.env.PORT) envOverrides.port = Number(process.env.PORT)
  if (process.env.HOST) envOverrides.host = process.env.HOST
  if (process.env.LIGATURE_BASE_PATH) envOverrides.proxy = { ...(value.proxy ?? {}), basePath: process.env.LIGATURE_BASE_PATH }
  return { ...validateConfig({ ...value, ...envOverrides, ...overrides }), file: file ?? null }
}

export { defaults as defaultConfig }
