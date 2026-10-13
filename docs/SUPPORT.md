# Supported environments

This document defines the environments covered by the Ligature release
candidate. The same matrix is available to tools as `frameworkSupport` from
the package entrypoint.

## Server runtime

- Node.js 22.x and 24.x are supported.
- Node.js **22.13.0** is the minimum version (`package.json` declares
  `engines.node >=22.13.0`).
- Supported server operating systems are Linux (x64/arm64), macOS 12 or
  newer (x64/arm64), and Windows 10 or newer (x64), subject to Node.js
  support for the selected release.

The CI workflow runs the Node test suite on both supported major lines. A
future Node.js major is not supported until it is added to this matrix and
verified.

## Browser runtime

The optional browser runtime supports evergreen browsers at or above these
engine baselines: Chromium 109+, Firefox 115+, and Safari 16.4+.

| Engine | Minimum version |
| --- | ---: |
| Chromium (Chrome/Edge) | 109 |
| Firefox | 115 |
| Safari/WebKit | 16.4 |

Supported browser operating systems are Windows 10 or newer, macOS 12 or
newer, iOS 16.4 or newer, and Android 12 or newer. The browser runtime uses
standard `fetch`, `DOMParser`, `MutationObserver`, `history`, and element
replacement APIs; applications remain responsible for any APIs they use in
their own components.

The repository automated browser verification currently runs Chromium via
Playwright. That is verification coverage, not a promise of cross-browser CI coverage. Browser support is limited to the listed evergreen baselines and
does not include Internet Explorer or embedded webviews with independently
lagging engines.

## Compatibility scope

This is an environment support policy, not the release maintenance window.
Semantic-versioning rules and release-line maintenance are defined in
[`docs/RELEASE.md`](RELEASE.md). When a baseline changes, update
`frameworkSupport`, this document, `package.json`, CI, and the focused
framework contract tests in one change.
