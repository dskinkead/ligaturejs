import { LigatureError } from './errors.js'
import { validateInput } from './validate.js'

export function createRouteHandler(route, context = {}) {
  return async (req, res, next) => {
    try {
      const user = context.authenticate ? await context.authenticate(req) : undefined
      if (route.auth && !user) throw new LigatureError('UNAUTHORIZED', 'Authentication required')
      const authorized = route.authorize ? await route.authorize({ req, user }) : true
      if (authorized === false) throw new LigatureError('FORBIDDEN', 'Authorization required')
      const input = route.input ? validateInput(route.input, { ...(req.body ?? {}), ...(req.query ?? {}), ...(req.params ?? {}) }) : {}
      const details = { req, user, input, params: req.params ?? {}, query: req.query ?? {}, repositories: context.repositories ?? {} }
      details.data = route.loader ? await route.loader(details) : undefined
      let run = route.action && !['GET', 'HEAD'].includes(String(req.method ?? route.method).toUpperCase()) ? route.action : route.handle
      if (typeof run !== 'function') throw new LigatureError('METHOD_NOT_ALLOWED', 'Route has no handler for this method')
      for (const middleware of [...(route.middleware ?? [])].reverse()) {
        if (typeof middleware !== 'function') throw new TypeError('Route middleware must be a function')
        const nextRun = run
        run = details => middleware(details, nextRun)
      }
      let result = await run(details)
      for (const layout of [...(route.layouts ?? [])].reverse()) result = await layout({ ...details, result, next: () => result })
      if (!res.headersSent) sendRouteResult(res, result, req)
    } catch (error) {
      if (route.errorBoundary) {
        const fallback = await route.errorBoundary({ error, req, res })
        if (fallback !== undefined && !res.headersSent) return sendRouteResult(res, fallback, req)
      }
      const status = error.status ?? ({ UNAUTHORIZED: 401, FORBIDDEN: 403, BAD_REQUEST: 400, NOT_FOUND: 404, METHOD_NOT_ALLOWED: 405 }[error.code] ?? 500)
      if (res.headersSent) return next?.(error)
      res.status(status).json({ error: { code: error.code ?? 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : error.message, details: status === 500 ? {} : error.details ?? {} } })
    }
  }
}

function sendRouteResult(res, result, req = {}) {
  const wantsHtml = accepts(req, 'text/html')
  const wantsPartial = accepts(req, 'text/partial') || req.headers?.['x-ligature-partial'] === 'true'
  if (result && typeof result === 'object' && ('body' in result || 'status' in result || 'headers' in result)) {
    if (result.headers) for (const [name, value] of Object.entries(result.headers)) res.set?.(name, value)
    if (result.status) res.status(result.status)
    if (wantsPartial && result.partial !== undefined) return res.send ? res.send(result.partial) : res.end(result.partial)
    if (wantsHtml && result.html !== undefined) return res.send ? res.send(result.html) : res.end(result.html)
    if (typeof result.body === 'string') return res.send ? res.send(result.body) : res.end(result.body)
    return res.json(result.body ?? {})
  }
  if ((wantsPartial || wantsHtml) && typeof result === 'string') return res.send ? res.send(result) : res.end(result)
  return res.json(result ?? {})
}

function accepts(req, type) {
  const header = String(req.headers?.accept ?? '')
  return header.split(',').some(value => value.trim().split(';')[0] === type || value.trim() === '*/*')
}
