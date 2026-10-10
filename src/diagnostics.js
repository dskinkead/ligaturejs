export function diagnosticsMiddleware({ name = 'app', version = 'unknown', checks = {}, logger } = {}) {
  return async (req, res, next) => {
    if (req.path !== '/healthz' && req.path !== '/readyz') return next()
    const results = {}
    for (const [key, check] of Object.entries(checks)) { try { results[key] = (await check()) === true ? 'ok' : 'degraded' } catch { results[key] = 'failed' } }
    const ready = Object.values(results).every(value => value === 'ok')
    const body = { status: ready ? 'ok' : 'degraded', service: name, version, checks: results, requestId: req.requestId, time: new Date().toISOString() }
    logger?.info?.('health check', { requestId: req.requestId, endpoint: req.path, status: body.status })
    res.status(req.path === '/readyz' && !ready ? 503 : 200).json(body)
  }
}

export function requestIdMiddleware({ logger } = {}) {
  return (req, res, next) => {
    const supplied = req.headers?.['x-request-id']
    const id = typeof supplied === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : cryptoRandom()
    req.requestId = id
    if (logger?.child) req.log = logger.child({ requestId: id })
    res.set?.('X-Request-Id', id)
    next()
  }
}
function cryptoRandom() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}` }

export function createMetrics() {
  const counters = new Map()
  const durations = new Map()
  const key = (name, labels = {}) => `${name}|${Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join(',')}`
  const increment = (name, labels = {}, amount = 1) => {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('Metric amount must be a non-negative finite number')
    const metricKey = key(name, labels); counters.set(metricKey, (counters.get(metricKey) ?? 0) + amount)
  }
  const observe = (name, value, labels = {}) => {
    if (!Number.isFinite(value) || value < 0) throw new RangeError('Metric value must be a non-negative finite number')
    const metricKey = key(name, labels); const values = durations.get(metricKey) ?? []; values.push(value); durations.set(metricKey, values)
  }
  return Object.freeze({
    increment,
    observe,
    recordRender(duration, labels = {}) { observe('render_duration_ms', duration, labels); increment('renders_total', labels) },
    recordAsset(type, labels = {}) { increment('asset_loads_total', { ...labels, type }) },
    recordFailure(kind = 'request', labels = {}) { increment('failures_total', { ...labels, kind }) },
    middleware() {
      return (req, res, next) => {
        const started = performance.now()
        const finish = () => {
          const status = String(res.statusCode ?? 200)
          increment('http_requests_total', { method: req.method ?? 'GET', path: req.path ?? '/', status })
          observe('http_request_duration_ms', performance.now() - started, { method: req.method ?? 'GET', path: req.path ?? '/' })
        }
        if (typeof res.once === 'function') res.once('finish', finish)
        else { const end = res.end; if (typeof end === 'function') res.end = (...args) => { finish(); return end.apply(res, args) } }
        next()
      }
    },
    snapshot() {
      return Object.freeze({ counters: Object.fromEntries(counters), durations: Object.fromEntries([...durations].map(([name, values]) => [name, Object.freeze([...values])])) })
    }
  })
}

export function errorReportingMiddleware({ report, logger } = {}) {
  if (typeof report !== 'function') throw new TypeError('errorReportingMiddleware requires a report function')
  return async (error, req, res, next) => {
    const details = Object.freeze({ error, requestId: req?.requestId, method: req?.method, path: req?.path })
    try { await report(details) } catch (reportError) { logger?.error?.('error reporter failed', { requestId: req?.requestId, error: reportError.message }) }
    logger?.error?.('request failed', { requestId: req?.requestId, error: error?.message })
    next(error)
  }
}

export function createShutdownManager({ servers = [], closeTimeoutMs = 10_000, onShutdown, logger } = {}) {
  if (!Array.isArray(servers) || servers.some(server => typeof server?.close !== 'function')) throw new TypeError('servers must contain close-capable servers')
  if (!Number.isFinite(closeTimeoutMs) || closeTimeoutMs <= 0) throw new RangeError('closeTimeoutMs must be positive')
  let closed = false
  const closeServer = server => new Promise((resolve, reject) => {
    let settled = false; const finish = error => { if (settled) return; settled = true; error ? reject(error) : resolve() }
    try { const result = server.close(finish); if (result?.then) result.then(() => finish(), finish) } catch (error) { finish(error) }
  })
  const shutdown = async signal => {
    if (closed) return false
    closed = true
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error(`Shutdown timed out after ${closeTimeoutMs}ms`)), closeTimeoutMs))
    try { await Promise.race([Promise.all(servers.map(closeServer)), timeout]); await onShutdown?.(signal); logger?.info?.('shutdown complete', { signal }); return true }
    catch (error) { logger?.error?.('shutdown failed', { signal, error: error.message }); throw error }
  }
  const install = (processLike = process, signals = ['SIGTERM', 'SIGINT']) => {
    const handlers = new Map(signals.map(signal => [signal, () => void shutdown(signal).catch(() => {})]))
    for (const [signal, handler] of handlers) processLike.once(signal, handler)
    return () => { for (const [signal, handler] of handlers) processLike.removeListener?.(signal, handler) }
  }
  return Object.freeze({ shutdown, install, get closed() { return closed } })
}
