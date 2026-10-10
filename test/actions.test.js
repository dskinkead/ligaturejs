import test from 'node:test'
import assert from 'node:assert/strict'
import { actionManifest, createActionHandler, csrfToken, defineAction } from '../src/index.js'

function response() {
  const result = { statusCode: 200, headers: {}, body: undefined }
  return { result, set(name, value) { result.headers[name] = value }, status(code) { result.statusCode = code; return this }, json(body) { result.body = body; return this } }
}

test('actions validate metadata and publish a safe manifest', () => {
  const action = defineAction({ name: 'save', method: 'post', input: { title: 'string' }, handle: () => ({ ok: true }) })
  assert.deepEqual(actionManifest([action]), [{ name: 'save', method: 'POST', auth: false, input: { title: 'string' } }])
})

test('action handler requires session CSRF and passes validated input', async () => {
  const session = {}
  const token = csrfToken(session)
  const action = defineAction({ name: 'save', input: { title: 'string' }, handle: ({ input }) => input })
  const handler = createActionHandler(action)
  const denied = response()
  await handler({ method: 'POST', session, body: { title: 'x' } }, denied)
  assert.equal(denied.result.statusCode, 403)
  const accepted = response()
  await handler({ method: 'POST', session, headers: { 'x-csrf-token': token }, body: { title: 'x' } }, accepted)
  assert.deepEqual(accepted.result.body, { title: 'x' })
})

test('action handler supports auth and explicit response metadata', async () => {
  const action = defineAction({ name: 'read', method: 'GET', auth: true, handle: ({ user }) => ({ body: user, status: 202, headers: { ETag: 'one' } }) })
  const handler = createActionHandler(action, { authenticate: () => ({ id: 1 }) })
  const output = response()
  await handler({ method: 'GET' }, output)
  assert.equal(output.result.statusCode, 202)
  assert.deepEqual(output.result.body, { id: 1 })
  assert.equal(output.result.headers.ETag, 'one')
})
