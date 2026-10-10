import test from 'node:test'
import assert from 'node:assert/strict'
import flash from '../example/components/flash.js'

test('interactive flash control has accessible semantics', () => {
  const html = flash.render({ message: 'Saved', kind: 'success' })
  assert.match(html, /role="status"/)
  assert.match(html, /aria-label="Dismiss message"/)
  assert.match(html, /type="button"/)
})
