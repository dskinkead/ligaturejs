import test from 'node:test'
import assert from 'node:assert/strict'
import { BoltRenderError, BoltTemplateError, createBoltRegistry, defineBolt } from '../src/index.js'

test('bolts render with scoped data and nested bolt calls', () => {
  const registry = createBoltRegistry()
  registry.register(defineBolt({ name: 'services', render: (data, context) => `<ul>${data.items.map(item => `<li>${context.escape.text(item)}</li>`).join('')}</ul>` }))
  registry.register(defineBolt({ name: 'page', render: (data, context) => `<main>${context.bolt('services', { items: data.services })}</main>` }))
  assert.equal(registry.render('page', { services: ['A&B'] }), '<main><ul><li>A&amp;B</li></ul></main>')
})

test('bolt errors identify the bolt and non-string output is rejected', () => {
  const registry = createBoltRegistry()
  registry.register(defineBolt({ name: 'broken', render: () => 42 }))
  assert.throws(() => registry.render('broken'), error => error instanceof BoltRenderError && error.bolt === 'broken')
})

test('bolt registry rejects duplicate names and exposes metadata', () => {
  const registry = createBoltRegistry()
  const bolt = defineBolt({ name: 'card', props: { title: { type: 'string' } }, render: () => '<div />' })
  registry.register(bolt)
  assert.throws(() => registry.register(bolt), /Duplicate bolt/)
  assert.equal(registry.manifest()[0].name, 'card')
})

test('declarative bolt templates interpolate escaped nested data paths', () => {
  const registry = createBoltRegistry()
  registry.register(defineBolt({ name: 'visit-stat', template: '<strong>{{data.count}}</strong><span>{{ data.title }}</span>' }))
  assert.equal(registry.render('visit-stat', { count: 3, title: 'A&B' }), '<strong>3</strong><span>A&amp;B</span>')
  assert.equal(registry.render('visit-stat', {}), '<strong></strong><span></span>')
  assert.equal(registry.manifest()[0].mode, 'template')
  assert.equal(registry.manifest()[0].hasTemplate, true)
})

test('bolt templates reject executable expressions with structured errors', () => {
  const registry = createBoltRegistry()
  registry.register(defineBolt({ name: 'unsafe', template: '{{data.constructor()}}' }))
  assert.throws(() => registry.render('unsafe', {}), error => error instanceof BoltTemplateError && error.expression === 'data.constructor()')
})

test('bolt definitions reject ambiguous or unsafe contracts', () => {
  assert.throws(() => defineBolt({ name: 'ambiguous', render: () => '', template: '<p />' }), /both render and template/)
  assert.throws(() => defineBolt({ name: 'bad-props', props: [], render: () => '' }), /props must be an object/)
  assert.throws(() => defineBolt({ name: 'bad-version', version: '', render: () => '' }), /version must be a non-empty string/)
  const registry = createBoltRegistry()
  registry.register(defineBolt({ name: 'safe-template', template: '{{data.__proto__}}' }))
  assert.throws(() => registry.render('safe-template', {}), /unsafe data path/)
})
