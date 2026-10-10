# Packaging and ecosystem

Ligature is an ESM-first package with explicit public boundaries:

| Subpath | Ownership |
| --- | --- |
| `ligaturejs` | Complete public framework API |
| `ligaturejs/runtime` | Browser/server runtime helpers |
| `ligaturejs/adapters` | Express and database adapters |
| `ligaturejs/devtools` | Inspection and release diagnostics |
| `ligaturejs/cli` | CLI entry point (normally invoked as `ligature`) |

Every subpath publishes a TypeScript condition. CommonJS is not a supported
runtime import surface; CommonJS applications should use `await import('ligaturejs')`
at an async boundary or place an ESM bridge in their application. This avoids
two module graphs and is tested by `check:packaging`.

`PROVENANCE.json` contains a reproducible SHA-256 digest of the source tree,
excluding generated provenance itself. `npm run build:provenance` regenerates it;
the release gate fails if it is stale. The package excludes tests, local data,
browser binaries, and secrets.

Plugins must use `definePlugin` and declare the `ligaturejs.plugin.v1` contract.
`createPluginRegistry` installs in declaration order and uninstalls in reverse
order. Starter files are under `templates/starter`; the small component library
is exported from the root and is intended as a semantic baseline, not a design
system.
