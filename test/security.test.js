import test from 'node:test'
import assert from 'node:assert/strict'
import { validateInput, createLogger } from '../src/index.js'

test('input validation rejects missing and wrong values', () => {
  assert.throws(() => validateInput({ title: 'string' }, {}), /Missing input/)
  assert.throws(() => validateInput({ title: 'string' }, { title: 4 }), /Invalid input/)
  assert.deepEqual(validateInput({ title: 'string' }, { title: 'ok' }), { title: 'ok' })
})
test('logger emits structured JSON', () => { const lines=[]; createLogger('test', { info: line => lines.push(line) }).info('hello', { ok: true }); assert.match(lines[0], /"message":"hello"/) })
