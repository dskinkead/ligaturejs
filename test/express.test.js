import test from 'node:test'
import assert from 'node:assert/strict'
import { createComponentRegistry, defineComponent, agentTagsMiddleware, ligatureMiddleware } from '../src/index.js'

function request(path) {
  const result = { headers: {}, body: '', statusCode: 200 }
  const res = { set(name, value) { result.headers[name] = value; return this }, json(value) { result.headers.type = 'application/json'; result.body = JSON.stringify(value) }, type(value) { result.headers.type = value; return this }, send(value) { result.body = value }, status(code) { result.statusCode = code; return this }, end(value = '') { result.body = value } }
  const req = { path }
  return { result, run: middleware => middleware(req, res, () => { result.statusCode = 404 }) }
}

const registry = createComponentRegistry().register(defineComponent({ name: 'demo', render: () => '<p>demo</p>', client: '{mount(){}}' }))
const middleware = agentTagsMiddleware(registry)

test('legacy middleware name is an exact deprecated alias', () => {
  assert.strictEqual(agentTagsMiddleware, ligatureMiddleware)
})

test('middleware serves manifest and component assets', () => {
  const manifest = request('/__agent_tags/manifest.json'); manifest.run(middleware); assert.match(manifest.result.body, /"components"/); assert.match(manifest.result.body, /demo/)
  const asset = request('/__agent_tags/components/demo.js'); asset.run(middleware); assert.match(asset.result.body, /Ligature\.register/)
  assert.match(asset.result.headers['Cache-Control'], /immutable/)
  assert.match(asset.result.headers.ETag, /^"[0-9a-f]+"$/)
})
