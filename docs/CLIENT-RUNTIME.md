# Client runtime bundle

Ligature publishes the browser runtime as two generated, dependency-free files:

- `dist/ligature-runtime.js` — readable development bundle.
- `dist/ligature-runtime.min.js` — production bundle with insignificant
  whitespace removed.

The bundles are generated from `clientRuntime()` in `src/client.js`; do not edit
`dist` by hand. Run `npm run build:runtime` after changing the runtime. The
reproducible check is `npm run check:runtime`, and it fails if either generated
file is stale or exceeds its budget:

| Bundle | Raw budget | Gzip budget |
| --- | ---: | ---: |
| Development | 35,000 bytes | 9,000 bytes |
| Production | 35,000 bytes | 9,000 bytes |

The gzip measurement uses deterministic output (`mtime: 0`) so CI and local
checks compare the same artifact. `npm run release:check` includes this check.
The runtime remains optional: server-rendered HTML is still the supported
baseline when no browser bundle is loaded.
