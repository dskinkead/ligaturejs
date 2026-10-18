import test from 'node:test'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { csrfToken, verifyCsrf, sessionContract, createSessionManager, securityHeaders, createAuthorization, validateUpload, isolatedUploadPath, createRateLimiter, createMemoryDatabase, withTransaction } from '../src/index.js'
test('CSRF tokens are session-bound', () => { const session = {}; const token = csrfToken(session); assert.equal(verifyCsrf(session, token), true); assert.equal(verifyCsrf(session, 'wrong'), false) })
test('session contract has secure defaults', () => { assert.equal(sessionContract().httpOnly, true); assert.equal(sessionContract().sameSite, 'lax'); assert.equal(sessionContract().secure, true) })
test('session manager rotates, expires, and destroys sessions', () => {
  let clock = 1000; const manager = createSessionManager({ now: () => clock, idleTimeout: 10, maxAge: 100 })
  const first = manager.create({ userId: 7 }); assert.equal(manager.get(first.id).data.userId, 7)
  const second = manager.rotate(first.id); assert.equal(manager.get(first.id), null); assert.equal(manager.get(second.id).data.userId, 7)
  clock += 11; assert.equal(manager.get(second.id), null)
})
test('security headers and authorization enforce explicit policy', async () => {
  const headers = {}; securityHeaders()({}, { set: (k, v) => { headers[k] = v } }, () => {})
  assert.equal(headers['X-Frame-Options'], 'DENY'); assert.match(headers['Content-Security-Policy'], /object-src 'none'/)
  const auth = createAuthorization({ authenticate: async () => ({ id: 1 }), authorize: async ({ user }) => user.id === 1 })
  const req = {}; let continued = false; await auth.middleware(req, { status: () => ({ json: () => {} }) }, () => { continued = true }); assert.equal(req.user.id, 1); assert.equal(continued, true)
})
test('uploads are bounded and isolated', () => {
  assert.deepEqual(validateUpload({ name: 'avatar.png', type: 'image/png', size: 12 }, { mimeTypes: ['image/png'], extensions: ['.png'] }), { name: 'avatar.png', type: 'image/png', size: 12, extension: '.png' })
  assert.throws(() => validateUpload({ name: '../secret', type: 'text/plain', size: 1 }), /unsafe/)
  const root = path.join(os.tmpdir(), 'uploads')
  const upload = isolatedUploadPath(root, 'avatar.png')
  assert.equal(path.dirname(upload), root)
  assert.match(path.basename(upload), /^[a-f0-9]{32}-avatar\.png$/)
})
test('rate limiter returns 429 after the bounded window quota', () => {
  const limiter = createRateLimiter({ max: 1, windowMs: 1000 }); const statuses = []; const res = { set: () => {}, status: code => ({ json: () => statuses.push(code) }) }
  limiter({ ip: 'test' }, res, () => {}); limiter({ ip: 'test' }, res, () => { throw new Error('should not continue') }); assert.deepEqual(statuses, [429])
})
test('memory database supports transaction rollback', async () => { const db = createMemoryDatabase({ tasks: [{ id: 1 }] }); await assert.rejects(() => withTransaction(db, async adapter => { await adapter.query('tasks'); throw new Error('rollback') })); assert.deepEqual(await db.query('tasks'), [{ id: 1 }]) })
