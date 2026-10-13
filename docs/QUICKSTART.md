# Ligature in five minutes

This is the shortest path from an empty directory to useful server-rendered
HTML. It requires Node.js 22.13.0 or newer.

## 1. Create and run an application

```bash
npx ligaturejs create app inbox ./inbox
cd inbox
npm install
npm test
npm start
```

Open `http://localhost:3000`. The generated page is usable before JavaScript
loads; the browser runtime only adds optional behavior. In a private checkout,
use `node /path/to/ligature/src/cli.js` instead of `npx ligaturejs`.

## 2. Add one component

```js
// src/components/greeting.js
import { defineComponent } from 'ligaturejs'

export const greeting = defineComponent({
  name: 'greeting',
  props: { name: { type: 'string', required: true } },
  render({ name }) {
    return `<p>Hello, ${this.escape.text(name)}.</p>`
  }
})
```

Register it with the application registry and render it from a route. Keep
user values inside the supplied escaping helpers; component HTML is trusted
output owned by the component.

## 3. Add a route and a test

Routes own HTTP status, authorization, and input parsing. Repositories own
data access. A useful first test asserts the response status and a semantic
element, not framework-generated whitespace or IDs.

```js
app.get('/hello', (req, res) => res.type('html').send(
  registry.render('greeting', { name: 'World' })
))
```

Run `npm test` after each change. Before shipping, run `npm run release:check`;
the release gate includes schemas, dependencies, licenses, performance,
browser, accessibility, visual, and package-consumer checks.

## Where to go next

- Read the [canonical API](API.md) and [application contract](APP-CONTRACT.md).
- Run the [complete portal example](EXAMPLE-PORTAL.md).
- Follow [HOW-TO-LIGATURE.md](HOW-TO-LIGATURE.md) for repositories, migrations,
  browser lifecycle, and production deployment.
- Use [AGENT-GUIDE.md](AGENT-GUIDE.md) when delegating bounded work to an AI
  agent.
