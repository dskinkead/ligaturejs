import test from 'node:test'
import assert from 'node:assert/strict'
import { defineRoute, defineRepository, routeManifest } from '../src/index.js'

test('routes expose safe machine-readable contracts', () => {
  const route = defineRoute({ method: 'post', path: '/tasks', auth: true, input: { title: 'string' }, output: { id: 'string' }, handle: () => null })
  assert.deepEqual(routeManifest([route]), [{ method: 'POST', path: '/tasks', auth: true, input: { title: 'string' }, output: { id: 'string' } }])
})
test('repositories reject non-functions', () => assert.throws(() => defineRepository({ name: 'tasks', methods: { all: true } }), /must be a function/))
test('repositories freeze the vendor-neutral method boundary', () => {
  const repository = defineRepository({ name: ' tasks ', methods: { all: async () => [] } })
  assert.equal(repository.name, 'tasks')
  assert.equal(Object.isFrozen(repository.methods), true)
  assert.throws(() => defineRepository({ name: 'tasks', methods: [] }), /methods must be an object/)
})
