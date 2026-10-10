---
name: ligature-development
description: Build or modify Ligature applications; scaffold features, inspect contracts, test browser behavior, and verify release readiness.
---

# Ligature development

## Execute

1. Identify the Ligature project root and read its README.md, docs/AGENT-GUIDE.md, and application manifest; finish when the component, route, repository, migration, and test boundaries for the requested change are listed.
2. Inspect the relevant existing contracts before editing; consult references/component-contract.md, references/application-contract.md, and references/feature-plan.md for new features; finish when inputs, persistence, authorization, lifecycle, and rollback impact are explicit.
3. Scaffold missing artifacts with the project CLI, then implement one bounded change across its declared boundaries; finish when user-controlled values are escaped, persistence stays in repositories, and browser behavior uses component lifecycle contracts.
4. Add focused tests for persistence, routes, components, and browser behavior; finish when the requested behavior and its invalid/error paths have regression coverage.
5. Run verification from the Ligature root: npm test, npm run test:playwright, npm run test:a11y, node src/cli.js check, and npm run release:check; finish when each applicable command passes.
6. Report changed files, behavior, verification results, and rollback steps; finish when another agent can reproduce the result without private credentials or unrelated application data.

## References

- Read references/component-contract.md for component props, rendering, client lifecycle, and escaping.
- Read references/application-contract.md for route, repository, migration, security, and manifest boundaries.
- Read references/testing.md for the verification sequence.
- Read references/security.md before handling authentication, sessions, CSRF, secrets, or deployment.
- Copy references/feature-plan.md when planning a multi-boundary feature.
