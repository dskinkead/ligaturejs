# ADR-002: explicit application boundaries

- Status: accepted
- Date: 2026-10-05

## Decision

Routes own HTTP and authorization, repositories own persistence, components own
presentation and browser lifecycle, and actions own validated mutations. Shared
state is explicit (`createStore`, resources, or an application-owned adapter),
not a framework-global registry.

## Consequences

The boundaries are easy to test and delegate independently. Applications write
some adapter code, but replacing a database or transport does not require
rewriting components. Security checks stay close to the request and data
boundaries instead of being inferred from UI state.
