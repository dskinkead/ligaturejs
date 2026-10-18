# Changelog

All notable releases are documented here. Entries follow Keep a Changelog and
versions follow Semantic Versioning. The release workflow runs the complete
`release:check` gate before creating a tag; provenance is deterministic and
records the source tree digest in `PROVENANCE.json`.

## [Unreleased]

- Add a nine-job server CI matrix across Linux, macOS, and Windows; keep
  real-browser/visual coverage in Linux and remove POSIX-only test assumptions.

- Preserve project and task create/toggle/delete workflows as native POST form
  submissions when browser enhancement is unavailable, while retaining JSON
  enhancement and correcting partial task updates.
- Align the machine-readable Node support baseline with CI and support guidance.
- Refresh reviewed example-page visual fixtures and clarify the package
  release gate separately from application packaging.

## [0.1.0-rc.2] - 2026-10-13

- Added explicit runtime, adapter, devtools, and CLI package subpaths.
- Added versioned plugin contracts, starter templates, and the Button, Alert,
  and Field component library.
- Set the minimum supported Node.js version to 22.13.0 to match the SQLite
  example server.
- Documented the AI-agent efficiency focus and pinned visual CI to a reproducible
  Playwright environment.

## [0.1.0-rc.1] - 2026-10-10

- Prepared the public package boundary and reproducible release metadata.
- Completed the Bolt API contract: runtime registry, templates, declarations,
  schema, documentation, escaping, nested rendering, and structured errors.
- Excluded development snapshots, benchmark data, examples, tests, and local
  environment material from the package tarball.

## [0.1.0] - 2026-10-05

- Initial server-first preview release.
