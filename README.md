# Ligature

An agent-oriented, server-first component system for Express applications, designed to make UI work predictable for both humans and AI agents.

## CLI

```bash
node src/cli.js create app my-portal ./my-portal
node src/cli.js create component profile-card ./my-portal
node src/cli.js test
node src/cli.js manifest
node src/cli.js check
```

## Status

Release candidate `0.1.0-rc.1`. The project is separate from the SearchMonster
portal; the portal is not modified by this project.

## Design goals

- Server-rendered HTML with optional client behavior
- Explicit component contracts
- No accidental globals
- Deterministic component metadata and client assets
- Lifecycle hooks suitable for AJAX navigation
- Machine-readable discovery for agents
- Small runtime with ordinary HTML and JavaScript output

The supported target is documented in [docs/SUPPORTED-TARGET.md](docs/SUPPORTED-TARGET.md):
server-first, progressively enhanced, HTML-oriented applications.
That document also explains the boundary with React and the application
shapes Ligature does not target.
The public API compatibility and deprecation rules are documented in
[docs/COMPATIBILITY.md](docs/COMPATIBILITY.md).
Semantic-versioning and release support windows are documented in
[docs/RELEASE.md](docs/RELEASE.md).
Feature maturity and explicit non-target statuses are documented in
[docs/FEATURE-STATUS.md](docs/FEATURE-STATUS.md).
Supported Node.js, browser, and operating-system baselines are documented in
[docs/SUPPORT.md](docs/SUPPORT.md).

## Quick start

For a five-minute first result, follow [`docs/QUICKSTART.md`](docs/QUICKSTART.md).
The shortest local smoke test is:

```bash
npm test
npm run test:browser
npm run test:a11y
npm run release:check
npm start
```

Create a distributable package:

```bash
npm pack
```

See [`docs/DISTRIBUTION.md`](docs/DISTRIBUTION.md) for installation and package contents.

The example server exposes a manifest at `/manifest.json`.

The complete example portal is documented in
[`docs/EXAMPLE-PORTAL.md`](docs/EXAMPLE-PORTAL.md). Application recipes for
authentication, uploads, pagination, authorization, and forms are in
[`docs/EXAMPLES.md`](docs/EXAMPLES.md).

## Component shape

```js
defineComponent({
  name: 'profile-card',
  props: { member: { required: true } },
  events: { select: 'profile:select' },
  render(props, state) { return '<article>...</article>' },
  mount(element, state) {},
  update(element, props, state) {},
  unmount(element, state) {}
})
```

See [`docs/AGENT-GUIDE.md`](docs/AGENT-GUIDE.md) for the agent contract.

For a complete beginner-to-production walkthrough, see
[`docs/HOW-TO-LIGATURE.md`](docs/HOW-TO-LIGATURE.md).

Before publishing publicly, follow the exhaustive
[`docs/PUBLIC-PUBLISH-PLAN.md`](docs/PUBLIC-PUBLISH-PLAN.md). The package is
prepared for publication but is not published by this release-candidate task.

Applications should also follow the four-layer contract in [`docs/APP-CONTRACT.md`](docs/APP-CONTRACT.md).

Additional references:

- [`docs/REDESIGN.md`](docs/REDESIGN.md) describes the redesigned component API and runtime.

- [`docs/COMPONENT-TEMPLATE.md`](docs/COMPONENT-TEMPLATE.md)
- [`docs/SECURITY.md`](docs/SECURITY.md)
- [`docs/ROADMAP.md`](docs/ROADMAP.md)
- [`docs/PRODUCTION.md`](docs/PRODUCTION.md)
- `index.d.ts` and `schemas/` provide editor/agent contract validation.
- [`docs/API.md`](docs/API.md) is the generated-framework API reference.
- [`docs/REACT-COMPARISON.md`](docs/REACT-COMPARISON.md)
- [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
