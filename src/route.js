import { LigatureError } from './errors.js'
import { createHmac, timingSafeEqual } from 'node:crypto'

const METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'])

export function defineRoute(definition) {
  if (!definition?.method || !definition?.path || (typeof definition.handle !== 'function' && typeof definition.action !== 'function')) throw new TypeError('Route requires method, path, and handle or action')
  const method = String(definition.method).toUpperCase()
  if (!METHODS.has(method)) throw new TypeError(`Unsupported route method: ${method}`)
  const path = normalizePath(definition.path)
  const compiled = compilePath(path)
  const layouts = definition.layouts ?? (definition.layout ? [definition.layout] : [])
  if (!Array.isArray(layouts) || layouts.some(layout => typeof layout !== 'function')) throw new TypeError('Route layouts must be functions')
  for (const key of ['loader', 'action', 'authorize', 'errorBoundary']) if (definition[key] !== undefined && typeof definition[key] !== 'function') throw new TypeError(`Route ${key} must be a function`)
  return Object.freeze({ method, path, auth: definition.auth ?? false, input: definition.input ?? {}, output: definition.output ?? {}, handle: definition.handle, loader: definition.loader, action: definition.action, authorize: definition.authorize, errorBoundary: definition.errorBoundary, layouts: Object.freeze([...layouts]), middleware: Object.freeze([...(definition.middleware ?? [])]), match: value => matchCompiled(compiled, value) })
}

export function routeManifest(routes) { return routes.map(({ method, path, auth, input, output }) => ({ method, path, auth, input, output })) }
export function matchRoute(route, pathname) { return route.match(pathname) }

export function redirect(location, status = 303) {
  if (typeof location !== 'string' || !location || /[\r\n]/.test(location)) throw new TypeError('Redirect location must be a non-empty header-safe string')
  if (![301, 302, 303, 307, 308].includes(status)) throw new RangeError('Unsupported redirect status')
  return Object.freeze({ status, headers: Object.freeze({ Location: location }), body: '' })
}

/** Create a short-lived, tamper-evident token for an application-relative path. */
export function signReturnTo(location, secret, options = {}) {
  const destination = validateReturnLocation(location)
  const key = signingKey(secret)
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const ttl = Number.isFinite(options.ttlSeconds) ? options.ttlSeconds : 300
  if (ttl <= 0 || ttl > 7 * 24 * 60 * 60) throw new RangeError('Return-to TTL must be between 1 second and 7 days')
  const payload = encode({ destination, expiresAt: Math.floor(now / 1000) + Math.floor(ttl) })
  return `${payload}.${signature(payload, key)}`
}

/** Return the signed relative location, or null for an invalid/expired token. */
export function verifyReturnTo(token, secret, options = {}) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) return null
  try {
    const [encoded, supplied] = token.split('.')
    const expected = signature(encoded, signingKey(secret))
    if (supplied.length !== expected.length || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    const now = Number.isFinite(options.now) ? options.now : Date.now()
    if (!Number.isInteger(payload.expiresAt) || payload.expiresAt <= Math.floor(now / 1000)) return null
    return validateReturnLocation(payload.destination)
  } catch {
    return null
  }
}

/** Redirect to an explicit continuation endpoint carrying a signed return-to token. */
export function signedRedirect(location, secret, options = {}) {
  const endpoint = validateReturnLocation(options.endpoint ?? '/continue')
  const token = signReturnTo(location, secret, options)
  const separator = endpoint.includes('?') ? '&' : '?'
  return redirect(`${endpoint}${separator}${encodeURIComponent(options.parameter ?? 'returnTo')}=${encodeURIComponent(token)}`, options.status ?? 303)
}

export const signRedirect = signReturnTo
export const verifyRedirect = verifyReturnTo

export function createRouter(routes, options = {}) {
  const declared = routes.map(route => route?.method ? route : defineRoute(route))
  return async (req, res, next) => {
    const pathname = req.path ?? req.url?.split('?')[0] ?? '/'
    const method = String(req.method ?? 'GET').toUpperCase()
    if (!req.query) req.query = parseQuery(req.url)
    const matches = declared.filter(route => route.match(pathname))
    const route = matches.find(candidate => candidate.method === method) ?? (method === 'HEAD' ? matches.find(candidate => candidate.method === 'GET') : undefined)
    if (!route) {
      if (matches.length) { res.set?.('Allow', [...new Set(matches.map(item => item.method))].join(', ')); return res.status(405).json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } }) }
      if (typeof options.notFound === 'function') return options.notFound(req, res, next)
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } })
    }
    req.params = route.match(pathname)
    return next(route)
  }
}

export function routeNotFound(message = 'Route not found') { return new LigatureError('NOT_FOUND', message) }
export function methodNotAllowed(message = 'Method not allowed') { return new LigatureError('METHOD_NOT_ALLOWED', message) }

function normalizePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/')) throw new TypeError('Route path must start with /')
  return path.length > 1 ? path.replace(/\/+$/, '') : path
}
function compilePath(path) {
  const names = []
  const source = path.split('/').map(segment => {
    if (segment.startsWith(':')) { names.push(segment.slice(1)); return '([^/]+)' }
    if (segment === '*') { names.push('wildcard'); return '(.*)' }
    return escapeRegExp(segment)
  }).join('/')
  return { names, regex: new RegExp(`^${source}/?$`) }
}
function matchCompiled(compiled, pathname) {
  const value = String(pathname ?? '').split('?')[0].replace(/\/+$/, '') || '/'
  const found = compiled.regex.exec(value)
  if (!found) return null
  return Object.fromEntries(compiled.names.map((name, index) => [name, decodeURIComponent(found[index + 1])]))
}
function parseQuery(url) {
  const query = {}
  for (const [key, value] of new URL(`http://ligature.invalid${url ?? '/'}`).searchParams) {
    if (query[key] === undefined) query[key] = value
    else query[key] = Array.isArray(query[key]) ? [...query[key], value] : [query[key], value]
  }
  return query
}
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
function signingKey(secret) {
  if (typeof secret !== 'string' && !Buffer.isBuffer(secret) && !(secret instanceof Uint8Array)) throw new TypeError('Signing secret must be a non-empty string or byte array')
  if (secret.length === 0) throw new TypeError('Signing secret must be a non-empty string or byte array')
  return secret
}
function encode(value) { return Buffer.from(JSON.stringify(value)).toString('base64url') }
function signature(value, secret) { return createHmac('sha256', secret).update(value).digest('base64url') }
function validateReturnLocation(location) {
  if (typeof location !== 'string' || !location || /[\r\n\u0000-\u001f\u007f]/.test(location)) throw new TypeError('Return location must be a non-empty header-safe string')
  if (!location.startsWith('/') || location.startsWith('//')) throw new TypeError('Return location must be an application-relative path')
  return location
}
