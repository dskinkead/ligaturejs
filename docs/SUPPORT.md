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

The CI workflow runs the Node test suite on the declared minimum (22.13.0), the
current 22.x line, and 24.x on Ubuntu 24.04, macOS 14, and Windows Server 2022
GitHub-hosted runners (`npm run test:server`). Real-browser and visual tests
remain in the pinned Ubuntu Playwright container. This samples each supported
server OS family; it does not independently verify every listed minimum OS
version or CPU architecture. A configured matrix is not evidence of a passing
run: release readiness requires green CI results for all nine server jobs.
A future Node.js major is not supported until it is added to this matrix and
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

Push and pull-request CI runs Chromium browser checks. The release gate also
runs an engine smoke contract in Chromium, Firefox, and WebKit; this does not
test every supported browser/OS combination or prove the listed minimum engine
versions individually. The browser compatibility checks and their limits are
described in [Testing](TESTING.md). Support does not include Internet Explorer
or embedded webviews with independently lagging engines.

## Compatibility scope

This is an environment support policy, not the release maintenance window.
Semantic-versioning rules and release-line maintenance are defined in
[`docs/RELEASE.md`](RELEASE.md). When a baseline changes, update
`frameworkSupport`, this document, `package.json`, CI, and the focused
framework contract tests in one change.
