import test from 'node:test'
import assert from 'node:assert/strict'
import { createRouteHandler, defineRoute, badRequest, createRouter, matchRoute, redirect, signedRedirect, signReturnTo, verifyReturnTo, routeNotFound } from '../src/index.js'

function response() { const out = {}; return { out, status(code) { out.status = code; return this }, json(value) { out.body = value }, send(value) { out.body = value }, get headersSent() { return false } } }
test('route handler enforces auth and validates input', async () => {
  const route = defineRoute({ method: 'POST', path: '/x', auth: true, input: { title: 'string' }, handle: ({ input }) => ({ title: input.title }) })
  const denied = response(); await createRouteHandler(route, { authenticate: () => null })({ body: { title: 'x' } }, denied); assert.equal(denied.out.status, 401)
  const accepted = response(); await createRouteHandler(route, { authenticate: () => ({ id: 'u' }) })({ body: { title: 'x' } }, accepted); assert.deepEqual(accepted.out.body, { title: 'x' })
})
test('known errors are returned without leaking unexpected errors', async () => {
  const route = defineRoute({ method: 'GET', path: '/x', handle: () => { throw badRequest('bad') } })
  const out = response(); await createRouteHandler(route)({}, out); assert.equal(out.out.status, 400); assert.equal(out.out.body.error.message, 'bad')
})
test('route patterns decode params and router parses queries', async () => {
  const route = defineRoute({ method: 'GET', path: '/tasks/:id', input: { q: 'string' }, handle: ({ params, query }) => ({ params, query }) })
  assert.deepEqual(matchRoute(route, '/tasks/a%2Fb?x=1'), { id: 'a/b' })
  const req = { method: 'GET', url: '/tasks/a%2Fb?q=one&q=two' }
  let selected
  await createRouter([route])(req, {}, value => { selected = value })
  assert.equal(selected, route)
  assert.deepEqual(req.params, { id: 'a/b' })
  assert.deepEqual(req.query, { q: ['one', 'two'] })
})
test('router returns deterministic 404 and 405 responses', async () => {
  const route = defineRoute({ method: 'POST', path: '/tasks', handle: () => ({}) })
  const result = { status: 0, body: null, headers: {} }
  const res = { set(name, value) { result.headers[name] = value }, status(code) { result.status = code; return this }, json(body) { result.body = body } }
  await createRouter([route])({ method: 'GET', path: '/tasks' }, res)
  assert.equal(result.status, 405); assert.equal(result.headers.Allow, 'POST')
  await createRouter([route])({ method: 'GET', path: '/missing' }, res)
  assert.equal(result.status, 404); assert.equal(result.body.error.code, 'NOT_FOUND')
})
test('route handlers support redirects and explicit response metadata', async () => {
  const route = defineRoute({ method: 'POST', path: '/tasks', handle: () => redirect('/tasks/1') })
  const result = { status: 0, body: '', headers: {} }
  const res = { set(name, value) { result.headers[name] = value }, status(code) { result.status = code; return this }, send(body) { result.body = body }, json(body) { result.body = body }, get headersSent() { return false } }
  await createRouteHandler(route)({ body: {} }, res)
  assert.equal(result.status, 303); assert.equal(result.headers.Location, '/tasks/1'); assert.equal(result.body, '')
})

test('signed return-to helpers reject tampering, expiry, and unsafe destinations', () => {
  const token = signReturnTo('/projects?filter=open', 'unit-test-key', { now: 1_700_000_000_000, ttlSeconds: 60 })
  assert.equal(verifyReturnTo(token, 'unit-test-key', { now: 1_700_000_030_000 }), '/projects?filter=open')
  assert.equal(verifyReturnTo(token.replace(/.$/, token.endsWith('A') ? 'B' : 'A'), 'unit-test-key', { now: 1_700_000_030_000 }), null)
  assert.equal(verifyReturnTo(token, 'unit-test-key', { now: 1_700_000_061_000 }), null)
  assert.throws(() => signReturnTo('https://evil.example', 'unit-test-key'), /application-relative/)
  assert.throws(() => signReturnTo('//evil.example', 'unit-test-key'), /application-relative/)
  assert.throws(() => signReturnTo('/ok', '', {}), /non-empty/)
})

test('signedRedirect targets an explicit continuation endpoint', () => {
  const result = signedRedirect('/projects/7', 'unit-test-key', { endpoint: '/login', now: 1_700_000_000_000 })
  assert.equal(result.status, 303)
  assert.match(result.headers.Location, /^\/login\?returnTo=[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/)
  const token = decodeURIComponent(result.headers.Location.split('returnTo=')[1])
  assert.equal(verifyReturnTo(token, 'unit-test-key', { now: 1_700_000_001_000 }), '/projects/7')
})
test('route sentinel errors map to safe HTTP statuses', async () => {
  const route = defineRoute({ method: 'GET', path: '/missing', handle: () => { throw routeNotFound() } })
  const result = { status: 0, body: null }
  const res = { status(code) { result.status = code; return this }, json(body) { result.body = body }, get headersSent() { return false } }
  await createRouteHandler(route)({}, res)
  assert.equal(result.status, 404); assert.equal(result.body.error.code, 'NOT_FOUND')
})
test('route loaders, authorization, actions, and layouts share authenticated context', async () => {
  const route = defineRoute({ method: 'POST', path: '/projects/:id', auth: true, input: { title: 'string' }, loader: ({ user, params }) => ({ owner: user.id, id: params.id }), authorize: ({ user }) => user.id === 'owner', action: ({ data, input }) => ({ body: { data, title: input.title } }), layouts: [({ result }) => ({ status: 202, body: { wrapped: result.body } })] })
  const out = response(); await createRouteHandler(route, { authenticate: () => ({ id: 'owner' }) })({ method: 'POST', params: { id: '7' }, body: { title: 'Ship' } }, out)
  assert.equal(out.out.status, 202); assert.deepEqual(out.out.body, { wrapped: { data: { owner: 'owner', id: '7' }, title: 'Ship' } })
  const denied = response(); await createRouteHandler(route, { authenticate: () => ({ id: 'other' }) })({ method: 'POST', params: { id: '7' }, body: { title: 'Ship' } }, denied); assert.equal(denied.out.status, 403)
})
test('route error boundaries and content negotiation select safe representations', async () => {
  const route = defineRoute({ method: 'GET', path: '/x', handle: () => { throw badRequest('nope') }, errorBoundary: ({ error }) => ({ status: 422, html: `<p>${error.message}</p>`, body: { fallback: true } }) })
  const html = response(); await createRouteHandler(route)({ headers: { accept: 'text/html' } }, html); assert.equal(html.out.status, 422); assert.equal(html.out.body, '<p>nope</p>')
  const json = response(); await createRouteHandler(route)({ headers: { accept: 'application/json' } }, json); assert.deepEqual(json.out.body, { fallback: true })
  const partial = defineRoute({ method: 'GET', path: '/p', handle: () => ({ status: 200, partial: '<li>one</li>', body: { count: 1 } }) }); const partialOut = response(); await createRouteHandler(partial)({ headers: { accept: 'text/partial' } }, partialOut); assert.equal(partialOut.out.body, '<li>one</li>')
})
