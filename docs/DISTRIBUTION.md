# Distribution

Ligature is distributed as a normal npm package. A consumer can install a
published version with:

```bash
npm install ligaturejs
```

For a local release candidate:

```bash
npm install
npm run release:check
npm pack
```

The package contains the runtime, CLI, schemas, TypeScript declarations,
documentation, and license. It does not include development tests, local
databases, browser artifacts, or environment secrets.

See [PACKAGING.md](PACKAGING.md) for public subpaths, ESM interoperability,
plugin contracts, starter templates, provenance, and the release workflow.

Generated applications should use the CLI and keep their own application
contracts, migrations, routes, repositories, and tests under version control.
