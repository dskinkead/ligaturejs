import test from 'node:test'
import assert from 'node:assert/strict'
import { defineMigration, migrationManifest, diagnosticsMiddleware, requestIdMiddleware, createLogger, createMetrics, errorReportingMiddleware, createShutdownManager } from '../src/index.js'

test('migrations have reversible metadata', () => { const migration = defineMigration({ id: '001', description: 'create tasks', up: () => {}, down: () => {} }); assert.deepEqual(migrationManifest([migration]), [{ id: '001', description: 'create tasks' }]) })
test('readiness reports failed checks with service metadata', async () => { const out = {}; const res = { status(code) { out.status = code; return this }, json(body) { out.body = body } }; await diagnosticsMiddleware({ name: 'demo', version: '1', checks: { db: () => false } })({ path: '/readyz' }, res, () => {}); assert.equal(out.status, 503); assert.equal(out.body.checks.db, 'degraded') })
test('request IDs are validated, propagated, and included in child logs', () => {
  const lines = []; const logger = createLogger('demo', { info: line => lines.push(JSON.parse(line)) }); const req = { headers: { 'x-request-id': 'req-42' } }; const res = { set(name, value) { this[name] = value } }
  requestIdMiddleware({ logger })(req, res, () => {}); req.log.info('hello'); assert.equal(req.requestId, 'req-42'); assert.equal(res['X-Request-Id'], 'req-42'); assert.equal(lines[0].details.requestId, 'req-42')
})
test('metrics record request counts and durations', () => {
  const metrics = createMetrics(); const res = { statusCode: 201, once(event, callback) { assert.equal(event, 'finish'); callback() } }; metrics.middleware()({ method: 'POST', path: '/items' }, res, () => {})
  const snapshot = metrics.snapshot(); assert.equal(snapshot.counters['http_requests_total|method=POST,path=/items,status=201'], 1); assert.equal(snapshot.durations['http_request_duration_ms|method=POST,path=/items'].length, 1)
  metrics.recordRender(4, { component: 'Card' }); metrics.recordAsset('js', { name: 'Card' }); metrics.recordFailure('render', { component: 'Card' }); const recorded = metrics.snapshot(); assert.equal(recorded.counters['renders_total|component=Card'], 1); assert.equal(recorded.counters['asset_loads_total|name=Card,type=js'], 1); assert.equal(recorded.counters['failures_total|component=Card,kind=render'], 1)
})
test('error reporting observes failures and preserves Express propagation', async () => {
  const reported = []; let nextError; await errorReportingMiddleware({ report: details => reported.push(details) })({ message: 'broken' }, { requestId: 'r1', method: 'GET', path: '/x' }, {}, error => { nextError = error }); assert.equal(reported[0].requestId, 'r1'); assert.equal(nextError.message, 'broken')
})
test('shutdown manager closes servers once and runs the hook', async () => {
  let closes = 0; let hook = 0; const manager = createShutdownManager({ servers: [{ close(callback) { closes++; callback() } }], onShutdown: () => { hook++ } }); assert.equal(await manager.shutdown('SIGTERM'), true); assert.equal(await manager.shutdown('SIGTERM'), false); assert.equal(closes, 1); assert.equal(hook, 1); assert.equal(manager.closed, true)
})
test('shutdown installation can be removed without leaking signal listeners', () => {
  const listeners = new Map(); const processLike = { once(signal, handler) { listeners.set(signal, handler) }, removeListener(signal, handler) { assert.equal(listeners.get(signal), handler); listeners.delete(signal) } }; const manager = createShutdownManager(); const uninstall = manager.install(processLike, ['SIGTERM']); uninstall(); assert.equal(listeners.size, 0)
})
