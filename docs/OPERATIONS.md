# Operations Contract

Every generated application should expose:

- `/healthz` for process health;
- `/readyz` for dependency readiness;
- `X-Request-Id` on responses;
- a versioned application manifest;
- reversible migration metadata;
- structured logs containing the request ID.

## Request correlation and logs

Install `requestIdMiddleware({ logger })` before application routes. It accepts
only bounded header-safe IDs, generates one otherwise, sets `X-Request-Id`,
and attaches `req.log` when a logger is supplied. `createLogger().child()`
keeps correlation fields in every structured JSON record without a global
logger context. Do not log credentials, authorization headers, or request
bodies by default.

## Metrics and error reporting

`createMetrics()` is a framework-neutral in-process recorder. Install its
`middleware()` to record request totals and durations, and export `snapshot()`
to an application-owned metrics backend. It is intentionally not a durable or
distributed metrics store; aggregate across processes in the deployment layer.
`errorReportingMiddleware({ report })` receives the error and safe request
location/request-ID metadata, then rethrows through Express middleware.

## Graceful shutdown

Register `createShutdownManager({ servers, onShutdown })` for `SIGTERM` and
`SIGINT`. It stops accepting work by closing the supplied servers, runs the
application hook (typically stop consumers and flush telemetry), and fails on
the bounded close timeout. Deployments should remove the instance from traffic
before sending the signal and treat a timeout as a failed rollout.

Readiness must fail closed when required dependencies are unavailable. Deployments should wait for readiness before receiving traffic.

## Recovery and supply chain

Back up persistent data before migrations, retain migration status and rollback
instructions with each release, and test restoring a backup on a disposable
environment. Keep immutable release artifacts and a documented previous
version so rollback does not require rebuilding from a changed dependency tree.
`npm run check:licenses` emits the lockfile package/license inventory and fails
when a package has no declared license metadata; review the generated inventory
as part of release approval.
