import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('documentation milestone publishes the complete guide set', () => {
  const docs = file => readFileSync(new URL(`../docs/${file}`, import.meta.url), 'utf8')
  assert.match(docs('QUICKSTART.md'), /five minutes/i)
  assert.match(docs('EXAMPLE-PORTAL.md'), /server-rendered project\s+list/)
  assert.match(docs('EXAMPLES.md'), /Authentication and authorization/)
  assert.match(docs('EXAMPLES.md'), /Uploads/)
  assert.match(docs('EXAMPLES.md'), /Pagination/)
  assert.match(docs('REACT-COMPARISON.md'), /Choose React when/)
  assert.match(docs('TROUBLESHOOTING.md'), /The page is blank without JavaScript/)
  assert.match(docs('ARCHITECTURE.md'), /Decision records/)
  assert.match(docs('decisions/ADR-001-server-first.md'), /Status: accepted/)
  assert.match(docs('decisions/ADR-002-boundaries.md'), /Routes own HTTP and authorization/)
})
