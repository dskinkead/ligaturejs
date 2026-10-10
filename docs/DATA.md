# Data and backend conventions

Ligature keeps persistence behind two explicit boundaries:

- `Repository` contains domain operations and can be scoped with
  `scopedRepository(repository, authorize)`. The authorization callback gets
  the final method argument (normally a request/user context), and denial
  throws before the repository method runs.
- `DatabaseAdapter` is a small driver boundary with `query`, transaction
  methods, and optional `execute`/`close`. `createSqliteAdapter` and
  `createMysqlAdapter` are reference adapters around an already-created
  vendor connection; applications choose and own the driver and pool.

## Transactions and migrations

Use `withTransaction(adapter, work, { retries, timeout, retryOn })` for
commit/rollback behavior. Retries are opt-in and must identify transient
driver errors; timeout always rolls back before failing. `withConnection`
closes caller-owned connections in a `finally` block. Keep transactions short
and always close pools during graceful shutdown.
`migrationStatus` exposes deterministic pending/applied state,
`applyMigrations` applies sorted pending migrations, and
`rollbackMigration` rolls back the most recently applied migration. Migration
IDs must be unique and should be sortable, immutable release identifiers.

## Validation and queries

`createValidationBoundary` makes the HTTP, domain, and persistence validation
steps explicit; it does not silently coerce values between layers. `paginate`
returns stable metadata, `queryRows` composes filtering, case-insensitive field
search, sorting, and pagination, while `queryOptions` supplies validated
filter/sort and offset/limit options for adapters. Drivers remain responsible for
parameterized SQL and database-specific query planning.

For tests, `createMemoryDatabase` provides deterministic transactional state.
Use a disposable real database in integration tests when exercising SQL,
constraints, isolation, or vendor behavior; never use production credentials
or data in the test suite.

`observeDatabase(adapter, { onEvent, slowQueryMs })` wraps an adapter without
changing ownership. It reports slow query/execute calls and failed query or
transaction operations with duration and operation metadata; applications can
send these events to their own logger or metrics system.
