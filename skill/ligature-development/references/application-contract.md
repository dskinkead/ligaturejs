# Application boundaries

Keep responsibilities separate:

- Routes validate input, enforce authorization, call repositories, and return deliberate HTML or JSON responses.
- Repositories own database access and parameterized queries.
- Migrations have stable IDs plus reversible up/down operations.
- Components receive data as props and do not execute SQL.
- The application manifest describes discoverable components, routes, repositories, and capabilities.

Use transactions for related writes. Keep authentication and CSRF checks at state-changing route boundaries. Record migration and rollback impact in the feature plan.
