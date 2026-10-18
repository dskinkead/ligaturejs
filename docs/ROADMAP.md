# Roadmap

## Prototype completed

- Component definition and validation
- Server registry and rendering
- Escaping helper
- Client runtime skeleton
- Lifecycle-shaped component contract
- Machine-readable manifest
- Agent guide
- Automated tests
- Express middleware adapter
- Safe prop validation and serialization
- Component asset endpoints
- Security and authoring guidance
- CRUD task-list example with repository boundary
- AJAX navigation and lifecycle reconciliation
- Browser-harness and repeat-navigation integration coverage
- Optional Playwright browser suite
- Production security and operational guidance
- Auth-shaped application example
- Accessibility fixture coverage
- Route authentication/validation/error boundary
- Content-addressed asset URLs
- CI test workflow
- Versioned application manifest
- Health/readiness and request correlation
- Reversible migration contract
- Transaction helper and migration runner
- Application contract checker and release checklist
- CLI route/repository/migration scaffolding
- TypeScript declarations and JSON Schemas

## Completed release-candidate work

- npm package artifact validation
- CLI application/component/route/repository/migration scaffolding
- TypeScript declarations and JSON schemas
- Express middleware, security adapters, CSRF, sessions, transactions, and migrations
- Browser, Playwright, accessibility, contract, and release checks

## 1.0.0 readiness

The 1.0.0 milestone is a dependable, clearly scoped product, not a feature-count
target. Validate the supported product before expanding framework surface:

1. **Set the compatibility boundary.** Review every public export, schema,
   rendered marker, and feature-status entry. Keep experimental capabilities
   explicitly outside the stable promise; document any required migration.
2. **Validate the supported application path.** Complete a representative
   server-first application using the documented component, route, form,
   session, authorization, migration, readiness, and shutdown guidance. Fix
   friction or correctness gaps found in that path rather than adding APIs
   speculatively.
3. **Prove support claims.** Verify the declared Node and browser baselines with
   the available automated coverage, or narrow the stated support promise to
   what is actually verified.
4. **Evaluate product outcomes.** For representative tasks, compare equivalent
   implementations using task success, defects, human corrections, interaction
   overhead, and resulting application behavior and performance. Report the
   method, sample size, and limitations; do not claim an advantage unsupported
   by the evidence. See [AI-EFFICIENCY.md](AI-EFFICIENCY.md).
5. **Close the release gate.** Ensure the release checks, package contents,
   changelog, compatibility notes, and upgrade guidance match the final stable
   surface. Keep publication separate under the release policy.

Broader adapters or browser capabilities are follow-on work only when real
application evidence supports them and existing performance budgets remain
intact.
