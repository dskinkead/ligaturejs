# Release Policy and Checklist

The machine-readable release policy is exported as `frameworkRelease`:

```js
import { frameworkRelease } from 'ligaturejs'

frameworkRelease.schema // 'ligaturejs.release.v1'
```

## Semantic versioning

Ligature uses [Semantic Versioning 2.0.0](https://semver.org/) for package
versions. This source tree prepares `0.1.0-rc.2`; publication runs separately
through the release workflow. The pre-1.0 rules apply:

- `0.y.z` breaking API or machine-readable contract changes increment `y`.
- `0.y.z` compatible features also increment `y`.
- `0.y.z` fixes, documentation-only changes, and internal changes that do not
  alter a documented contract increment `z`.
- Compatibility across pre-1.0 minor lines is not guaranteed. A migration
  note is required for a breaking change.

After `1.0.0`, the normal rules apply: breaking changes increment the major
version, compatible features increment the minor version, and fixes increment
the patch version. Pre-release identifiers such as `-rc.1` follow SemVer and
are not covered by a maintenance window.

Incompatible versioned schemas must also receive a new schema identifier; a
package version alone is not enough for a consumer to safely interpret data.

## Release support windows

- During `0.x`, only the latest minor line is maintained. Support for `0.y.x`
  ends when `0.(y+1).x` is released.
- After `1.0.0`, the latest minor line of the current major receives features,
  bug fixes, and security fixes.
- The previous stable major receives security and critical fixes for twelve
  months after its successor major is released.
- Older lines and pre-release identifiers have no maintenance guarantee.
- A release is supported only on the Node.js, browser, and operating-system
  baselines in [`docs/SUPPORT.md`](SUPPORT.md) for that release. Changing a
  baseline requires updating `frameworkSupport`, the support document, CI,
  and focused contract tests together.

This policy describes project maintenance expectations; publication remains a
separate, explicitly authorized operation.

## Release checklist

Before packaging an application:

1. Run `npm test`.
2. Run browser and accessibility tests.
3. Validate the application manifest.
4. Run the application contract checker.
5. Review migrations and rollback steps.
6. Verify health/readiness checks.
7. Record the version and generated asset hashes.
8. Produce a release note listing changed components, routes, repositories, and data impact.
