# ADR-001: server-first rendering

- Status: accepted
- Date: 2026-10-05

## Context

Data-driven applications need useful HTML for initial response, crawlers,
assistive technology, slow devices, and users with JavaScript disabled.

## Decision

Ligature renders complete component output on the server. Browser behavior is
progressive enhancement or an explicitly activated island. Hydration is
optional and mismatch reporting is visible when requested.

## Alternatives

An always-client-rendered runtime was rejected because it makes the first
response and data loading depend on browser JavaScript. A framework-wide
streaming abstraction was deferred; response composition and stable fragment
IDs are documented until a native streaming API is justified.

## Consequences

Components must have deterministic server output and explicit escaping. Client
hooks have a narrower responsibility and require cleanup. The trade-off is
that highly interactive client-only applications may prefer another framework.
