import test from 'node:test'
import assert from 'node:assert/strict'
import { clientRuntime } from '../src/index.js'

test('runtime source contains deterministic cleanup and replacement flow', () => {
  const source = clientRuntime()
  assert.match(source, /mounted\.has\(el\)/)
  assert.match(source, /def\.mount\?\./)
  assert.match(source, /function cleanupMounted\(el,item,def\).*def\?\.unmount\?/s)
  assert.match(source, /target\.replaceWith\(outlet\)/)
  assert.match(source, /history\.pushState/)
})
