import test from 'node:test'
import assert from 'node:assert/strict'
import { createApplicationManifest } from '../src/index.js'

test('application manifest is machine-readable and versioned', () => {
  const manifest = createApplicationManifest({ name: 'demo', version: '1.0.0', routes: [{ method: 'GET', path: '/' }], components: ['task-list'] })
  assert.equal(manifest.schema, 'ligaturejs.application.v1')
  assert.equal(manifest.name, 'demo')
  assert.deepEqual(manifest.components, ['task-list'])
  assert.equal(Object.hasOwn(manifest, 'generatedAt'), false)
})
