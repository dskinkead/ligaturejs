# Ligature: AI Agent Guide

## Contract

Each component has one file and one explicit `defineComponent` contract:

- `name`: kebab-case stable identifier
- `props`: documented inputs and defaults
- `render(props, state)`: server-rendered HTML
- `mount(element, state)`: optional browser behavior
- `update(element, props, state)`: optional update behavior
- `unmount(element, state)`: cleanup behavior
- `events`: declared event names
- `styles`: component-owned CSS text or asset reference
- `client`: object-form lifecycle definition or client source
- `state`: optional initial client-state factory
- `children` and `slots`: composition metadata

## Rules

1. Never use undeclared globals.
2. Keep state inside the component instance.
3. Escape user data before inserting HTML.
4. Keep database access outside rendering; pass data as props.
5. Every component must have a stable fixture and lifecycle test.
6. Generate a manifest so agents can discover available components.
7. Client code is emitted through `componentClientSource`; never inject ad hoc page-level scripts.

## Implementation workflow

1. Read the component manifest.
2. Create or modify one component at a time.
3. Define props and events before implementation.
4. Keep server rendering deterministic and escaped.
5. Add a fixture and lifecycle test.
6. Run `npm test` before presenting the change.
7. Report changed files, behavior, tests, and rollback steps.

## Completion checklist

- [ ] Component/route/repository contract is explicit.
- [ ] User-controlled values are escaped.
- [ ] Authentication is enforced at the route boundary.
- [ ] Server and client lifecycle behavior is covered.
- [ ] A regression test exists.
- [ ] `npm test` passes.
- [ ] Migration and rollback impact are documented.

Use the CLI to scaffold new work so every agent starts with the same contracts:

```bash
node src/cli.js create component account-card ./app
node src/cli.js create route tasks ./app
node src/cli.js create repository tasks ./app
node src/cli.js create migration 001_tasks ./app
node src/cli.js create test task-flow ./app
node src/cli.js build ./app
node src/cli.js check ./app
```

Projects may define `ligature.config.json` (or `.js`/`.mjs`) with `server`,
`buildDir`, `port`, `host`, `watch`, `https`, `proxy`, and `environment`.
`https` accepts `{ "key": "tls/key.pem", "cert": "tls/cert.pem" }`;
`proxy` accepts a trusted-proxy name/boolean and an application-relative
`basePath`; `environment` supplies non-secret scalar defaults to the server
process. `PORT`, `HOST`, and `LIGATURE_BASE_PATH` remain explicit deployment
overrides. The CLI passes validated TLS/proxy settings as `LIGATURE_HTTPS_*`
variables so the server adapter can create HTTPS or honor forwarded headers;
private keys are never copied into build manifests.

`ligature dev ./app` uses Node's
built-in `--watch` restart model; it does not claim state-preserving HMR.
`ligature start ./app` runs the same server without watching and honors the
`PORT` and `HOST` environment overrides. `build` writes a content-hashed
`.ligature/build/build-manifest.json`; `check` verifies the manifest when it
exists, making CI failures deterministic and readable.

Project creation is available both non-interactively (`ligature create app
portal ./portal`) and interactively (`ligature create app`, then answer the
name and directory prompts). Existing files are not overwritten by the
scaffold's directory layout. `ligature upgrade ./portal` applies the current
framework migration set and records `.ligature/upgrade-manifest.json`; use
`ligature upgrade --check ./portal` in CI to inspect whether an upgrade is
needed without changing files.

## Navigation

Use `data-agent-outlet` for replaceable page regions and `Ligature.navigate(url)` for client navigation. The runtime unmounts outgoing components before replacement and mounts incoming components afterward.
