import test from 'node:test'
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import { createComponentRegistry, defineComponent } from '../src/index.js'

test('server renders a bounded component workload', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'bench', render: props => `<p>${props.value}</p>` }))
  const start = performance.now(); for (let i = 0; i < 1000; i++) registry.render('bench', { value: i }, { id: `bench-${i}` }); const elapsed = performance.now() - start
  assert.ok(elapsed < 1000, `render benchmark exceeded 1s: ${elapsed}ms`)
})
