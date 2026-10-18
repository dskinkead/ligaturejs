# Ligature in five minutes

This is the shortest path from an empty directory to useful server-rendered
HTML. It requires Node.js 22.13.0 or newer.

## 1. Create and run an application

```bash
npx ligaturejs create app inbox ./inbox
cd inbox
npm install
```

In a private checkout, use `node /path/to/ligature/src/cli.js` instead of
`npx ligaturejs`.

## 2. Add one component

```js
// components/greeting.js
import { defineComponent } from 'ligaturejs'

export default defineComponent({
  name: 'greeting',
  props: { name: { type: 'string', required: true } },
  render({ name }, state, context) {
    return `<p>Hello, ${context.escape.text(name)}.</p>`
  }
})
```

Keep user values inside the supplied escaping helpers; component HTML is
trusted output owned by the component.

## 3. Render it from a route

Replace the generated `src/server.js` with this minimal Node server:

```js
import http from 'node:http'
import { createComponentRegistry } from 'ligaturejs'
import greeting from '../components/greeting.js'

const registry = createComponentRegistry().register(greeting)
const server = http.createServer((req, res) => {
  if (req.method !== 'GET' || req.url !== '/hello') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const page = registry.render('greeting', { name: 'World' })
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(`<!doctype html><html lang="en"><meta charset="utf-8"><title>Hello</title><body><main>${page}</main></body></html>`)
})

server.listen(Number(process.env.PORT || 3000))
```

Run `npm start` and open `http://localhost:3000/hello`. In a real application,
keep route authorization, input parsing, and data access in their respective
application layers. Before shipping, run `npm run release:check`; the release
gate includes schemas, dependencies, licenses, performance, browser,
accessibility, visual, and package-consumer checks.

## Where to go next

- Read the [canonical API](API.md) and [application contract](APP-CONTRACT.md).
- Run the [complete portal example](EXAMPLE-PORTAL.md).
- Follow [HOW-TO-LIGATURE.md](HOW-TO-LIGATURE.md) for repositories, migrations,
  browser lifecycle, and production deployment.
- Use [AGENT-GUIDE.md](AGENT-GUIDE.md) when delegating bounded work to an AI
  agent.
