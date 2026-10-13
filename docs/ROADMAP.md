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

## Future ecosystem work

The next product milestone is validation, not more framework surface area:

1. Define repeatable, representative agent tasks and an equivalent baseline;
   report task success, defects, human corrections, interaction overhead, and
   app performance with methodology and limitations. See
   [AI-EFFICIENCY.md](AI-EFFICIENCY.md).
2. Use the evaluation to identify where contracts, scaffolds, diagnostics,
   examples, or the supported target cause wasted agent effort.
3. Build a reference application around those tasks and publish results before
   making comparative AI-efficiency claims.
4. Consider broader adapters or browser capabilities only when evidence from
   real applications supports the investment and existing performance budgets
   remain intact.
5. Publish the prepared versioned package when explicitly authorized and
   maintain the registry/release policy.
