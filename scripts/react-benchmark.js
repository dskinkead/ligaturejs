import { performance } from 'node:perf_hooks'
import { createComponentRegistry, defineComponent } from '../src/index.js'

const iterations = Number(process.env.BENCHMARK_ITERATIONS || 1000)
const registry = createComponentRegistry().register(defineComponent({ name: 'benchmark-card', render: props => `<article><h2>${props.title}</h2><p>${props.body}</p></article>` }))
const start = performance.now()
for (let i = 0; i < iterations; i++) registry.render('benchmark-card', { title: `Item ${i}`, body: 'Benchmark content' }, { id: `item-${i}` })
const elapsed = performance.now() - start
console.log(JSON.stringify({ framework: 'Forgelet/Ligature', workload: 'server-rendered component generation', iterations, elapsedMs: Number(elapsed.toFixed(2)), note: 'This is a baseline, not a React performance claim.' }))
