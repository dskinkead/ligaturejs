import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { defineComponent, createComponentRegistry, escapeHtml } from '../src/index.js'
import { assertRenderSnapshot, semanticRender } from './helpers/render-test.js'

const snapshot = await readFile(new URL('./fixtures/card.render.html', import.meta.url), 'utf8')

function cardRegistry() {
  return createComponentRegistry()
    .register(defineComponent({
      name: 'badge',
      props: { label: { required: true, type: 'string' } },
      render: ({ label }) => `<strong class="badge">${escapeHtml(label)}</strong>`
    }))
    .register(defineComponent({
      name: 'card',
      props: { title: { required: true, type: 'string' } },
      render: ({ title }, _, context) => `<article class="card"><h1>${escapeHtml(title)}</h1>${context.render('badge', { label: 'New' })}</article>`
    }))
}

test('server render stays snapshot-stable for a representative component tree', () => {
  const html = cardRegistry().render('card', { title: 'Projects & Tasks' })
  assertRenderSnapshot(html, snapshot)
})

test('semantic render assertions verify meaning without coupling to wrapper metadata', () => {
  const tree = semanticRender(cardRegistry().render('card', { title: 'Projects & Tasks' }))
  const heading = tree.find('h1')
  const badge = tree.find('.badge')

  assert.ok(heading)
  assert.equal(heading.text(), 'Projects & Tasks')
  assert.ok(badge)
  assert.equal(badge.text(), 'New')
  assert.equal(tree.findAll('[data-agent-component="card"]').length, 1)
  assert.equal(tree.findAll('strong[class="badge"]').length, 1)
})
