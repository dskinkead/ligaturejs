# Application recipes

These recipes show where common product concerns belong. They are deliberately
small enough to copy into the portal example and explicit enough to test.

## Authentication and authorization

Authenticate once at the request boundary, then pass the authenticated actor
to route authorization and repository scopes. Do not infer authorization in a
component:

```js
const route = defineRoute({
  path: '/projects/:id', method: 'GET',
  authorize: ({ actor, params }) => actor?.projectIds.includes(params.id),
  loader: ({ repositories, params }) => repositories.projects.get(params.id)
})
```

Return a deliberate 401/403 response and never leak whether an inaccessible
record exists. See `example/auth.js`, `docs/SECURITY.md`, and the authorization
tests for the complete boundary.

## Uploads

Validate size, media type, and filename before writing. Store the generated
isolated path, not the user filename, and run malware inspection before making
the asset available. `validateUpload` and `isolatedUploadPath` implement the
framework boundary; storage and scanning remain application-owned.

## Pagination

Keep pagination in the repository/query boundary and return a stable envelope:

```js
const page = paginate({ page: request.query.page, pageSize: 25 })
const result = await repository.list({ ...page, sort: 'createdAt-desc' })
return { data: result.rows, page: { ...page, total: result.total } }
```

Validate sort fields against an allowlist. Never interpolate an unchecked field
name into SQL. See `paginate`, `queryOptions`, and `queryRows` in `docs/DATA.md`.

## Forms and actions

Use `createForm` for client state and `defineAction`/`createActionHandler` for
the server mutation. Cookie-authenticated unsafe methods require a session-
bound CSRF token. The server remains authoritative; optimistic UI is optional
and must have a deterministic rollback.
