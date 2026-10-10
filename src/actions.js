import { csrfMiddleware } from './csrf.js'
import { validateInput } from './validate.js'

export function defineAction(definition) {
  if (!definition || typeof definition !== 'object' || typeof definition.handle !== 'function') throw new TypeError('Action requires a definition and handle function')
  if (typeof definition.name !== 'string' || !definition.name) throw new TypeError('Action name must be a non-empty string')
  const method = String(definition.method ?? 'POST').toUpperCase()
  if (!/^[A-Z]+$/.test(method)) throw new TypeError('Action method must be a valid HTTP method')
  return Object.freeze({ name: definition.name, method, auth: Boolean(definition.auth), input: definition.input ?? {}, status: definition.status ?? 200, handle: definition.handle })
}

export function actionManifest(actions) {
  if (!Array.isArray(actions)) throw new TypeError('actionManifest requires an array')
  return actions.map(action => ({ name: action.name, method: action.method, auth: Boolean(action.auth), input: action.input ?? {} }))
}

export function createActionHandler(action, context = {}) {
  const definition = defineAction(action)
  const csrf = definition.method === 'GET' || definition.method === 'HEAD' ? null : csrfMiddleware(context.csrf ?? {})
  return async (req, res, next) => {
    try {
      if (req.method && req.method.toUpperCase() !== definition.method) return next?.()
      if (csrf) {
        let rejected = false
        csrf(req, { status: code => ({ json: body => { rejected = true; res.status(code).json(body) } }) }, () => {})
        if (rejected) return
      }
      const user = context.authenticate ? await context.authenticate(req) : undefined
      if (definition.auth && !user) return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } })
      const input = definition.input ? validateInput(definition.input, { ...(req.body ?? {}), ...(req.query ?? {}), ...(req.params ?? {}) }) : {}
      const result = await definition.handle({ req, user, input, repositories: context.repositories ?? {} })
      if (res.headersSent) return
      if (result && typeof result === 'object' && Object.hasOwn(result, 'body')) {
        for (const [name, value] of Object.entries(result.headers ?? {})) res.set?.(name, value)
        return res.status(result.status ?? definition.status).json(result.body)
      }
      return res.status(definition.status).json(result ?? {})
    } catch (error) {
      const status = error.status ?? (error.code === 'BAD_REQUEST' ? 400 : 500)
      if (res.headersSent) return next?.(error)
      return res.status(status).json({ error: { code: error.code ?? 'INTERNAL_ERROR', message: status === 500 ? 'Internal server error' : error.message, details: status === 500 ? {} : error.details ?? {} } })
    }
  }
}
