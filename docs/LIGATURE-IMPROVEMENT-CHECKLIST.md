# Ligature Improvement Checklist

This is the exhaustive redesign backlog for making Ligature a credible
server-first alternative to React for data-driven web applications. Work is
complete only when each item has implementation, documentation, automated
tests, and a verified example where applicable.

## 1. Product definition and compatibility

- [x] Define the supported target: server-first, progressively enhanced,
  HTML-oriented applications. frameworkTarget exposes the immutable
  machine-readable contract; [docs/SUPPORTED-TARGET.md](SUPPORTED-TARGET.md)
  defines the boundary and the reference example has a regression test for
  useful server-rendered HTML before browser enhancement.
- [x] Document the boundary with React and the cases Ligature does not target. See [docs/SUPPORTED-TARGET.md](SUPPORTED-TARGET.md) for the ownership boundary and explicit non-targets; `test/framework.test.js` guards the documented contract.
- [x] Publish compatibility policy and deprecation policy. See
  [docs/COMPATIBILITY.md](COMPATIBILITY.md) and the immutable
  `frameworkCompatibility` export; `test/framework.test.js` verifies the
  machine-readable contract and required policy sections.
- [x] Define supported Node.js versions, browsers, and operating systems. See [docs/SUPPORT.md](SUPPORT.md) and the immutable `frameworkSupport` export; `test/framework.test.js` verifies the contract, package engine, and CI matrix.
- [x] Define semantic versioning and release support windows. See
  [docs/RELEASE.md](RELEASE.md) and the immutable `frameworkRelease` export;
  `test/framework.test.js` verifies the pre-1.0/stable rules, support windows,
  and current release-candidate version shape.
- [x] Add a feature-status matrix: stable, experimental, planned, unsupported.
  See [docs/FEATURE-STATUS.md](FEATURE-STATUS.md) and the immutable
  `frameworkFeatureStatus` export; `test/framework.test.js` verifies that all
  four statuses are represented and that each entry is frozen and documented.

## 2. Component API

- [x] Finalize one canonical `defineComponent` API. The definition is normalized and deeply frozen, validates metadata shapes, and documents the canonical fields and `styles`/`css` compatibility rule in [docs/API.md](API.md); `test/component.test.js` covers normalization, immutability, and malformed definitions.
- [x] Define props, defaults, required props, validation, coercion, and errors.
  `defineComponent` validates prop rule defaults and opt-in coercion; `validateProps`
  returns normalized values, the registry renders/serializes those values, and
  `PropValidationError` reports immutable structured issues. See [docs/API.md](API.md)
  and `test/component.test.js`.
- [x] Support typed props and schema generation from one source of truth.
  `PropsFromRules` derives TypeScript render/update prop types, and
  `componentSchema(component)` generates an immutable JSON Schema from the
  normalized prop contract; `test/component.test.js` covers required/defaulted
  props, coercion metadata, immutability, and unsupported defaults. See
  [docs/API.md](API.md) for the source-of-truth and compatibility rules.
- [x] Define server render context and escaping guarantees. `render` receives a
  frozen per-instance context with identity, children, slots, and scoped child
  rendering; `escapeText`/`escapeAttribute`, `escapeUrl`, and `escapeStyle`
  define tested output-boundary rules. Trusted component HTML and the absence
  of a raw-HTML escape hatch are documented in [docs/API.md](API.md), with
  coverage in `test/component.test.js`.
- [x] Define deterministic component IDs and hydration/mount markers. Server
  output now includes explicit `data-agent-hydrate` intent alongside stable
  component/instance/props markers; the client validates required metadata,
  skips server-only markers, and scans supplied roots. See `docs/API.md` and
  the component/client runtime tests.
- [x] Define children, slots, named slots, fallbacks, and slot scope. Named
  children and slots resolve through frozen per-render context helpers;
  supplied fragment functions receive frozen scope, declared fallbacks are
  supported, malformed fragments are rejected, and the contract is documented
  in `docs/API.md` with coverage in `test/composition.test.js`.
- [x] Define parent/child composition and lifecycle ordering. Client lifecycle
  scans mount nested components depth-first (parent before child) and unmount
  them in reverse depth-first order (child before parent), including observed
  DOM removal and navigation replacement cleanup. See the lifecycle contract in
  [docs/API.md](API.md) and `test/client.test.js`.
- [x] Define context providers/consumers and scoped dependency injection.
  `createContext` creates immutable identity tokens with defaults; server
  `context.consume`/`context.provide` and root `render` `providers` maps scope
  dependencies to a render tree without global state. Coverage is in
  `test/composition.test.js`, with the synchronous/inheritance contract in
  `docs/API.md`.
- [x] Define refs and imperative handles without encouraging global state. The
  browser runtime provides scoped `createRef`/`attachRef` objects and optional
  shallow-frozen client `handle(element, state)` results; refs are cleared on
  unmount and are never serialized or placed in server context. See the
  contract and usage guidance in [docs/API.md](API.md), with source-contract
  coverage in `test/client.test.js`.
- [x] Define controlled and uncontrolled component patterns. `Ligature.createControl`
  provides an immutable client control with explicit controlled-mode detection,
  `defaultValue`, `set`, `sync`, `reset`, and optional `onChange` semantics;
  `test/client.test.js` verifies controlled and uncontrolled behavior and
  `docs/API.md` documents the contract and lifecycle-hook pattern.
- [x] Define component error boundaries and fallback rendering. Components can
  provide `errorBoundary(error, props, state, context)` for server render and
  nested-render failures; client `errorBoundary(error, element, state)` hooks
  handle mount/update failures and replace the boundary contents. Non-string
  fallbacks are rejected, unhandled errors propagate, and the contract is
  documented in [docs/API.md](API.md) with coverage in
  `test/component.test.js` and `test/client.test.js`.
- [x] Define async component loading, loading states, and error states. Client
  definitions may provide a `load()` promise plus trusted `loading` and
  `error` HTML fallbacks; the browser shares the load promise per component
  name and mounts the resolved definition. See [docs/API.md](API.md) and the
  client/component contract tests.
- [x] Remove or formally deprecate legacy duplicate API names. `css` is the
  deprecated component-definition alias for `styles`, and
  `agentTagsMiddleware` is the deprecated alias for `ligatureMiddleware`; both
  have source/declaration annotations, migration guidance in [docs/API.md](API.md),
  compatibility policy coverage, and regression tests in `test/component.test.js`
  and `test/express.test.js`.

## 3. Rendering and hydration

- [x] Make server rendering deterministic and side-effect free. The registry
  now assigns stable default instance IDs in depth-first render order, keeps
  generated mount metadata repeatable, and documents the purity boundary in
  `docs/API.md`; covered by the deterministic nested-render regression test.
- [x] Define HTML serialization and attribute normalization rules. The server
  renderer now emits deterministic quoted attributes, normalizes and validates
  `options.data` keys, omits nullish metadata, rejects ambiguous values, and
  escapes every generated value; see [docs/API.md](API.md) and the focused
  regression coverage in `test/component.test.js`.
- [x] Guarantee escaping for text, attributes, URLs, styles, and raw HTML.
  Context helpers now HTML-escape output, reject unsafe URL schemes/control
  characters, and conservatively reject executable or URL-bearing CSS. Raw
  component HTML remains explicitly trusted and has no implicit escape hatch;
  `test/component.test.js` covers the rejection boundary and [docs/API.md](API.md)
  documents the contract.
- [x] Add safe opt-in raw HTML with sanitization guidance. `rawHtml` and
  `sanitizeHtml` apply a conservative tag/attribute/URL allowlist; the limits
  and maintained-sanitizer guidance are documented in [docs/API.md](API.md),
  with regression coverage in `test/component.test.js`.
- [x] Implement progressive enhancement without requiring hydration. Client
  definitions may provide `enhance(element, state)`, which runs against the
  server-rendered DOM before optional lifecycle mounting; server-only output
  remains useful with JavaScript disabled. See [docs/API.md](API.md),
  [docs/SUPPORTED-TARGET.md](SUPPORTED-TARGET.md),
  `test/client.test.js`, and `test/component.test.js`.
- [x] Add optional hydration/island behavior for interactive components. Client
  render options support eager, idle, visible, and manual activation modes;
  `Ligature.hydrate(element)` activates manual islands. Coverage is in
  `test/component.test.js` and `test/client.test.js`, with the contract in
  `docs/API.md`.
- [x] Detect and report server/client markup mismatches. Server output carries a
  deterministic `data-agent-markup` signature; an optional client `render(state)`
  is compared during hydration, marks drift with `data-agent-mismatch`, and
  reports `MarkupMismatchError` through `onMarkupMismatch` or the console. See
  [docs/API.md](API.md), `src/markup.js`, `test/component.test.js`, and
  `test/client.test.js`.
- [x] Preserve form values and focus during partial updates. `Ligature.replace`
  and `Ligature.navigate` capture and restore matched control values, checked
  state, focus, and text selection; `data-agent-field` provides an explicit
  stable key for repeated fields. See the partial-update contract in
  `docs/API.md` and the runtime contract test in `test/client.test.js`.
- [x] Support streaming or document progressive-rendering guidance. The
  current renderer remains synchronous and returns complete HTML; supported
  response composition, stable fragment IDs, failure handling, and the native
  streaming boundary are documented in [docs/PROGRESSIVE-RENDERING.md](PROGRESSIVE-RENDERING.md)
  and guarded by `test/framework.test.js`.
- [x] Add snapshot and semantic-render tests. `test/rendering.test.js` covers a
  reviewed plain-text snapshot and semantic assertions using the dependency-free
  helpers in `test/helpers/render-test.js`; the conventions are documented in
  [docs/TESTING.md](TESTING.md).

## 4. Browser runtime and lifecycle

- [x] Finalize mount, update, and unmount lifecycle semantics. Mount and
  enhancement failures now roll back mounted state and attempt cleanup; update
  state commits only after a successful hook; unmount is idempotent and
  child-first cleanup continues after hook failures. See the lifecycle
  transaction contract in [docs/API.md](API.md), source-contract coverage in
  `test/client.test.js`, and browser regression coverage in
  `test/playwright.test.js`.
- [x] Guarantee listener cleanup and abort pending async work on unmount. Each
  mounted client instance receives a cancellation-aware lifecycle context:
  `listen()` registrations are removed and its `AbortSignal` is aborted before
  `unmount`, including DOM-removal, replacement, and navigation cleanup. The
  contract is documented in `docs/API.md`, typed in `index.d.ts`, and guarded
  by `test/client.test.js`.
- [x] Make dynamic DOM insertion/removal behavior deterministic. The browser
  observer now reconciles mutation batches against final connectivity,
  deduplicates nested records, preserves moved mounted subtrees, and prevents
  detached scheduled hydration; `test/client.test.js` covers the source
  contract and `test/playwright.test.js` verifies insertion, child-first
  removal, and same-batch transient-node behavior. See the dynamic DOM
  contract in [docs/API.md](API.md).
- [x] Support keyed list updates without unnecessary remounts. `Ligature.updateList`
  reconciles direct keyed children using `data-agent-key`, moves existing elements
  without remounting them, invokes an optional per-item update callback, mounts new
  elements through the normal scan, and unmounts removed elements. The contract is
  documented in [docs/API.md](API.md), typed in `index.d.ts`, and covered by the
  focused runtime source regression in `test/client.test.js`.
- [x] Define event delegation and component event contracts. Lifecycle contexts
  now provide cleanup-aware `delegate` and validated `emit` helpers; declared
  server `events` are carried into the client definition. The contract and
  usage example are documented in `docs/API.md`, with source-contract coverage
  in `test/client.test.js` and `test/component.test.js`.
- [x] Add error reporting with component name and DOM location. Client runtime
  failures now produce structured `LigatureRuntimeError` diagnostics with
  component, phase, cause, and deterministic DOM location fields; client
  `onError` hooks receive them before boundary handling, while unmount failures
  are also logged. See [docs/API.md](API.md), `index.d.ts`, and the focused
  source-contract tests in `test/client.test.js`.
- [x] Support navigation lifecycle and scroll restoration. `Ligature.navigate`
  now emits cancelable start and terminal navigation events, distinguishes
  push/replace/pop history transitions, and stores/restores scroll positions
  per history entry with manual browser restoration. The contract is in
  `docs/API.md`; source and browser regression coverage is in
  `test/client.test.js` and `test/playwright.test.js`.
- [x] Add first-class reusable server fragments (“bolts”). `defineBolt` and
  `createBoltRegistry` provide explicit registration, scoped nested rendering,
  escaping helpers, metadata, and structured errors; `test/bolt.test.js` covers
  nesting, escaping, duplicate names, and failure behavior.
- [x] Support declarative bolt templates. Bolt `template` definitions support
  escaped dotted `data` paths, empty missing values, and structured rejection
  of executable expressions through `BoltTemplateError`; covered by
  `test/bolt.test.js` and documented in `docs/API.md`.
- [x] Support focus management and keyboard interaction helpers. The browser
  runtime provides focusable discovery, focus-first, key-map, and focus-trap
  helpers; lifecycle variants are cleaned up with the mounted instance. The
  contract is documented in [docs/API.md](API.md), typed in `index.d.ts`, and
  covered by `test/client.test.js` and `test/playwright.test.js`.
- [x] Add runtime development diagnostics and production-minified mode.
  `clientRuntime({ development: true })` exposes a bounded diagnostic buffer
  for runtime errors and markup mismatches; `minified: true` emits the same
  runtime with insignificant whitespace removed. Express passes these options
  through `options.runtime`. Coverage is in `test/client.test.js`, with the
  API contract documented in `docs/API.md`.
- [x] Provide a small runtime bundle with measurable size budgets. Generated
  development and production bundles live in `dist/`; `npm run check:runtime`
  verifies reproducibility plus raw/gzip budgets documented in
  [docs/CLIENT-RUNTIME.md](CLIENT-RUNTIME.md), with coverage in
  `test/runtime-bundle.test.js`.
- [x] Add browser compatibility tests for supported browsers. The shared
  smoke contract in `test/browser-compatibility.test.js` runs against
  Chromium, Firefox, and WebKit (Safari) when their Playwright binaries are
  installed, and explicitly skips unavailable local engines. The command and
  coverage boundary are documented in [docs/TESTING.md](TESTING.md).

## 5. State and data flow

- [x] Define local component state and update semantics. Each mounted instance
  gets an isolated shallow-frozen `state()` snapshot; `Ligature.update` keeps
  props separate, and lifecycle `setState` accepts partial or functional
  updates, invokes `update` synchronously, and commits only after success.
  The contract is documented in [docs/API.md](API.md), typed in `index.d.ts`,
  and covered by the focused runtime contract test in `test/client.test.js`.
- [x] Define derived state and memoization. Client lifecycle contexts expose
  instance-scoped `derive(key, compute, dependencies)` memoization using
  explicit `Object.is` dependency comparison; purity, cache lifetime, and the
  failed-update boundary are documented in [docs/API.md](API.md), typed in
  `index.d.ts`, and covered by the generated runtime contract test.
- [x] Define shared application state without mandatory global stores. `createStore`
  provides an explicit shallow-immutable snapshot store with functional/partial
  updates, synchronous subscriptions, reset, and no framework-level registry.
  The ownership, server-authority boundary, and lifecycle guidance are in
  [docs/API.md](API.md); `test/client.test.js` covers updates, unsubscribe,
  reset, validation, and browser-runtime exposure.
- [x] Define immutable/update-helper conventions. State and store snapshots use
  shallow frozen roots; `updateIn` provides pure structural-sharing updates for
  existing nested paths, with runtime exposure, TypeScript declarations, API
  guidance, and regression coverage in `test/client.test.js`.
- [x] Define async resource state: idle, loading, success, error, stale.
  `createResource` provides frozen status/data/error snapshots, deduplicated
  loads, subscriptions, invalidation/reset, and late-result protection after
  invalidation. The contract is documented in [docs/API.md](API.md), typed in
  `index.d.ts`, and covered by focused transitions/error tests in
  `test/client.test.js`.
- [x] Define form state, dirty state, validation, submission, and reset.
  `createForm` provides frozen values/initial values, touched and dirty state,
  synchronous validation, async submission with `_form` errors, subscriptions,
  and reset without owning transport or server authority. The contract is
  documented in [docs/API.md](API.md), typed in `index.d.ts`, and covered by
  focused tests in `test/client.test.js`.
- [x] Define optimistic updates and rollback. `createOptimistic` publishes an
  immediate immutable optimistic snapshot, commits optional server replacement
  data, and restores the pre-update snapshot on rejection; overlapping updates
  are rejected to make rollback deterministic. The contract and CSRF boundary
  are documented in `docs/API.md`, typed in `index.d.ts`, and covered by
  `test/client.test.js`.
- [x] Define server actions/data mutations and CSRF integration. `defineAction`,
  `actionManifest`, and `createActionHandler` provide validated Express-compatible
  actions, optional authentication, explicit response metadata, and default
  session-bound CSRF enforcement for unsafe methods; see `src/actions.js`,
  `src/csrf.js`, `docs/API.md`, and `test/actions.test.js`.
- [x] Define cache invalidation and revalidation. `createResourceCache` provides
  explicit named-resource deduplication, invalidation, and single/all-resource
  revalidation without module-global state; see `src/client.js`, `docs/API.md`,
  and `test/client.test.js`.
- [x] Add devtools or a framework-neutral state inspection hook.
  `createStateInspector` tracks explicit stores/resources and publishes frozen
  snapshots to subscribers without a global registry; see `src/client.js`,
  `index.d.ts`, `docs/API.md`, and `test/client.test.js`.

## 6. Styling and assets

- [x] Finalize component-owned CSS API. `styles` accepts a string or normalized
  style definition with scope, layer, order, and source metadata; the
  compatibility alias remains supported. See [docs/STYLING.md](STYLING.md),
  `src/component.js`, and `test/assets.test.js`.
- [x] Resolve CSS scoping strategy and document global CSS escape hatches.
  `bundleStyles` scopes component rules to their server marker and supports an
  explicit `:global(...)` escape hatch; see [docs/STYLING.md](STYLING.md) and
  the bundle regression test.
- [x] Add CSS bundling, ordering, deduplication, and source maps.
  `bundleStyles` provides deterministic order/hash, duplicate elimination, and
  an inline source-map artifact; focused tests pass with the component suite.
- [x] Add CSS bundling, ordering, deduplication, and source maps. (Duplicate backlog entry; implementation and tests are covered by `bundleStyles` and `test/assets.test.js`.)
- [x] Add content hashing and production cache headers. `assetDescriptor` publishes SHA-256 versions and immutable URLs; middleware emits matching ETags and one-year immutable cache headers. Covered by `test/assets.test.js` and `test/express.test.js`.
- [x] Support CSS modules or a documented alternative if justified. Marker-scoped
  `bundleStyles` is the documented alternative to a second class-name compiler;
  `docs/STYLING.md` records the isolation and `:global(...)` escape-hatch
  contract, with deterministic bundle coverage in `test/assets.test.js`.
- [x] Support design tokens and theme variables. `defineTheme`/`themeCss` validate token names and values and generate scoped custom-property CSS; covered by `test/assets.test.js` and `docs/STYLING.md`.
- [x] Support dark mode and reduced-motion preferences. Theme generation emits standards-based preference media overrides; covered by `test/assets.test.js` and `docs/STYLING.md`.
- [x] Add asset imports for images, fonts, and SVGs. `importAsset` infers and
  validates supported extensions and produces immutable content-addressed
  descriptors; `test/assets.test.js` covers image/font imports.
- [x] Add safe SVG handling and sanitization guidance. `sanitizeSvg` applies a
  conservative static-element/attribute boundary for imported SVGs and the
  limits plus upload boundary are documented in `docs/STYLING.md`; regression
  tests cover script, external-reference, and unsupported-extension rejection.
- [x] Add critical CSS and preload guidance. `criticalCss` enforces a bounded
  inline artifact and `preloadLink` emits validated fetch-destination hints;
  tests cover byte budgets and font crossorigin output, with usage guidance in
  `docs/STYLING.md`.
- [x] Add visual regression fixtures for the example app. Reviewed Chromium
  screenshots cover the home page and guide page; `test/visual-regression.test.js`
  detects byte-level drift at a fixed viewport, `npm run update:visual` is the
  explicit regeneration path, and `npm run release:check` includes the focused
  check. See [docs/TESTING.md](TESTING.md).

## 7. Routing and application shell

- [x] Finalize route declaration and middleware API. `defineRoute` validates
  methods and normalized patterns, `createRouter` dispatches matching routes,
  and `createRouteHandler` composes route middleware; `test/http.test.js` covers
  the contract.
- [x] Support route parameters, query parsing, redirects, and status codes.
  `:params`/`*` patterns decode safely, repeated query keys are preserved,
  `redirect` validates header-safe locations, and handlers support explicit
  status/headers/body results; `test/http.test.js` verifies all boundaries.
- [x] Support nested layouts and route-level error boundaries. `defineRoute`
  accepts ordered `layout(s)` wrappers and `errorBoundary`; `createRouteHandler`
  applies them deterministically with safe fallback responses. Covered by
  `test/http.test.js` and documented in `docs/API.md`.
- [x] Support route loaders/actions with authorization context. Route
  `loader`, `action`, and `authorize` hooks share authenticated params, input,
  repositories, and loader data; unauthorized routes map to 403. Covered by
  `test/http.test.js`, typed in `index.d.ts`, and documented in `docs/API.md`.
- [x] Define 404/405/500 behavior. `createRouter` emits deterministic JSON
  404/405 responses and `Allow`; `createRouteHandler` preserves the existing
  non-leaking 500 error boundary, covered by `test/http.test.js`.
- [x] Add CSRF-safe form actions. `createActionHandler` enforces session-bound
  CSRF for every unsafe method (including `_csrf` form fields), with accepted
  and rejected coverage in `test/actions.test.js`; usage is documented in
  `docs/API.md` and `docs/SECURITY.md`.
- [x] Add content negotiation for HTML, JSON, and partial responses.
  `createRouteHandler` selects `html`/`partial` response fields from `Accept`
  (or the explicit partial header) and defaults to JSON; covered by
  `test/http.test.js` and documented in `docs/API.md`.
- [x] Add signed redirect and return-to helpers. `signReturnTo`/`verifyReturnTo`
  provide short-lived HMAC-SHA256 tokens restricted to application-relative
  paths, while `signedRedirect` targets an explicit continuation endpoint.
  Tampering, expiry, unsafe destinations, and the public TypeScript/API
  contract are covered by `test/http.test.js` and `docs/SECURITY.md`.
- [x] Document reverse-proxy and base-path deployment. `docs/PRODUCTION.md`
  documents trusted forwarded headers, application-relative route matching,
  asset prefixes, and redirect constraints.

## 8. CLI and developer experience

- [x] Finalize `create`, `dev`, `build`, `start`, `test`, and `check` commands. `test/cli.test.js` and `test/config-build.test.js` cover generated projects, build output, and command contracts.
- [x] Add interactive and non-interactive project scaffolding. `create app` supports both positional/non-interactive arguments and stdin/TTY prompts, and emits the validated config plus all project layers; `test/cli-expanded.test.js` covers the interactive path.
- [x] Add component, route, repository, migration, and test generators. The existing generators emit runnable contract tests; component/route/repository/migration coverage is in `test/cli*.test.js`.
- [x] Add config discovery and validation with useful errors. `src/config.js` supports JSON/ESM config and typed defaults.
- [x] Add dev server reload/HMR or a clearly documented reload model. `dev` uses Node's built-in restart watcher; the limitation is documented in `docs/AGENT-GUIDE.md`.
- [x] Add source maps and readable server/client stack traces. Native ESM keeps Node source locations, and `buildProject` emits sidecar v3 source maps with embedded source content and sourceMappingURL comments.
- [x] Add build manifests and production artifact inspection. `buildProject` and `inspectBuild` emit and verify SHA-256 artifact metadata.
- [x] Add port, host, HTTPS, proxy, and environment controls. Config validation covers TLS paths, trusted proxy/base path, and scalar environment defaults; `dev`/`start` pass the validated controls to the server process, with `PORT`, `HOST`, and `LIGATURE_BASE_PATH` overrides. `test/config-build.test.js` covers the boundaries and `docs/AGENT-GUIDE.md` documents the adapter/deployment boundary.
- [x] Add clean CI-friendly output and exit codes. CLI commands produce concise success/failure output and non-zero failures; `test/cli.test.js` exercises generated-project execution.
- [x] Add upgrade/migration tooling between framework versions. `upgrade` and `upgrade --check` inspect the project marker, apply the current migration set, and write an inspectable `.ligature/upgrade-manifest.json`; `test/cli-expanded.test.js` covers application and check mode.

## 9. TypeScript and schemas

- [x] Make TypeScript declarations complete and accurate. `index.d.ts` now covers
  every public `src/index.js` export (an export-parity regression test guards
  the shipped contracts), including route, repository, database, migration,
  middleware, security, diagnostics, build, and upgrade APIs; focused tests
  and the strict example remain green.
- [x] Generate prop/event/slot types from component definitions. `PropsFromRules`,
  `ComponentEventMap`, `ComponentSlotName`, and `ComponentTypes` derive the
  public editor types; the strict example is in `examples/typescript` and the
  contract is documented in [docs/TYPESCRIPT.md](TYPESCRIPT.md).
- [x] Generate JSON Schema and machine-readable component metadata.
  `componentMetadata` combines the normalized prop contract, events, slots,
  lifecycle capabilities, and immutable `componentSchema` output; focused
  component tests and `scripts/schema-check.js` verify the contract.
- [x] Type route params, loaders, actions, repositories, and context.
  `TypedRouteContext`, `RouteContract`, and generic repository method types
  model decoded params, validated input, loader data, and persistence
  boundaries; `test/types.test.js` and `docs/TYPESCRIPT.md` cover the public
  contract.
- [x] Add strict-mode TypeScript example project. `examples/typescript` uses
  `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`; it
  compiles with TypeScript 5.x using `tsc --noEmit`.
- [x] Add editor autocomplete/documentation examples. `docs/TYPESCRIPT.md`
  documents the generated prop/event/slot helpers and the example exercises
  those inferred names and values.
- [x] Validate generated schemas in CI. `npm run check:schemas` validates the
  shipped JSON Schema roots and a generated metadata/schema contract, and is
  included in `release:check`.

## 10. Data and backend integrations

- [x] Define repository interfaces independent of database vendors.
  `Repository<Methods>` and `DatabaseAdapter` separate domain operations from
  driver details; `defineRepository` freezes the method boundary and validates
  names/functions. Coverage is in `test/contracts.test.js` and
  `test/types.test.js`, with the contract documented in `docs/TYPESCRIPT.md`.
- [x] Provide SQLite and MySQL/MariaDB adapters or reference adapters. `createSqliteAdapter` and `createMysqlAdapter` wrap caller-owned vendor connections without adding driver dependencies; `test/data-layer.test.js` verifies both transaction/query boundaries and `docs/DATA.md` defines ownership.
- [x] Define transactions, retries, timeouts, and connection lifecycle. `withTransaction` provides explicit retry predicates, rollback-safe timeouts, attempt context, and `withConnection` guarantees close; `test/data-layer.test.js` covers the lifecycle and `docs/DATA.md` documents ownership.
- [x] Provide migration conventions and migration status tooling. Migration IDs are validated as unique, status is deterministic, pending migrations apply in order, and the latest migration can be rolled back; `test/data-layer.test.js` and `docs/DATA.md` cover the contract.
- [x] Define validation boundaries between HTTP, domain, and persistence. `createValidationBoundary` exposes explicit non-coercing boundary functions with declaration and focused regression coverage.
- [x] Provide pagination, filtering, sorting, and search helpers. `paginate`, `queryOptions`, and `queryRows` provide validated, composable helpers with focused coverage in `test/data-layer.test.js` and usage guidance in `docs/DATA.md`.
- [x] Provide authorization-scoped repository patterns. `scopedRepository` gates every repository method using the final request context and is covered by `test/data-layer.test.js` and `docs/DATA.md`.
- [x] Add test database fixtures and disposable database guidance. `createMemoryDatabase` is a transactional in-memory fixture, and `docs/DATA.md` documents when disposable real-database integration tests are required.
- [x] Add observability for slow queries and failed transactions. `observeDatabase` reports bounded slow-operation and failure events without owning logging or metrics; tests and declarations cover the contract.

## 11. Security

- [x] Complete security threat model and security policy. See [docs/SECURITY.md](SECURITY.md), including scope, threats, response, and deployment checklist.
- [x] Add CSRF middleware and secure form defaults. Existing middleware, session-bound tokens, and action-handler enforcement are regression-tested.
- [x] Add session, cookie, rotation, timeout, and logout guidance. `sessionContract` and `createSessionManager` implement secure cookie metadata, idle/absolute expiry, rotation, and destruction.
- [x] Add authentication and authorization reference implementation. `createAuthorization` provides explicit authenticate/authorize middleware.
- [x] Add secure headers and CSP helpers. `securityHeaders` emits restrictive defaults and HSTS.
- [x] Add output encoding and URL validation utilities. Existing escaping, sanitization, and signed return paths are exported and regression-tested.
- [x] Add upload validation, storage isolation, and malware-scan guidance. `validateUpload` and `isolatedUploadPath` enforce bounds/names; policy documents content inspection.
- [x] Add rate limiting and abuse protection guidance. `createRateLimiter` provides bounded per-key quotas and 429 responses.
- [x] Add secret/configuration handling guidance in `docs/SECURITY.md`.
- [x] Add dependency and supply-chain scanning in CI. `check:dependencies` verifies lock coverage.
- [x] Add security regression tests and incident response guidance in `docs/SECURITY.md`.

## 12. Testing and quality

- [x] Unit-test component contracts and rendering. `test/component.test.js`,
  `test/composition.test.js`, and `test/rendering.test.js` cover normalized
  contracts, composition, snapshots, and semantic output.
- [x] Test lifecycle, dynamic insertion, cleanup, and async cancellation.
  `test/client.test.js` and the browser lifecycle suites cover transactions,
  mutation reconciliation, listener cleanup, and cancellation.
- [x] Add route and repository integration tests. `test/http.test.js`,
  `test/repository.test.js`, `test/data-layer.test.js`, and the project tracker
  integration tests cover the HTTP/data boundaries.
- [x] Add browser tests for generated apps and example workflows.
  `test/cli-expanded.test.js`, `test/playwright.example.test.js`, and
  `test/playwright.project-tracker.test.js` exercise generated and example apps.
- [x] Add accessibility tests with axe and keyboard workflows. `test/a11y.test.js`
  runs axe and the Playwright accessibility tests cover keyboard semantics.
- [x] Add visual regression tests for core components. `test/visual-regression.test.js`
  checks reviewed Chromium fixtures for the example pages.
- [x] Add cross-browser CI coverage. `.github/workflows/test.yml` runs the
  Playwright suite against Chromium, Firefox, and WebKit.
- [x] Add performance budgets for server render, client runtime, and assets.
  `scripts/performance-check.js` is included in `release:check`.
- [x] Add fuzz/property tests for escaping and schemas. `test/quality.test.js`
  runs deterministic adversarial escaping probes and generated schema invariants.
- [x] Make test isolation and database cleanup reliable. Integration tests use
  disposable temporary database paths and process cleanup; the release suite
  keeps package consumers in temporary directories.
- [x] Add release smoke tests and package-consumer tests. `release:check` runs
  structural/release checks and `scripts/package-consumer-check.js` verifies a
  packed install through the public export.

## 13. Accessibility and UX

- [x] Publish accessibility requirements and component checklist. See
  [docs/ACCESSIBILITY.md](ACCESSIBILITY.md), including the server-first
  checklist and testing commands.
- [x] Provide accessible primitives for dialogs, menus, tabs, forms, and
  notifications. `dialogProps`, `menuProps`, `menuItemProps`, `tabsProps`,
  `fieldProps`, and `notificationProps` emit validated immutable ARIA
  relationships; `test/accessibility-primitives.test.js` covers the contract.
- [x] Guarantee keyboard navigation and visible focus defaults. Existing
  `focusFirst`, `keys`, and `focusTrap` runtime helpers provide lifecycle-owned
  keyboard behavior; generated apps now include a skip link and visible-focus
  CSS, with the baseline documented in `docs/ACCESSIBILITY.md`.
- [x] Guarantee labels, descriptions, errors, and status announcements.
  `fieldProps` links descriptions/errors and invalid state; notification
  primitives distinguish polite status from assertive alerts.
- [x] Define reduced motion, contrast, zoom, and touch behavior. The
  accessibility checklist documents these theme/application requirements and
  explicitly prohibits color-only meaning or removing focus indicators.
- [x] Add accessible generated scaffolds. `create app` generates a landmark,
  skip link, and visible-focus baseline; CLI coverage continues to verify the
  generated application contract.
- [x] Add accessibility examples and automated audits. The flash example and
  semantic primitive tests provide usage coverage; `test:a11y` runs axe against
  the example application and is included in the release gate.

## 14. Observability and operations

- [x] Define structured logging and request correlation IDs. `createLogger`
  emits structured JSON, `child` preserves request context, and
  `requestIdMiddleware` validates/generates and propagates `X-Request-Id`;
  `test/operations.test.js` covers the contract.
- [x] Add health/readiness endpoints. `diagnosticsMiddleware` serves
  fail-closed `/healthz` and `/readyz` responses with service/version/check
  metadata and correlation IDs; readiness failure is covered by the operations
  regression test.
- [x] Add error reporting integration hooks. `errorReportingMiddleware` sends
  bounded request/error metadata to an application-owned reporter, logs
  reporter failures, and preserves Express error propagation.
- [x] Add metrics for requests, render time, asset loads, and failures.
  `createMetrics` records request counts/durations plus explicit render, asset,
  and failure events; the operations test verifies each metric family.
- [x] Document graceful shutdown and signal handling. `createShutdownManager`
  closes registered servers once, runs a flush/cleanup hook, and enforces a
  bounded timeout; the lifecycle is documented in [docs/OPERATIONS.md](OPERATIONS.md).
- [x] Document deployment behind common reverse proxies. [docs/PRODUCTION.md](PRODUCTION.md)
  defines TLS, trusted forwarded headers, base paths, relative redirects, and
  asset-prefix handling.
- [x] Document backups, migrations, rollback, and disaster recovery.
  [docs/OPERATIONS.md](OPERATIONS.md) defines backup/restore rehearsal,
  migration rollback, and immutable previous-release recovery guidance.
- [x] Add production configuration validation. `validateConfig` rejects
  invalid host/port/TLS/proxy/base-path/environment settings and its existing
  config-build regression suite is part of release verification.
- [x] Add dependency/license inventory. `check:dependencies` verifies lock
  coverage and `check:licenses` emits the versioned lockfile inventory while
  failing on missing license metadata; both are included in `release:check`.

## 15. Documentation and examples

- [x] Rewrite the quickstart around a five-minute first result. See
  [docs/QUICKSTART.md](QUICKSTART.md); `test/documentation.test.js` verifies
  the guide and `npm run check:docs` verifies the release-facing guide set.
- [x] Document the canonical component API. The canonical contract and
  escaping/lifecycle rules are in [docs/API.md](API.md), with the generated
  export index in [docs/API-EXPORTS.md](API-EXPORTS.md) and API coverage in
  `test/component.test.js`.
- [x] Document state, forms, routing, data, styling, assets, and testing. The
  linked API, DATA, STYLING, and TESTING references cover these boundaries and
  the quickstart links the canonical path through them; `npm run check:docs`
  is a release check.
- [x] Add a complete polished portal example, not only CRUD fragments.
  [docs/EXAMPLE-PORTAL.md](EXAMPLE-PORTAL.md) describes the runnable project
  portal's component/route/repository/manifest boundaries; integration and
  Playwright tests verify its server-first HTML and browser enhancement.
- [x] Add examples for authentication, uploads, pagination, and authorization.
  [docs/EXAMPLES.md](EXAMPLES.md) provides bounded recipes, security ownership,
  pagination validation, and form/action guidance; the documentation test
  checks the required recipe headings.
- [x] Add React comparison guidance without overstated claims. See
  [docs/REACT-COMPARISON.md](REACT-COMPARISON.md), which states trade-offs and
  directs readers to the supported-target boundary.
- [x] Add troubleshooting and FAQ documentation. See
  [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md), covering no-JavaScript HTML,
  mismatch diagnostics, form preservation, CSRF, browser tests, and ownership.
- [x] Add architecture and decision records. See
  [docs/ARCHITECTURE.md](ARCHITECTURE.md) and the accepted ADRs in
  [docs/decisions](decisions); the documentation test verifies both records.
- [x] Keep API/reference docs generated and versioned. `scripts/documentation-check.js`
  generates the versioned [docs/API-EXPORTS.md](API-EXPORTS.md) from the public
  source export and fails on stale output; `check:docs` is in `release:check`.
- [x] Add agent-oriented workflow guidance with bounded tasks. The existing
  [docs/AGENT-GUIDE.md](AGENT-GUIDE.md), [docs/QUICKSTART.md](QUICKSTART.md),
  and [docs/ARCHITECTURE.md](ARCHITECTURE.md) define contract ownership,
  bounded changes, tests, and decision-record expectations.

## 16. Packaging and ecosystem

- [x] Define package boundaries for runtime, CLI, adapters, and devtools. The
  explicit `ligaturejs`, `/runtime`, `/adapters`, `/devtools`, and `/cli`
  subpaths are documented in [docs/PACKAGING.md](PACKAGING.md) and guarded by
  `check:packaging`.
- [x] Verify ESM/CommonJS interoperability policy. The package declares an
  ESM-only policy with dynamic-import guidance for CommonJS consumers;
  `check:packaging` verifies `type: module` and all public import targets.
- [x] Add package exports and type exports. `package.json` provides conditional
  import/type targets for every public subpath, with shipped declaration files
  and package-boundary regression coverage in `test/packaging.test.js`.
- [x] Add reproducible builds and provenance metadata. `scripts/provenance.js`
  produces a deterministic source-tree digest in `PROVENANCE.json`; the
  release gate rejects stale metadata and the package check verifies inclusion.
- [x] Add changelog and release automation. `CHANGELOG.md` follows the release
  policy and `.github/workflows/release.yml` runs provenance plus
  `release:check` before npm trusted publishing and tagging.
- [x] Add plugin/adapter extension points with versioned contracts.
  `definePlugin`, `createPluginRegistry`, and `pluginContract` implement the
  `ligaturejs.plugin.v1` install/uninstall boundary; tests cover ordering,
  duplicate/version rejection, and cleanup.
- [x] Add starter templates and a small component library. The starter is in
  `templates/starter`; escaped `Button`, `Alert`, and `Field` components are
  exported from the framework and covered by package tests.
- [x] Publish package size and dependency budgets. Existing runtime,
  performance, dependency, license, and package-consumer checks are included
  in `release:check`; current runtime gzip is 8,497 bytes against a 9,000-byte
  budget.
- [x] Add public issue templates and contribution guidelines. `.github/ISSUE_TEMPLATE`
  contains reproducible bug and bounded feature forms, and `CONTRIBUTING.md`
  defines the test, declaration, documentation, and security-report contract.

## Completion gate

The recurring improvement job may stop only when every checkbox above is
completed or explicitly marked out-of-scope in a decision record, with tests,
documentation, and release verification for each completed area.
