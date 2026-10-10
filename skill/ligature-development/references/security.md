# Security boundary

Escape rendered user input and use parameterized queries. Require authentication and authorization for protected routes. Protect cookie-authenticated state changes with CSRF tokens. Keep secrets out of source, arguments, URLs, logs, and reports. Use managed secret injection for deployment. Do not expose stack traces or private data in responses.

Before deployment verify TLS/reverse proxy configuration, backups and restore, readiness checks, dependency audit, and privacy/retention rules.
