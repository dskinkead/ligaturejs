import { performance } from 'node:perf_hooks'
import { gzipSync } from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { createComponentRegistry, defineComponent, criticalCss } from '../src/index.js'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const budgets = Object.freeze({ serverRenderMs: 250, runtimeGzipBytes: 12000, criticalCssBytes: 4096 })
const registry = createComponentRegistry().register(defineComponent({ name: 'performance-sample', render: props => `<article><h2>${props.title}</h2><p>${props.body}</p></article>` }))
const start = performance.now()
for (let i = 0; i < 1000; i++) registry.render('performance-sample', { title: `Title ${i}`, body: 'A representative server-rendered component.' }, { id: `sample-${i}` })
const serverRenderMs = performance.now() - start
const runtimeGzipBytes = gzipSync(fs.readFileSync(path.join(root, 'dist/ligature-runtime.min.js'))).byteLength
const criticalCssBytes = criticalCss('body { color: #123456; }').bytes
const measurements = { serverRenderMs, runtimeGzipBytes, criticalCssBytes, budgets }
const failures = []
if (serverRenderMs > budgets.serverRenderMs) failures.push(`server render ${serverRenderMs.toFixed(1)}ms > ${budgets.serverRenderMs}ms`)
if (runtimeGzipBytes > budgets.runtimeGzipBytes) failures.push(`runtime gzip ${runtimeGzipBytes} bytes > ${budgets.runtimeGzipBytes}`)
if (criticalCssBytes > budgets.criticalCssBytes) failures.push(`critical CSS ${criticalCssBytes} bytes > ${budgets.criticalCssBytes}`)
console.log(JSON.stringify(measurements))
if (failures.length) { console.error(`Performance budget failed: ${failures.join('; ')}`); process.exitCode = 1 }
