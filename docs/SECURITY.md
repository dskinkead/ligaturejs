# Security policy and threat model

Ligature treats the application, identity provider, database, object storage,
and deployment environment as application-owned boundaries. The framework
helps with browser-facing defaults; it cannot establish identity, inspect
file contents, or protect a compromised host.

## Threat model

The primary threats are XSS and injection through rendered data, CSRF against
cookie-authenticated actions, session theft/fixation, authorization mistakes,
open redirects, malicious uploads, denial of service, and leaked secrets or
dependencies. The framework controls encoding, signed return paths, CSRF
tokens, secure session defaults, authorization middleware, upload bounds and
isolated names, rate-limit primitives, and security headers. Applications must
choose identity providers, persist sessions safely, scan uploads, enforce
business authorization, and monitor abuse.

Security fixes are patch releases when possible. Report vulnerabilities
privately to the project owner; do not disclose exploit details in public
issues until a fix and release are available. Rotate affected credentials,
preserve relevant logs, assess blast radius, and document containment and
notification decisions in the incident record.

## Security rules and deployment checklist

- Escape all user-controlled HTML.
- Serialize props with the framework helper; do not concatenate JSON manually.
- Keep database credentials and server-only data out of component assets.
- Validate props at the server boundary.
- Use explicit event names; do not evaluate event names as code.
- Keep client state instance-local.
- Apply authentication and authorization before rendering protected data.
- Treat component metadata as public; never place secrets in manifests.
- Use the CSRF helper for every state-changing browser route.
- Traditional forms may submit the session token as `_csrf`; `createActionHandler`
  rejects unsafe requests without a matching token before authentication or
  application code runs.
- Use secure, HTTP-only, SameSite session cookies in production.
- Use `createSessionManager` or an equivalent server-side store; rotate the
  identifier after login/privilege changes, expire idle and absolute sessions,
  and destroy sessions on logout. Do not store secrets in client cookies.
- Install `securityHeaders()` at the application boundary. Keep the default
  CSP restrictive and add only required origins; deploy HSTS only over HTTPS.
- Put `createAuthorization()` after authentication and before handlers. Every
  protected resource still needs an object-level policy check.
- Use `validateUpload()` with an allowlisted MIME/extension set and size limit,
  then store under `isolatedUploadPath()` outside the executable/public tree.
  Perform content sniffing and malware scanning before making a file available.
- Apply `createRateLimiter()` per route/user/IP as appropriate, and use a
  distributed limiter for multi-process deployments.
- Keep secrets in the deployment secret store/environment injection. Never
  commit them, put them in manifests, or log them. Run `npm audit` in CI and
  review lockfile changes; `npm run check:dependencies` verifies lock coverage.
- Use `signReturnTo`/`verifyReturnTo` for login and checkout continuation
  paths. They accept only application-relative destinations, expire by default
  after five minutes, and return `null` when the token is invalid or expired.
  Keep the HMAC secret in server configuration and always fall back to a local
  safe destination after verification failure; never use a client-provided URL
  directly in a redirect.
