# Feature status matrix

Ligature publishes feature maturity separately from its supported application
target and release policy. The machine-readable source is exported as
`frameworkFeatureStatus`:

```js
import { frameworkFeatureStatus } from 'ligaturejs'

frameworkFeatureStatus.schema // 'ligaturejs.feature-status.v1'
```

## Status definitions

| Status | Meaning |
| --- | --- |
| **stable** | Documented public behavior with a compatibility commitment, focused tests, and current release support. |
| **experimental** | Available for evaluation, but behavior or scope may change before it becomes a stable contract. |
| **planned** | A documented direction that is not currently provided as a supported framework capability. |
| **unsupported** | Explicitly outside Ligature's target or intentionally not provided; use another tool or an application-owned adapter. |

The matrix is a capability guide, not a promise that every planned item has an
implementation or that every experimental item is suitable for production.
Only entries marked **stable** are part of the normal compatibility surface.
The status of a feature may change in a release; such changes belong in the
release notes and, when the public contract changes, follow
[docs/COMPATIBILITY.md](COMPATIBILITY.md).

## Current matrix

| Capability | Area | Status | Scope |
| --- | --- | --- | --- |
| Deterministic server rendering | Rendering | stable | Useful HTML and component mount metadata are produced on the server. |
| Component contracts | Components | stable | Props, rendering, and lifecycle contracts are validated. |
| Component composition | Components | stable | Nested components, children, named slots, and scoped render context are supported. |
| Route and repository boundaries | Application architecture | stable | Server-side route and repository contracts are explicit. |
| Input validation and CSRF | Security | stable | Server-side validation and CSRF primitives are available. |
| Progressive browser enhancement | Browser runtime | experimental | Optional client lifecycle, DOM enhancement, and partial navigation behavior. |
| AJAX navigation | Browser runtime | experimental | Enhanced navigation retains ordinary links and server responses as fallback. |
| Hydration islands | Rendering | experimental | Per-instance eager, idle, visible, and manual activation for explicitly interactive components. |
| Streaming rendering | Rendering | planned | Streaming responses and progressive document-rendering guidance. |
| Typed component schemas | TypeScript and schemas | stable | Typed prop declarations and generated JSON Schema are derived from component definitions. |
| Database adapters | Data | planned | Portable production adapters beyond current reference boundaries. |
| React compatibility layer | Interoperability | unsupported | Drop-in React components, hooks, JSX, and render-tree compatibility. |
| Offline-first applications | Application architecture | unsupported | Browser-authoritative applications whose primary experience is offline/local. |
| Client-owned graphics and editors | Application architecture | unsupported | Games, graphics, or editors requiring a continuous client render loop. |

This matrix does not modify the separate members portal or define its feature
status. It describes the Ligature framework project only.
