# Changelog

All notable releases are documented here. Entries follow Keep a Changelog and
versions follow Semantic Versioning. The release workflow runs the complete
`release:check` gate before creating a tag; provenance is deterministic and
records the source tree digest in `PROVENANCE.json`.

## [Unreleased]

- Added explicit runtime, adapter, devtools, and CLI package subpaths.
- Added versioned plugin contracts, starter templates, and the Button, Alert,
  and Field component library.

## [0.1.0-rc.1] - 2026-10-10

- Prepared the public package boundary and reproducible release metadata.
- Completed the Bolt API contract: runtime registry, templates, declarations,
  schema, documentation, escaping, nested rendering, and structured errors.
- Excluded development snapshots, benchmark data, examples, tests, and local
  environment material from the package tarball.

## [0.1.0] - 2026-10-05

- Initial server-first preview release.
