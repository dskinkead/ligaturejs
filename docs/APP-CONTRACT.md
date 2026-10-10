# Application Contract

Agents should build applications in four explicit layers:

1. **Repositories** — persistence only; no HTML or HTTP.
2. **Routes** — input/output/authentication contract; call repositories.
3. **Components** — render props and own client lifecycle.
4. **Pages** — compose components and declare navigation outlets.

Repositories that change multiple records must use the transaction helper. Migrations must declare reversible `up` and `down` operations and stable ordered IDs.

Every route and component should be discoverable through a manifest. This gives an agent a bounded map of the application before it edits code.

The application manifest uses schema `ligaturejs.application.v1` and should be exposed as a read-only diagnostics endpoint in deployed applications.

## Change protocol

For every change, an agent should report:

- contract changed;
- files changed;
- tests added or updated;
- migration/data impact;
- rollback procedure.
