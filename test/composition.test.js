import test from 'node:test'
import assert from 'node:assert/strict'
import { createComponentRegistry } from '../src/index.js'
import { createContext, defineComponent } from '../src/component.js'

test('components can render registered children through context', () => {
  const registry = createComponentRegistry()
    .register(defineComponent({ name: 'child-badge', props: { label: { required: true, type: 'string' } }, render: ({ label }) => `<b>${label}</b>` }))
    .register(defineComponent({ name: 'parent-card', render: (_, __, context) => `<article>${context.render('child-badge', { label: 'Child' })}</article>` }))
  assert.match(registry.render('parent-card'), /<b>Child<\/b>/)
})

test('named children and slots resolve trusted fragments, fallbacks, and frozen scope', () => {
  let receivedScope
  const registry = createComponentRegistry()
    .register(defineComponent({
      name: 'slot-card',
      children: { body: '<p>default child</p>' },
      slots: ['title', 'aside'],
      slotFallbacks: { title: scope => `<h1>${scope.label}</h1>`, aside: '<aside>default aside</aside>' },
      render: (_, __, context) => `<article>${context.slot('title', { label: 'Fallback' })}${context.child('body')}${context.slot('aside')}${context.slot('missing')}</article>`
    }))
    .register(defineComponent({
      name: 'scoped-slot-card',
      slots: ['title'],
      render: (_, __, context) => {
        const fragment = context.slot('title', { label: 'unused' })
        receivedScope = context.slots.title
        return fragment
      }
    }))

  assert.match(registry.render('slot-card', {}, { slots: { title: scope => { assert.equal(Object.isFrozen(scope), true); return `<h1>${scope.label}</h1>` }, aside: '<aside>provided</aside>' } }), /<h1>Fallback<\/h1>/)
  assert.match(registry.render('slot-card'), /default child.*default aside/)
  assert.match(registry.render('scoped-slot-card', {}, { slots: { title: scope => `<h2>${scope.label}</h2>` } }), /<h2>unused<\/h2>/)
  assert.equal(typeof receivedScope, 'function')
})

test('composition fragments reject unsafe shapes at the boundary', () => {
  assert.throws(() => createComponentRegistry().register(defineComponent({ name: 'bad-child', children: { body: 42 }, render: () => '' })), /children.body must be HTML text or a function/)
  const registry = createComponentRegistry().register(defineComponent({ name: 'slot-card', slots: ['title'], render: (_, __, context) => context.slot('title') }))
  assert.throws(() => registry.render('slot-card', {}, { slots: { title: 42 } }), /slots.title must be HTML text or a function/)
})

test('context providers are scoped to descendants and consumers receive defaults', () => {
  const theme = createContext('theme', 'light')
  const registry = createComponentRegistry()
    .register(defineComponent({
      name: 'context-leaf',
      render: (_, __, context) => `<span>${context.consume(theme)}</span>`
    }))
    .register(defineComponent({
      name: 'context-parent',
      render: (_, __, context) => context.provide(theme, 'dark', () => context.render('context-leaf'))
    }))

  assert.match(registry.render('context-leaf'), /<span>light<\/span>/)
  assert.match(registry.render('context-parent'), /<span>dark<\/span>/)
  assert.match(registry.render('context-leaf', {}, { providers: new Map([[theme, 'root']]) }), /<span>root<\/span>/)
})

test('context providers restore the previous value after a scoped render', () => {
  const request = createContext('request-id', 'missing')
  const registry = createComponentRegistry().register(defineComponent({
    name: 'context-scope',
    render: (_, __, context) => `${context.consume(request)}|${context.provide(request, 'inner', () => context.consume(request))}|${context.consume(request)}`
  }))
  assert.match(registry.render('context-scope', {}, { providers: new Map([[request, 'outer']]) }), /outer\|inner\|outer/)
})

test('context APIs reject invalid definitions and provider values', () => {
  assert.throws(() => createContext('Not Valid', null), /kebab-case/)
  const registry = createComponentRegistry().register(defineComponent({ name: 'context-invalid', render: () => '' }))
  assert.throws(() => registry.render('context-invalid', {}, { providers: new Map([['bad', true]]) }), /created by createContext/)
  assert.throws(() => registry.render('context-invalid', {}, { providers: new Map([[{ id: Symbol('fake') }, true]]) }), /created by createContext/)
})
