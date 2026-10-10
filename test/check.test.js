import test from 'node:test'
import assert from 'node:assert/strict'
import { checkApplication, defineComponent, createApplicationManifest } from '../src/index.js'

test('application checker reports contract errors', () => {
  const component = defineComponent({ name: 'card', render: () => '' })
  const result = checkApplication({ manifest: createApplicationManifest({ name: 'app', version: '1' }), components: [component, component], routes: [{ path: '/missing-method' }] })
  assert.equal(result.ok, false); assert.match(result.errors.join(','), /Duplicate component/); assert.match(result.errors.join(','), /Route missing/)
})
