import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { createComponentRegistry, defineComponent, agentTagsMiddleware } from '../src/index.js'

test('HTTP integration serves repeatable navigation documents', async () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'page-marker', render: props => `<p>${props.label}</p>` }))
  const middleware = agentTagsMiddleware(registry)
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost')
    const page = url.pathname === '/two' ? 'two' : 'one'
    const next = () => { res.setHeader('content-type', 'text/html'); res.end(`<main data-agent-outlet>${registry.render('page-marker', { label: page }, { id: `page-${page}` })}</main>`) }
    const response = { set: () => response, json: value => res.end(JSON.stringify(value)), type: () => response, send: value => res.end(value), status: code => { res.statusCode = code; return response }, end: value => res.end(value) }
    middleware({ path: url.pathname }, response, next)
  })
  await new Promise(resolve => server.listen(0, resolve))
  const port = server.address().port
  try {
    for (const path of ['/', '/two', '/', '/two']) {
      const body = await fetch(`http://127.0.0.1:${port}${path}`).then(response => response.text())
      assert.match(body, /data-agent-outlet/)
      assert.match(body, new RegExp(path === '/two' ? '>two<' : '>one<'))
    }
  } finally { server.close() }
})
