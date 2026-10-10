import test from 'node:test'
import assert from 'node:assert/strict'
import { escapeText, escapeAttribute, escapeUrl, componentSchema, defineComponent } from '../src/index.js'

test('escaping remains safe across deterministic adversarial inputs', () => {
  const probes = ['<script>', '"quoted"', "'single'", '&amp;', '\u0000', 'javascript:alert(1)', 'data:text/html,x']
  for (const probe of probes) {
    assert.doesNotMatch(escapeText(probe), /<script>/i)
    assert.doesNotMatch(escapeAttribute(probe), /<script>|["']/i)
    if (probe.includes('\u0000') || /^[\s]*(javascript|data):/i.test(probe)) assert.throws(() => escapeUrl(probe), /Unsafe URL/)
    else assert.equal(typeof escapeUrl(probe), 'string')
  }
})

test('component schemas preserve required/default invariants over generated contracts', () => {
  for (let i = 0; i < 32; i++) {
    const component = defineComponent({ name: `schema-${i}`, props: { title: { type: 'string', required: true }, count: { type: 'number', default: i } }, render: () => '<p />' })
    const schema = componentSchema(component)
    assert.deepEqual(schema.required, ['title'])
    assert.equal(schema.properties.count.default, i)
    assert.equal(Object.isFrozen(schema), true)
  }
})
