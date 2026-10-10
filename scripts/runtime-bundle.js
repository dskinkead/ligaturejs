import fs from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'
import { clientRuntime } from '../src/client.js'

const outputDirectory = path.resolve('dist')
const bundles = [
  { name: 'ligature-runtime.js', source: clientRuntime(), maxBytes: 35_000, maxGzipBytes: 9_000 },
  { name: 'ligature-runtime.min.js', source: clientRuntime({ minified: true }), maxBytes: 35_000, maxGzipBytes: 9_000 }
]

function measurements(bundle) {
  return { bytes: Buffer.byteLength(bundle.source), gzipBytes: gzipSync(bundle.source, { mtime: 0 }).byteLength }
}

function verify(bundle) {
  const measured = measurements(bundle)
  if (measured.bytes > bundle.maxBytes) throw new Error(`${bundle.name} is ${measured.bytes} bytes; budget is ${bundle.maxBytes}`)
  if (measured.gzipBytes > bundle.maxGzipBytes) throw new Error(`${bundle.name} is ${measured.gzipBytes} gzipped bytes; budget is ${bundle.maxGzipBytes}`)
  return measured
}

const measurementsByName = bundles.map(bundle => ({ ...bundle, measured: verify(bundle) }))
if (process.argv.includes('--check')) {
  for (const bundle of measurementsByName) {
    const file = path.join(outputDirectory, bundle.name)
    if (!fs.existsSync(file)) throw new Error(`Missing generated runtime bundle: ${file}`)
    if (fs.readFileSync(file, 'utf8') !== bundle.source) throw new Error(`${bundle.name} is stale; run npm run build:runtime`)
  }
} else {
  fs.mkdirSync(outputDirectory, { recursive: true })
  for (const bundle of measurementsByName) fs.writeFileSync(path.join(outputDirectory, bundle.name), bundle.source)
}

for (const bundle of measurementsByName) console.log(`${bundle.name}: ${bundle.measured.bytes} bytes, ${bundle.measured.gzipBytes} gzipped bytes (budget ${bundle.maxBytes}/${bundle.maxGzipBytes})`)
