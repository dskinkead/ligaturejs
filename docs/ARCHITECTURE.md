# Architecture and decisions

## Runtime flow

```text
request -> route/auth/input -> loader/repository -> component render -> HTML
                                                    |
                                                    +-> optional browser island
```

The server owns initial data and authorization. The browser may enhance a
marked subtree, manage local state, and submit an explicit action, but it does
not silently become the source of truth for server data.

## Package boundaries

The public package exports the framework contract from `src/index.js`. The
server renderer, browser runtime, Express adapter, data helpers, CLI, schemas,
and declarations are versioned together in this public release candidate.
Application code should import public exports, not internal `src/*` modules.

## Decision records

- [ADR-001: server-first rendering](decisions/ADR-001-server-first.md)
- [ADR-002: explicit application boundaries](decisions/ADR-002-boundaries.md)

New decisions should state the context, decision, alternatives considered,
compatibility impact, and verification required. Superseded decisions remain in
the record with a link to their replacement.
