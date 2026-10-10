import crypto from 'node:crypto'
import path from 'node:path'

const DEFAULT_CSP = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"

/** Set conservative browser security headers. Override CSP only deliberately. */
export function securityHeaders(options = {}) {
  const csp = options.contentSecurityPolicy ?? DEFAULT_CSP
  if (typeof csp !== 'string' || /[\r\n]/.test(csp)) throw new TypeError('contentSecurityPolicy must be a header-safe string')
  const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': options.referrerPolicy ?? 'strict-origin-when-cross-origin', 'X-Frame-Options': options.frameOptions ?? 'DENY', 'Content-Security-Policy': csp }
  if (options.hsts !== false) headers['Strict-Transport-Security'] = `max-age=${options.hstsMaxAge ?? 31536000}; includeSubDomains`
  return (req, res, next) => { for (const [name, value] of Object.entries(headers)) res.set?.(name, value); next() }
}

/** Small reference authorization boundary; applications supply their identity and policy. */
export function createAuthorization(options = {}) {
  if (typeof options.authenticate !== 'function' || typeof options.authorize !== 'function') throw new TypeError('authenticate and authorize functions are required')
  return Object.freeze({
    authenticate: options.authenticate,
    authorize: options.authorize,
    middleware: async (req, res, next) => {
      const user = await options.authenticate(req)
      if (!user) return res.status(401).json?.({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } })
      req.user = user
      if (!(await options.authorize({ user, req }))) return res.status(403).json?.({ error: { code: 'FORBIDDEN', message: 'Forbidden' } })
      return next()
    }
  })
}

export function validateUpload(file, options = {}) {
  if (!file || typeof file !== 'object') throw new TypeError('Upload must be an object')
  const maxBytes = options.maxBytes ?? 10 * 1024 * 1024
  if (!Number.isInteger(maxBytes) || maxBytes <= 0) throw new RangeError('maxBytes must be a positive integer')
  const name = String(file.originalname ?? file.name ?? '')
  const type = String(file.mimetype ?? file.type ?? '').toLowerCase()
  const size = Number(file.size)
  if (!name || name !== path.basename(name) || /[\x00-\x1f\x7f]/.test(name)) throw new TypeError('Upload filename is unsafe')
  if (!Number.isSafeInteger(size) || size < 0 || size > maxBytes) throw new RangeError('Upload exceeds the size limit')
  if (options.mimeTypes && (!Array.isArray(options.mimeTypes) || !options.mimeTypes.includes(type))) throw new TypeError('Upload MIME type is not allowed')
  const extension = path.extname(name).toLowerCase()
  if (options.extensions && (!Array.isArray(options.extensions) || !options.extensions.includes(extension))) throw new TypeError('Upload extension is not allowed')
  return Object.freeze({ name, type, size, extension })
}

export function isolatedUploadPath(root, fileName) {
  if (typeof root !== 'string' || !root || typeof fileName !== 'string' || !fileName) throw new TypeError('Upload root and filename are required')
  const safeName = path.basename(fileName)
  const target = path.resolve(root, `${crypto.randomBytes(16).toString('hex')}-${safeName}`)
  if (!target.startsWith(`${path.resolve(root)}${path.sep}`)) throw new TypeError('Upload path escaped storage root')
  return target
}

export function createRateLimiter(options = {}) {
  const windowMs = options.windowMs ?? 60_000
  const max = options.max ?? 60
  if (!Number.isInteger(windowMs) || windowMs <= 0 || !Number.isInteger(max) || max <= 0) throw new RangeError('Rate limiter windowMs and max must be positive integers')
  const buckets = new Map()
  const key = options.key ?? (req => req.ip ?? req.socket?.remoteAddress ?? 'anonymous')
  return (req, res, next) => {
    const now = Date.now(); const id = String(key(req)); const current = buckets.get(id)
    const bucket = !current || now >= current.resetAt ? { count: 0, resetAt: now + windowMs } : current
    bucket.count++; buckets.set(id, bucket)
    res.set?.('RateLimit-Limit', String(max)); res.set?.('RateLimit-Remaining', String(Math.max(0, max - bucket.count)))
    if (bucket.count > max) { res.set?.('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000))); return res.status(429).json?.({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }) }
    return next()
  }
}
