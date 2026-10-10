import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

test('checked-in browser runtime bundles are reproducible and within size budgets', () => {
  const result = spawnSync(process.execPath, ['scripts/runtime-bundle.js', '--check'], { encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  assert.match(result.stdout, /ligature-runtime\.js: \d+ bytes, \d+ gzipped bytes/)
  assert.match(result.stdout, /ligature-runtime\.min\.js: \d+ bytes, \d+ gzipped bytes/)
  assert.match(readFileSync('docs/CLIENT-RUNTIME.md', 'utf8'), /35,000 bytes/)
})
