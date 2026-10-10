# Production Readiness

Before production use:

- Put the application behind TLS and a reverse proxy.
- Use a real session/authentication provider.
- Add CSRF protection to state-changing routes.
- Validate all route inputs with `validateInput`.
- Keep repositories behind a transaction-capable database adapter.
- Configure structured log shipping and alerting.
- Set a restrictive CSP appropriate to the application.
- Run `npm test`, browser tests, accessibility checks, and load tests in CI.
- Run `npm run release:check` before publishing.
- Run `node src/cli.js release` and review its dependency audit report.
- Fingerprint assets when component code changes; immutable caching assumes versioned URLs.
- Review authorization for every route and repository operation.
- If the app is mounted below a reverse-proxy base path, strip that prefix
  before `createRouter` matching (or configure the proxy to forward the
  application-relative path). Preserve the original prefix when generating
  links and set an explicit asset prefix in `ligatureMiddleware`; never trust
  an arbitrary `Host` or forwarded path to construct redirects.
- Prefer relative or allowlisted absolute redirect locations. Forward only
  `X-Forwarded-*` headers from a trusted proxy and configure its TLS/base-path
  policy explicitly.
- Back up data and document rollback before migrations.
- Expose health/readiness endpoints and propagate request IDs.
