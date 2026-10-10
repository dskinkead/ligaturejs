# TypeScript contracts

Ligature ships declarations in `index.d.ts`; they are the public source of
truth for application code. `PropsFromRules` derives render and update props
from the same rules passed to `defineComponent`. `ComponentTypes` exposes the
corresponding props, event names, and slot names for editor tooling.

`componentMetadata(component)` is the serializable contract for generators and
editor integrations. It includes props, events, slots, lifecycle capabilities,
and the immutable JSON Schema returned by `componentSchema(component)`.

The declarations cover the complete public entry point, including errors,
middleware, configuration/build inspection, migrations, CSRF/session helpers,
database adapters, and upgrade tooling. Route applications can use
`TypedRouteContext<Params, Input, Data>` and `RouteContract` to keep decoded
parameters, validated input, and loader data typed without coupling the route
to a database driver.

Repositories use the vendor-neutral `Repository<Methods>` contract: methods
are domain operations and receive whatever persistence dependency the
application supplies. `DatabaseAdapter` is deliberately smaller and exposes
only `query`, `begin`, `commit`, and `rollback`, so repositories do not depend
on SQLite, MySQL, or a particular query-builder API. `defineRepository` and
`defineDatabaseAdapter` freeze these boundaries at startup. The reference
`createSqliteAdapter` and `createMysqlAdapter` wrap an application-owned
connection without adding a driver dependency. `scopedRepository` adds an
authorization check at every method boundary. `createValidationBoundary`
names HTTP, domain, and persistence validation, while `paginate` and
`queryOptions` keep list metadata and query options deterministic.

The strict example is under `examples/typescript`. TypeScript projects should
enable `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`;
runtime validation remains authoritative at HTTP and server-render boundaries.
Run `node scripts/schema-check.js` to validate shipped schemas and a generated
component metadata contract in CI.
