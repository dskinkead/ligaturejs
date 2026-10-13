# How to build with Ligature

Ligature is a server-first component framework for Express applications. It
combines ordinary server-rendered HTML with explicit component contracts and
optional browser behavior. The goal is to make applications easy to build,
test, and maintain—especially when an AI agent is helping.

This guide builds a small profile application from scratch.

## 1. What Ligature provides

Ligature gives an application a predictable structure:

```text
components/    reusable UI components
routes/        HTTP/API contracts
repositories/  database boundaries
migrations/    versioned schema changes
tests/         executable behavior checks
```

A component owns presentation and its browser lifecycle. A route owns HTTP
input/output and authorization. A repository owns persistence. Rendering code
receives data; it does not execute SQL.

## 2. Prerequisites

- Node.js 22.13.0 or newer is required.
- npm
- A terminal
- Chromium is needed for Playwright browser tests.

From this repository:

```bash
cd /path/to/ligaturejs
npm install
npm test
```

The release candidate can be installed from a local checkout or package tarball.
No npm login or external service is required.

## 3. Run the included example

Start the reference project tracker:

```bash
cd /path/to/ligaturejs
npm start
```

Open:

```text
http://localhost:4177
```

The example demonstrates projects, tasks, SQLite persistence, components,
browser behavior, and machine-readable metadata. Stop it with `Ctrl+C`.

Run its browser checks separately:

```bash
npm run test:playwright
```

## 4. Scaffold a new application

Use the CLI to create a separate app:

```bash
node src/cli.js \
  create app learning-app /tmp/learning-app

cd /tmp/learning-app
npm install
npm test
npm start
```

The generated app includes a server entrypoint, package scripts, an agent
guide, source directories, and a local Ligature runtime dependency.

Useful generated commands:

```bash
npm test
npm start
```

Add framework artifacts from the Ligature repository:

```bash
node /path/to/ligaturejs/src/cli.js \
  create component profile-card /tmp/learning-app
node /path/to/ligaturejs/src/cli.js \
  create route profiles /tmp/learning-app
node /path/to/ligaturejs/src/cli.js \
  create repository profiles /tmp/learning-app
node /path/to/ligaturejs/src/cli.js \
  create migration 001_profiles /tmp/learning-app
```

## 5. Create a component

A component has a stable name and explicit contract:

```js
import { defineComponent } from 'ligaturejs'

export const profileCard = defineComponent({
  name: 'profile-card',
  props: {
    profile: { required: true, type: 'object' }
  },
  render({ profile }) {
    const name = escapeHtml(profile.name)
    const role = escapeHtml(profile.role)
    return `<article data-component="profile-card">
      <h2>${name}</h2>
      <p>${role}</p>
    </article>`
  },
  client: {
    mount(element) {
      element.querySelector('h2')?.addEventListener('click', () => {
        element.dispatchEvent(new CustomEvent('profile:select', {
          bubbles: true,
          detail: { id: element.dataset.id }
        }))
      })
    }
  }
})
```

In real code, import or define an escaping helper appropriate to your app; do
not interpolate untrusted values directly into HTML. A component should not
query the database. Pass the profile as a prop.

Register it in a component registry:

```js
const registry = createComponentRegistry()
  .register(profileCard)
```

Render an instance on the server:

```js
const html = registry.render('profile-card', {
  profile: { id: 7, name: 'Ada', role: 'Engineer' }
}, { id: 'profile-7' })
```

The instance metadata lets the browser runtime mount and clean up the correct
component instance.

## 6. Add a repository

Repositories are the only application layer that should know persistence
details:

```js
export function createProfileRepository(db) {
  return {
    list() {
      return db.prepare(
        'SELECT id, name, role FROM profiles ORDER BY name'
      ).all()
    },
    find(id) {
      return db.prepare(
        'SELECT id, name, role FROM profiles WHERE id = ?'
      ).get(id)
    },
    create(input) {
      const result = db.prepare(
        'INSERT INTO profiles (name, role) VALUES (?, ?)'
      ).run(input.name, input.role)
      return this.find(result.lastInsertRowid)
    }
  }
}
```

Keep validation at the route boundary and use parameterized queries in the
repository. Wrap related writes in a transaction when more than one table is
changed.

## 7. Add a route

A route validates input, checks authorization, calls a repository, and returns
a deliberate response:

```js
app.get('/api/profiles', async (req, res) => {
  const profiles = await profilesRepository.list()
  res.json({ data: profiles })
})

app.post('/api/profiles', async (req, res) => {
  const input = validateProfile(req.body)
  const profile = await profilesRepository.create(input)
  res.status(201).json({ data: profile })
})
```

For production applications, enforce authentication and CSRF protection at
the route boundary for cookie-authenticated writes. Return structured errors;
never expose stack traces or secrets to clients.

## 8. Add a migration

A migration should have an identifier, an `up` operation, and a reversible
`down` operation:

```js
export const migration = {
  id: '001_profiles',
  description: 'Create profiles',
  up(db) {
    db.exec(`CREATE TABLE profiles (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      role TEXT NOT NULL
    )`)
  },
  down(db) {
    db.exec('DROP TABLE profiles')
  }
}
```

Run migrations before serving requests. Test both applying and rolling back a
migration. Never edit an already-applied migration; add a new migration.

## 9. Connect the browser lifecycle

Declare client behavior through the component contract. Avoid page-level
inline scripts and accidental globals. Load generated component assets through
the Ligature middleware and mount after the asset is available.

For replaceable page regions:

```html
<main data-agent-outlet="main"></main>
```

Navigate with the runtime:

```js
await Ligature.navigate('/profiles')
```

Ligature unmounts outgoing component instances before replacing the outlet and
mounts incoming instances afterward. Use `unmount` to remove event listeners,
observers, timers, and subscriptions.

## 10. Test in layers

Run the smallest relevant check while developing:

```bash
npm test
```

Then run browser behavior:

```bash
npm run test:playwright
```

Run accessibility checks:

```bash
npm run test:a11y
```

Run the release gate:

```bash
npm run release:check
```

A useful minimum for every feature is:

1. Repository test for persistence behavior.
2. Route test for validation and error responses.
3. Component test for escaped rendering and props.
4. Browser test for the user-visible workflow.

## 11. Let an AI agent work safely

Give an agent one bounded feature request and require it to:

1. Read the application manifest and relevant contracts.
2. Identify the component, route, repository, and migration boundaries.
3. Make the smallest coherent change.
4. Add or update tests before claiming completion.
5. Run `npm test`, browser tests, and the project contract check.
6. Report changed files, behavior, test results, and rollback steps.

Useful discovery commands:

```bash
node src/cli.js manifest
node src/cli.js check
find components routes repositories migrations test -maxdepth 2 -type f
```

Do not give an agent credentials or unrelated private application data. Keep
production deployment separate from development changes until the checks pass.

## 12. Production checklist

Before deployment, confirm:

- Production secrets are supplied by a managed secret mechanism.
- TLS and a reverse proxy are configured.
- Authentication and authorization are enforced.
- CSRF protection covers cookie-authenticated writes.
- Database migrations have a rollback plan.
- Backups have been restored successfully in staging.
- Health and readiness endpoints are monitored.
- Dependency and accessibility checks pass.
- Logs contain request correlation IDs but no secrets.
- Privacy, retention, and data deletion rules are documented.

For the framework’s release and publication plans, see
[`DISTRIBUTION.md`](DISTRIBUTION.md), [`RELEASE.md`](RELEASE.md), and
[`PUBLIC-PUBLISH-PLAN.md`](PUBLIC-PUBLISH-PLAN.md).
