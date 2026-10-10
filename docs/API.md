# API Reference

For snapshot and semantic tests of server-rendered component trees, see
[`docs/TESTING.md`](TESTING.md). Snapshots cover the complete deterministic HTML
contract; semantic tests cover user-visible structure without coupling tests to
framework-generated metadata.

## Core

- `frameworkTarget` — immutable machine-readable description of Ligature's
  supported application target.
- `frameworkSupport` — immutable machine-readable support matrix for server
  runtimes, browsers, operating systems, and CI coverage; see
  [`docs/SUPPORT.md`](SUPPORT.md).
- `frameworkCompatibility` — immutable machine-readable summary of the
  compatibility and deprecation policy in
  [`docs/COMPATIBILITY.md`](COMPATIBILITY.md).
- `frameworkRelease` — immutable machine-readable SemVer and maintenance-window
  policy in [`docs/RELEASE.md`](RELEASE.md).
- `frameworkFeatureStatus` — immutable machine-readable feature maturity matrix
  in [`docs/FEATURE-STATUS.md`](FEATURE-STATUS.md).
- `defineComponent(definition)` — validates and freezes a component contract.
- `createContext(name, defaultValue)` — creates an identity-based dependency
  token for scoped server rendering.

### Server-rendered bolts

`defineBolt` and `createBoltRegistry` provide reusable server-rendered
fragments for page sections such as services, media, or site summaries. Bolts
are explicitly registered and receive data plus a scoped context:

```js
const bolts = createBoltRegistry()
bolts.register(defineBolt({
  name: 'services',
  render(data, context) {
    return `<ul>${data.items.map(item => `<li>${context.escape.text(item)}</li>`).join('')}</ul>`
  }
}))
```

Inside a bolt, `context.bolt(name, data)` renders a registered nested bolt.
Bolt renderers must return HTML strings; failures throw `BoltRenderError` with
the bolt name. Use the supplied escaping helpers for data. Explicit
registration replaces dynamic module loading and makes bolt metadata and tests
deterministic.

For template-oriented fragments, a bolt may use `template` instead of
`render`:

```js
defineBolt({
  name: 'visit-stat',
  template: '<strong>{{data.count}}</strong><span>{{data.title}}</span>'
})
```

Templates support only dotted `data` paths. Values are HTML-escaped by default,
missing values render as empty strings, and executable expressions are rejected
with `BoltTemplateError`.

The public declaration exposes `BoltDefinition` as a discriminated union:
renderer bolts have `render`, template bolts have `template`, and both include
the normalized name, version, and props metadata. `createBoltRegistry()` returns
a typed `BoltRegistry`; `register()` is chainable and `manifest()` returns
versioned `BoltManifestEntry` records suitable for tooling. The corresponding
machine-readable metadata contract is in `schemas/bolt.schema.json`.

### Canonical component contract

`defineComponent` accepts one object with these canonical fields: `name` (a
kebab-case identifier), `version`, `props`, `events`, `styles`, `client`,
`state`, `children`, `slots`, `render`, and the optional `mount`, `update`, and
`unmount` hooks. `css` is a deprecated compatibility alias for `styles`; new
components must use `styles`. If both are supplied, they must be identical.

### Deprecated names

The following names remain available for compatibility but must not be used in
new code:

| Deprecated name | Canonical name | Migration |
| --- | --- | --- |
| `css` component definition field | `styles` | Rename `css` to `styles`; when both are present they must have identical values. |
| `agentTagsMiddleware(registry)` | `ligatureMiddleware(registry)` | Rename the import and call; behavior and options are unchanged. |

These aliases do not emit runtime warnings because middleware and rendering
must not write unexpected output. They remain supported through the next major
release under the deprecation policy in [`COMPATIBILITY.md`](COMPATIBILITY.md).

The returned component is normalized and deeply frozen, including prop rules and
composition metadata. Definitions fail immediately when metadata has the wrong
shape, a prop type is unsupported, a lifecycle hook is not a function, or
duplicate slots are declared.

### Prop contract

Each `props` entry may declare `type` (`string`, `number`, `boolean`, `object`,
`array`, or `null`), `required`, `default`, and opt-in `coerce` behavior:

- `required: true` rejects missing and `null` values. A default satisfies the
  requirement, but a required default may not be `null`.
- `default` is checked against the declared type when the component is defined.
  Array and plain-object defaults are cloned for each validation result.
- `coerce: true` enables only predictable primitive conversions: values become
  strings with `String`, non-empty finite numeric strings become numbers, and
  boolean values accept `true`/`false` strings or `1`/`0`. Objects, arrays, and
  `null` are never coerced. Coercion requires a declared type and is opt-in.
- `validateProps(component, props)` returns a fresh normalized object, preserving
  undeclared props for compatibility. The registry validates before rendering and
  serializes the normalized values in `data-agent-props`.

Validation failures throw `PropValidationError`, whose `component` field names
the component and whose immutable `issues` array contains `name`, `code`,
`expected`, `received`, and `message` fields. Multiple invalid props are
reported together so callers can produce useful boundary errors.

### Typed props and generated schemas

`PropsFromRules` in `index.d.ts` derives the render/update prop type from the
same `props` rules passed to `defineComponent`. Required props and props with a
default are required in the normalized render value; other declared props are
optional, and their primitive types follow the rule's `type`.

`componentSchema(component)` generates an immutable JSON Schema for the
normalized component's props. It includes declared types, JSON-compatible
defaults, required props without defaults, and `x-ligature-coerce` metadata.
Undeclared properties remain allowed because `validateProps` preserves them for
compatibility. Non-JSON defaults are rejected when a schema is generated.

`componentMetadata(component)` generates the immutable, executable-free
`ligaturejs.component-metadata.v1` contract for generators and editor tooling.
It includes the normalized props, event map, named slots, lifecycle capability
list, and the same generated prop schema. `ComponentEventMap`,
`ComponentSlotName`, and `ComponentTypes` in `index.d.ts` derive corresponding
editor types from a component definition.

- `createComponentRegistry()` — registers, renders, and describes components.
- `bundleStyles(definitions)` — deterministically scopes, orders, deduplicates,
  and describes component CSS bundles; see [`STYLING.md`](STYLING.md).
- `ligatureMiddleware(registry)` — Express asset/manifest middleware.
- `defineRoute(definition)` — declares an authenticated/validated route contract;
  paths support `:params` and a final `*` wildcard. `matchRoute` decodes those
  parameters, while `createRouter(routes)` supplies `req.params` and repeated
  query keys as arrays before handing the matched route to the next middleware.
  Routes may provide a `loader(details)` for read data, an `action(details)` for
  unsafe methods, `authorize(details)` for domain authorization, and `layout`
  or `layouts` wrappers. A loader runs after authentication and before the
  handler; its value is available as `details.data`. Layouts run inside-out
  around the handler result. `errorBoundary({ error, req, res })` may return a
  safe response for route failures.
- `redirect(location, status)` — creates a header-safe 301/302/303/307/308
  response result (303 is the default for form actions). Route handlers may
  return `{ status, headers, body }` for explicit status and content.
- `signReturnTo(location, secret, options)` / `verifyReturnTo(token, secret,
  options)` — create and verify short-lived HMAC-SHA256 tokens for
  application-relative return paths. Verification returns `null` for bad or
  expired tokens; callers should fall back to a local default. Tokens do not
  make arbitrary external URLs safe and the secret must remain server-only.
- `signedRedirect(location, secret, options)` — returns a redirect to an
  explicitly supplied continuation endpoint (default `/continue`) with a
  signed `returnTo` query parameter. `endpoint`, `parameter`, `status`,
  `ttlSeconds`, and a test-only `now` may be supplied. `signRedirect` and
  `verifyRedirect` are compatibility aliases for the return-to helpers.
- `defineRepository(definition)` — declares a repository boundary.
- `withTransaction(adapter, work)` — commit/rollback transaction wrapper.
- `defineMigration(definition)` — reversible migration contract.
- `createApplicationManifest(input)` — versioned application metadata.
- `createRouteHandler(route, context)` — validated route handler with error
  boundary, route middleware, decoded params, and parsed query input. A router
  returns JSON 404/405 responses and an `Allow` header deterministically.
- Route responses can provide `{ html, partial, body, status, headers }`.
  `Accept: text/html` selects `html`, while `Accept: text/partial` (or
  `X-Ligature-Partial: true`) selects `partial`; JSON remains the default.
- `csrfToken(session)` / `verifyCsrf(session, token)` — CSRF protection primitives.
- `releaseReport(directory)` — contract and dependency release report.

## Server rendering contract

For progressive response delivery, see
[`docs/PROGRESSIVE-RENDERING.md`](PROGRESSIVE-RENDERING.md). The current
renderer returns complete HTML strings; it does not provide a native streaming
API.

`registry.render(name, props, options)` is deterministic for the same
component tree, props, and options. When `options.id` is omitted, Ligature
assigns a stable `${component-name}-${render-order}` instance ID. Nested
components receive IDs in depth-first render order, and the generated
`data-agent-component`, `data-agent-instance`, `data-agent-hydrate`,
`data-agent-markup`, and `data-agent-props` attributes are the browser mount
markers. `data-agent-instance`
is stable within a rendered tree; explicit `options.id` values are required to
avoid collisions when independently rendered fragments are combined.
Ligature also emits `data-agent-markup`, a deterministic non-security signature
of the component's inner HTML. A client definition may provide `render(state)`
to return the markup it expects before enhancement; the runtime compares its
signature during hydration. On drift it sets `data-agent-mismatch="true"` and
reports a `MarkupMismatchError` through `onMarkupMismatch(error, element, state)`
when supplied, otherwise it logs the error and continues without replacing the
server HTML. The comparison is diagnostic only and never overwrites server
output.
For client components, `options.hydrate` selects the island activation policy:
`eager` (or the backwards-compatible `true` default) mounts during the initial scan, `idle` waits for an idle
callback (with a two-second timeout), `visible` waits for an intersection with
the viewport, and `manual` never mounts during automatic scans. `true` is an
alias for `eager`, while `false` is an alias for `manual`. The browser runtime
exposes `Ligature.hydrate(element)` for a manual marker. Server-only components
always emit `data-agent-hydrate="false"` and remain useful HTML without a
client asset.

Client definitions may also provide `enhance(element, state)`. The runtime
calls this hook with the server-rendered element and serialized props before
registering the instance or calling `mount`. It must enhance the existing DOM
in place; it must not assume that the server markup was rendered again. This is
the progressive-enhancement path and is optional: disabling JavaScript still
leaves the server-rendered HTML available. Errors are routed through the same
component error-boundary behavior as mount failures.

### HTML serialization and attributes

`registry.render()` returns a complete component wrapper as an HTML string. The
component's `render` result is trusted component HTML; values placed in markup
by application code must use the context escaping helpers described below.
Framework-generated component, instance, hydration, and props attributes are
serialized with HTML attribute escaping. `options.data` adds application
metadata as `data-*` attributes using these rules:

- keys are camel-case normalized to lowercase kebab-case (for example,
  `requestId` becomes `data-request-id`) and must contain only letters,
  digits, and hyphens after normalization;
- attributes are emitted in sorted normalized-key order for repeatable output;
- `null` and `undefined` values are omitted; strings, booleans, and finite
  numbers are serialized with `String()` and escaped for a quoted attribute;
- arrays, objects, non-finite numbers, and other values are rejected with a
  `TypeError` rather than being silently coerced.

The renderer always uses quoted attribute values and emits no boolean-style
`data-*` shorthand. This makes server output stable for snapshots and safe to
parse consistently across HTML consumers.

### Async client loading

For a component whose browser behavior is expensive or split into a separately
loaded module, the `client` object may provide `load`, `loading`, and `error`:

```js
client: {
  load: () => import('./editor-client.js').then(module => module.default),
  loading: '<p>Loading editor…</p>',
  error: '<p role="alert">Editor unavailable.</p>'
}
```

`load()` runs in the browser and must resolve to a client definition object
(for example, one containing `mount`, `update`, and `unmount`). The runtime
shares one promise for all instances of the component name. While it is
pending, `loading` replaces the component contents; on rejection, `error`
replaces them. These strings are trusted component HTML and must be authored
with the same escaping and accessibility care as `render` output. If `error`
is omitted, the component's client `errorBoundary` handles the failure; an
invalid loader result or non-string fallback throws a descriptive error.
Hydration/mount scans include the supplied root element and its descendants;
missing component or instance markers are reported as invalid Ligature markup.

Use explicit `options.id` values when independently rendered fragments will be
concatenated into one document; each top-level render starts its order at zero.
Component `render` functions should remain pure: database access, time, and
randomness belong outside rendering and should be passed as props.

The third `render(props, state, context)` argument is a per-instance,
server-only context. It contains the component `name`, resolved `instanceId`,
read-only shallow copies of `children` and `slots`, and `context.render()` for
registered child components. The context and its `children`/`slots` maps are
frozen; child rendering shares the parent deterministic depth-first ID scope.
`children` and `slots` values are trusted HTML fragments supplied by the
application and are not escaped by Ligature. Components may declare named
`children` (fallback fragments) and `slots` (an array of accepted names), with
optional `slotFallbacks` fragments. Use `context.child(name, scope)` and
`context.slot(name, scope)` to resolve them: a supplied string wins, a supplied
function receives a frozen shallow scope object, and the declared fallback is
used when no fragment was supplied. Missing names resolve to an empty string.
This makes slot scope explicit without making components depend on mutable
global state. Fragment functions must return HTML strings and all fragments are
trusted; escape user-controlled values before passing them as content.

### Error boundaries and fallback rendering

Components may provide `errorBoundary(error, props, state, context)`, which
must return an HTML string. The registry calls it when that component's
`render` function or a synchronous descendant render throws. The fallback is
trusted component HTML and receives the original error, so applications should
log the error outside the returned markup and expose only safe, user-facing
text. Without a boundary, the original error is re-thrown; a non-string
fallback is rejected. Boundary functions should not throw, and should not
include `error.stack` or other sensitive diagnostics in HTML.

Client components may define the same-named `errorBoundary(error, element,
state)` hook in their `client` object. Mount and update failures are routed to
the nearest mounted ancestor boundary (or the failing component's own
boundary), and a returned string replaces that boundary element's contents.
Unbounded client failures still throw. Unmount failures are not replaced,
because the element is being removed and cannot reliably display a fallback.

Every client lifecycle or async-load failure is normalized to a
`LigatureRuntimeError` with `component`, `location`, `phase`, and `cause`
properties. `location` is a deterministic DOM path such as
`main:nth-of-type(1) > section:nth-of-type(2)` and identifies the failing
component element. A client definition may provide `onError(error, element,
state)` to receive the diagnostic before boundary handling; the hook should
send it to the application's telemetry system without putting stack traces in
user-visible HTML. Unmount failures are reported to `onError` and the console
because their DOM is already being removed.

### Runtime diagnostics and delivery modes

`clientRuntime({ development: true })` enables a bounded in-memory diagnostic
buffer for runtime errors and markup mismatches. The browser API exposes
`Ligature.diagnostics.get()`, `.clear()`, and `.enabled`; applications may set
`Ligature.onDiagnostic(entry)` to forward entries to development tooling. The
buffer retains at most 100 entries and is disabled by default. Production can
request `clientRuntime({ minified: true })` to emit the same runtime with
insignificant whitespace removed. The Express middleware accepts these options
as `options.runtime`.

### Context providers and consumers

`createContext(name, defaultValue)` creates an immutable, identity-based
dependency token. The name is a kebab-case diagnostic label; the default value
is returned when no provider is in scope. A component consumes a value with
`context.consume(token)` and can provide a value for a synchronous descendant
render with `context.provide(token, value, () => context.render(...))`:

```js
const locale = createContext('locale', 'en-US')
const provider = defineComponent({
  name: 'localized-panel',
  props: { locale: { type: 'string' } },
  render: ({ locale: value }, _, context) =>
    context.provide(locale, value, () => context.render('panel'))
})
```

The registry also accepts root providers as `options.providers`, a `Map` whose
keys are contexts and values are dependencies. Providers are inherited by
nested `context.render()` calls; an inner provider shadows only the duration
of its callback and the previous value is restored afterward. Context values
are not serialized into HTML, are identity-based rather than string-keyed, and
the callback must be synchronous. This keeps request dependencies scoped to a
render tree without introducing a global store; pass request-specific values
through `providers` at the request boundary.

## Parent/child lifecycle ordering

Nested client components use deterministic depth-first lifecycle ordering. A
mount scan visits each component element in document order, so a parent
component's `mount(element, state)` hook runs before the hooks of its nested
children. Unmounting uses the reverse of that same order: the deepest mounted
child is unmounted before its parent. This applies to explicit `unmount`, DOM
removal observed by `MutationObserver`, and navigation/replacement cleanup.

The ordering lets parents establish containers or event boundaries before their
children initialize, and lets children release references before a parent
tears down shared DOM. A hook should only manage the element and state passed
to it; hooks must not depend on sibling order or on a child still being mounted
while the parent unmount hook runs. Components that are not marked for client
hydration (`data-agent-hydrate="false"`) do not participate in client
lifecycle ordering.

### Lifecycle transaction semantics

The runtime treats a client instance as mounted before it calls `mount`, so a
mount hook may use scoped refs or call other runtime APIs for its own element.
If `enhance` or `mount` throws, the instance is removed immediately, refs are
released, and its `unmount` hook is attempted as best-effort cleanup before the
error is sent to the nearest error boundary (or re-thrown). A failed mount is
therefore never left in the mounted registry.

`state()` creates an isolated local state snapshot for each mounted instance.
The runtime keeps props and local state separate: `Ligature.update(element,
props)` changes props without overwriting local state, while
`lifecycle.setState(patch)` accepts a partial object or updater function and
calls `update(element, props, nextState)` synchronously. State snapshots are
shallow-frozen; update hooks must return or render from the supplied snapshot,
not mutate it. A failed update does not commit the new state or serialized
props. Each mounted client instance receives a third `lifecycle` argument with
an `AbortSignal`, `setState`, and a `listen(target, type, handler, options)`
helper. Use the signal for cancellable work such as `fetch` and use `listen`
for DOM listeners:

```js
update(element, props, state) {
  element.querySelector('[data-count]').textContent = String(state.count)
}

mount(element, state, lifecycle) {
  lifecycle.listen(element, 'click', () =>
    lifecycle.setState(current => ({ count: current.count + 1 })))
fetch('/api/items', { signal: lifecycle.signal }).then(updateItems)
}
```

For expensive values derived from local state or props, use the
instance-scoped `lifecycle.derive(key, compute, dependencies)` helper. The
compute function runs once for a key until the dependency array changes by
`Object.is` comparison. Keys and caches belong to the mounted instance, so
components must not share derived caches through module globals. Dependencies
must be explicit and the compute function must be pure; the returned value is
not automatically cloned or frozen. A failed update does not commit state,
but a derived computation performed during that failed hook may remain cached,
which is why impure computations are unsupported.

### Shared application state

When multiple components need the same client-side state, create an explicit
store and pass that store to the components that use it. `createStore` does
not register stores globally, so applications choose the store's ownership and
scope (for example, one store per page or per request-created browser app).
Its `state` snapshots are shallow-frozen. `update` accepts a partial object or
an updater function receiving a read-only snapshot, and notifies subscribers
synchronously with the new snapshot. `subscribe` returns an unsubscribe
function; `reset` restores the original shallow snapshot.

```js
const cart = Ligature.createStore({ items: [], total: 0 })

const stop = cart.subscribe(state => {
  document.querySelector('[data-cart-count]').textContent = String(state.items.length)
})
cart.update(state => ({ total: state.items.reduce((sum, item) => sum + item.price, 0) }))
// Call stop() when the owning page/app is disposed.
```

Stores are client-side coordination helpers, not a replacement for server
authority. Keep authoritative data and mutations on the server, and use
explicit request/session boundaries when a store is initialized from server
data. Components may subscribe in `mount` and unsubscribe in `unmount` (or
retain the cleanup returned by `subscribe`); Ligature does not implicitly
subscribe every component or create a mandatory global store.

### Optimistic updates and rollback

`createOptimistic(initialState)` coordinates one client mutation whose result
is expected from a server. `update(updater, mutation)` publishes the updater's
result immediately with `state.pending === true`, then calls `mutation` with
that optimistic value. A mutation may return authoritative replacement data;
when it returns `undefined`, the optimistic value is retained. A rejected
mutation restores the snapshot from before the update, publishes the error,
and rethrows it. Updates are deliberately serialized: overlapping updates are
rejected so a rollback cannot silently erase another mutation. `rollback(error)`
is an explicit error publication helper and does not change `state.data`.

```js
const todos = Ligature.createOptimistic(serverTodos)
await todos.update(
  current => [...current, draftTodo],
  next => fetch('/todos', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken, 'Content-Type': 'application/json' },
    body: JSON.stringify(draftTodo)
  }).then(response => response.ok ? response.json() : Promise.reject(new Error('Save failed')))
)
```

This helper does not send requests, add CSRF tokens, or decide authorization;
the mutation remains responsible for the server protocol. Treat a successful
server response as authoritative and revalidate dependent resources when the
server may have changed more than the optimistic snapshot.

The runtime size budget is 35,000 raw bytes and 9,000 gzip bytes for each
generated browser bundle; the additional budget covers this helper while
keeping accidental runtime growth visible in `npm run check:runtime`.

### Async resource state

`createResource(loader, options)` models one client-side asynchronous value.
Its frozen `state.status` is always one of `idle`, `loading`, `success`,
`error`, or `stale`; `state.data` and `state.error` carry the last value and
failure where available. `load()` starts the loader and returns its promise.
The first load is `loading`; a reload with data is `stale` so existing data can
remain visible while it refreshes. `subscribe` receives each transition,
`invalidate()` marks data stale without starting a request, and `reset()`
returns to idle. Calling `load()` while a request is pending reuses that
promise. After invalidation or reset, a late result is ignored, so an older
request cannot overwrite newer resource state.

```js
const profile = Ligature.createResource(
  () => fetch('/api/profile').then(response => response.json()),
  { initialData: serverProfile }
)
const stop = profile.subscribe(state => {
  renderProfile(state.data, state.status, state.error)
})
await profile.load()
// stop() belongs in the owning component's unmount cleanup.
```

Resources coordinate client reads; they do not cache across page requests,
replace server authorization, or submit mutations. Keep mutation authority on
the server and call `invalidate()` after a successful server action.

`createResourceCache()` is an explicit named-resource coordinator for a page
or browser application. `resource(key, loader, options)` deduplicates resource
instances, while `invalidate(key)` marks one (or all) resources stale and
`revalidate(key)` loads one (or all) resources. It has no module-global state;
the application owns its cache lifetime.

`createStateInspector()` is a framework-neutral inspection hook. Track a store
or resource with `track(name, source)`, read the frozen `state` snapshot, and
subscribe to snapshots for devtools, logging, or tests. It observes only the
explicit sources supplied by the application and creates no global registry.

### Server actions and CSRF

`defineAction({ name, method, auth, input, status, handle })` describes a
server mutation or other request operation. `createActionHandler(action,
context)` creates an Express-compatible handler that validates declared input,
runs optional authentication, and requires the session-bound CSRF token for
unsafe methods by default. GET and HEAD actions do not require CSRF. The
handler returns JSON and maps unexpected failures to a generic 500 response;
applications may return `{ body, status, headers }` for an explicit response.
Authorization remains application-owned: set `auth: true` and provide
`authenticate`, and keep domain authorization in the action itself.

```js
const saveProfile = defineAction({
  name: 'profile.save', method: 'POST', auth: true,
  input: { email: 'string' },
  handle: ({ input, user }) => profiles.update(user.id, input)
})
app.post('/profile', createActionHandler(saveProfile, { authenticate }))
```

### Route forms and nested application shells

For a traditional HTML form, use a POST route with `action` and include the
session-bound `csrfToken(session)` in a hidden `_csrf` field. The route handler
does not silently bypass CSRF: compose `csrfMiddleware()` before the route, or
use `createActionHandler`, which applies the same check automatically for every
unsafe method. Return `{ html, body, status }` to serve both a browser document
and a JSON client according to `Accept`.

`layout` is useful for one shell; `layouts` applies multiple wrappers from the
innermost declaration outward. Layouts receive the authenticated route context
and `{ result, next }`, so they can add navigation, partial fragments, or page
metadata without global state. Keep authorization in `authorize` or the
repository boundary and never infer it from a layout or client request header.

### Form state

`createForm(initialValues, options)` tracks a form's shallow values and
initial values without taking ownership of HTTP transport. Its frozen `state`
contains `values`, `initialValues`, `touched`, `errors`, `dirty`,
`submitting`, and `submitted`. `set(name, value)` updates a value and clears
the submitted flag; `touch` records field interaction. An optional synchronous
`validate(values)` returns an errors object. `submit()` validates first, returns
`false` without calling `onSubmit` when errors exist, and otherwise awaits the
optional `onSubmit(values)`, returning `true` on success. A rejected submission
is exposed as `errors._form` and is rethrown. `reset(values)` clears errors,
touched state, and submission state. `subscribe` receives each state change.

```js
const form = Ligature.createForm({ email: '' }, {
  validate: values => values.email.includes('@') ? {} : { email: 'Invalid email' },
  onSubmit: values => fetch('/profile', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
    body: JSON.stringify(values)
  })
})
form.set('email', input.value)
form.touch('email')
if (await form.submit()) form.reset(form.state.values)
```

The form helper does not serialize, authenticate, or mutate server data. Use
the server-side `csrfToken`/`verifyCsrf` or `csrfMiddleware` contract for
unsafe requests, and treat the server response as authoritative. Form values
are shallow snapshots; applications should use `updateIn` or replace a value
when editing nested data.

### Immutable updates

Ligature state follows a shallow-snapshot convention: `state()` snapshots,
store snapshots, and values passed to update hooks are frozen at their root,
but nested values are not copied automatically. Update helpers must be pure:
they receive the current value, return a replacement, and must not mutate the
input. Use `updateIn(value, path, updater)` when changing an existing nested
object or array. It clones and freezes each container along the path, preserves
untouched references, and rejects missing paths. An empty path updates the root.

```js
const next = Ligature.updateIn(state, ['profile', 'name'], name => name.trim())
store.update({ profile: next.profile })
```

Use ordinary object/array spreads when replacing several fields at one level.
Do not mutate snapshots, retain mutable references as shared state, or use
`updateIn` for server-authoritative data; submit a server action and revalidate
that data instead. The helper is available from the package and as
`window.Ligature.updateIn` in the generated client runtime.

```js
update(element, props, state, lifecycle) {
  const visible = lifecycle.derive(
    'visible-items',
    () => state.items.filter(item => item.category === state.category),
    [state.items, state.category]
  )
  element.querySelector('[data-count]').textContent = String(visible.length)
}
```

The runtime removes every listener registered through `listen` and aborts the
instance signal before calling `unmount`. This applies to explicit unmount,
observed DOM removal, replacement, and navigation. Work that ignores the
signal, or listeners attached directly with `addEventListener`, remains the
component's responsibility and cannot be cancelled by Ligature.

### Event delegation and component events

Lifecycle contexts also provide `delegate(target, type, selector, handler,
options)`. It installs one listener on `target`, calls `handler(event,
matchedElement)` for the nearest matching descendant, and removes the listener
with the component's other lifecycle listeners. A match outside `target` is
ignored.

Components declare public event names in the server definition:

```js
events: { select: 'profile:select' },
client: {
  mount(element, state, lifecycle) {
    lifecycle.delegate(element, 'click', '[data-select]', (event, button) => {
      lifecycle.emit('select', { id: button.dataset.select })
    })
  }
}
```

`emit(name, detail, options)` only accepts a declared event name and dispatches
a bubbling, cancelable `CustomEvent` using the declared DOM event name. The
detail value is application data and is not serialized into server HTML.
Unknown event names throw. Delegated listeners and emitted events are scoped
to the mounted instance and are cleaned up on unmount.

### Focus and keyboard helpers

The browser runtime provides small, scoped helpers for accessible interaction:

```js
mount(element, state, lifecycle) {
  lifecycle.focusTrap(element, { onEscape: () => closeDialog() })
  lifecycle.keys(element, {
    Enter: (event) => { submit(); return false },
    Escape: () => closeDialog()
  })
  lifecycle.focusFirst(element)
}
```

`focus(element, options)` focuses a connected element and returns whether it
became active; `focusFirst(root, options)` focuses and returns the first visible,
enabled keyboard-focusable descendant, or `null`. `keys(target, handlers)`
dispatches `keydown` events by `event.key`; a handler returning `false` prevents
the browser default. `trapFocus(container, options)` cycles `Tab` and
`Shift+Tab` within the container, optionally calls `onEscape`, and focuses the
first control by default. Pass `initialFocus: false` to suppress that initial
focus. All lifecycle variants are cleaned up during unmount; the equivalent
`Ligature.focus`, `Ligature.focusFirst`, `Ligature.keys`, and
`Ligature.trapFocus` runtime methods return explicit cleanup functions where
applicable. These helpers do not replace semantic HTML, visible focus styles,
or application-specific keyboard patterns.

Unmount is idempotent and always removes the instance and releases refs. Nested
instances are still cleaned up child-first even when an individual `unmount`
hook throws; cleanup errors are reported to the console because the element is
already being removed and cannot reliably render a fallback.

### Dynamic DOM insertion and removal

The default browser observer (`observe(document)`) reconciles each mutation
batch against the final DOM. Added component subtrees are scanned in document
order after detached subtrees are unmounted; nested mutation records are
deduplicated. A node that is added and removed within one batch is never
mounted. Moving an already-mounted subtree within the observed root preserves
its instance and does not remount it. Removed nested instances are cleaned up
child-first, matching explicit `unmount` behavior. Pending idle or visible
hydration also checks connectivity before mounting, so detached nodes cannot
run lifecycle hooks later.

### Partial updates preserve form state

`Ligature.replace(root, next)` and `Ligature.navigate(url, target)` preserve
current form values and the focused control while replacing a DOM region. The
runtime matches controls by `data-agent-field` first, then `id`, then `name`.
Use a unique `data-agent-field` when a region contains repeated controls. Text
inputs and textareas retain their selection/caret when the replacement still
contains the matching control; checkboxes and radios retain checked state.
Disabled and file inputs are not restored. This is client convenience for
partial updates, not a substitute for server validation or persisted data.

### Navigation lifecycle and scroll restoration

`Ligature.navigate(url, target, options)` fetches the next document's
`[data-agent-outlet]`, unmounts the old outlet, and mounts the replacement.
`options.history` is `push` (the default), `replace`, or `pop`; application
code normally uses `pop` only through the browser's `popstate` handler. The
runtime dispatches cancelable `ligature:navigation:start` and non-cancelable
`ligature:navigation:end` / `ligature:navigation:error` events on `document`.
Each event's `detail` contains `url`, `target`, and `mode`; end also contains
the resulting `scroll`, and error contains `error`. Calling
`preventDefault()` on the start event cancels navigation.

History entries store the scroll position that was current when leaving them.
Push and replace navigations start at `(0, 0)`; back/forward navigation uses
the stored position. Ligature sets `history.scrollRestoration` to `manual`
when available so browser-native restoration does not race the framework.
Failed or cancelled navigations leave the current outlet and history entry
unchanged.

### Keyed list updates

`Ligature.updateList(root, items, options)` reconciles the direct child elements
of `root` by stable keys:

```js
Ligature.updateList(list, items, {
  key: item => item.id,
  render: item => {
    const element = document.createElement('article')
    element.textContent = item.title
    return element
  },
  update: (element, item) => { element.textContent = item.title }
})
```

`key` must return a unique string or number for each item. `render` must return
an `Element`; new elements receive `data-agent-key` and are passed through the
normal hydration scan. Existing keyed elements are moved in the requested order
and are not unmounted or remounted, so component state, refs, and lifecycle
subscriptions survive reordering. The optional `update` callback changes an
existing element in place. Children removed from the next item set are unmounted
before removal. Initial server-rendered children that should be reused must carry
matching `data-agent-key` values. Duplicate keys, invalid keys, or a non-Element
render result throw synchronously.

## Refs and imperative handles

Refs are an explicitly client-side escape hatch for coordinating a mounted
component. They are not serialized into HTML, stored in the server render
context, or kept in an application-wide state store. Create and attach a ref
from client code:

```js
const inputRef = Ligature.createRef()
Ligature.attachRef(inputRef, element.querySelector('[data-search-input]'))
inputRef.current?.focus()
```

`createRef()` returns a ref whose `current` is `null` until
`attachRef(ref, element)` is called. The target must be a mounted interactive
component. `current` is the target element unless that component defines a
client `handle(element, state)` hook; in that case it is the hook's
shallow-frozen object of imperative methods. Attaching `null` clears the ref.
Invalid refs and unmounted targets throw, and unmounting automatically clears
refs targeting that element. A handle must return an object or `undefined`;
handles should expose narrow actions (for example `focus` or `reset`) rather
than mutable component state or a broad application service.

Because refs require a mounted browser component, they do not work during
server rendering and should not be used to make initial HTML conditional.
Prefer props, events, and server-rendered links/forms for data flow; use a ref
only when a parent or nearby client behavior needs a small imperative DOM
operation.

### Controlled and uncontrolled components

Client components use `Ligature.createControl(options)` when a value may be
owned either by the parent (controlled) or by the component (uncontrolled).
The presence of the `value` key selects controlled mode; `defaultValue` is the
initial and reset value in uncontrolled mode. `set(value)` calls
`onChange(value)` when supplied. In controlled mode it does not change
`control.value`; the parent must pass the new prop and the component's `update`
hook should call `control.sync(nextValue)`. In uncontrolled mode `set` changes
`control.value` immediately. `reset()` requests the default value, and
`controlled` reports the selected mode.

```js
client: {
  mount(element, state) {
    state.control = Ligature.createControl({
      value: element.dataset.initialValue, // omit for uncontrolled mode
      defaultValue: '',
      onChange: value => element.dispatchEvent(new CustomEvent('change', { detail: value }))
    })
  },
  update(element, props, state) {
    state.control?.sync(props.value)
  }
}
```

Use a controlled control when the parent/server is authoritative (for example,
validated form data), and an uncontrolled control for local draft input. Mode
is fixed when `createControl` is called. Controls are client-only state helpers:
they are not serialized, do not replace server-rendered props, and do not
provide a global store.

Escaping is explicit and context-specific:

- `escapeText(value)` and `escapeAttribute(value)` escape `&`, `<`, `>`, `"`,
  and `'`; `escapeHtml` remains their compatibility alias.
- `escapeUrl(value)` applies HTML escaping and rejects control characters and
  non-web schemes (`javascript:`, `data:`, `vbscript:`, and similar). It also
  rejects Unicode line separators, and permits relative URLs plus `http`,
  `https`, `mailto`, and `tel`.
- `escapeStyle(value)` applies HTML escaping and rejects control characters,
  style termination, `url(...)`, script-like schemes (including CSS-escaped
  spellings), CSS expressions, `@import`, `behavior`, and `-moz-binding`.
  It is intentionally conservative: use a class or a trusted stylesheet for
  background images and other URL-bearing styles.

Component return values are trusted HTML because the renderer cannot
distinguish template markup from an unsafe string. For an application-controlled
fragment that must retain a small amount of markup, `rawHtml(value)` is the
explicit opt-in: it applies Ligature's conservative allowlist sanitizer and
returns a string suitable for interpolation in component output. The named
`sanitizeHtml(value)` export is the same operation when its intent is clearer.

The sanitizer keeps a limited set of text/formatting/list/link/image tags,
removes executable and embedded-content tags, drops event/style attributes,
allows only `aria-*`/`data-*` plus a small global attribute set, and rejects
unsafe URL schemes in `href`/`src`. It is intentionally not a full HTML parser.
Do not use it as the sole defense for hostile rich-text content, SVG, CSS,
uploads, or multi-tenant HTML; use a maintained, policy-configured sanitizer
at that boundary and apply content-security policy. Continue to use
`escapeText`, `escapeAttribute`, `escapeUrl`, and `escapeStyle` for individual
values. `children` and `slots` remain trusted HTML contracts and are not
automatically sanitized.
