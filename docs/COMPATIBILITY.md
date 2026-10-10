# Compatibility and deprecation policy

This policy describes the compatibility promise for Ligature's documented
framework surface. It applies to the private release candidate as a published
design contract; it does not authorize publication of the package.

The machine-readable summary is exported as `frameworkCompatibility`:

```js
import { frameworkCompatibility } from 'ligaturejs'

frameworkCompatibility.schema // 'ligaturejs.compatibility.v1'
```

## Supported public surface

The supported surface consists of:

- package exports documented in [`docs/API.md`](API.md) and their TypeScript
  declarations;
- behavior explicitly described by those API reference entries;
- versioned JSON/application/component contracts in `schemas/`; and
- the server-rendered HTML mount markers documented in the rendering contract.

The following are not compatibility commitments: internal modules that are not
exported, incidental object fields, exact error-message wording unless an API
entry says otherwise, generated HTML whitespace or wrapper choices not
identified as contract markers, and implementation details of the example
application.

Compatibility is behavioral. A refactor may change internal code while
preserving the documented inputs, outputs, errors, lifecycle guarantees, and
machine-readable contracts.

## Compatibility rules

- Documented JavaScript APIs preserve their documented behavior within a major
  version. Additive optional fields and APIs are allowed when they do not
  invalidate existing callers.
- Incompatible machine-readable contract changes use a new schema version;
  consumers must be able to identify the version before interpreting it.
- Documented HTML attributes such as `data-agent-component`,
  `data-agent-instance`, and `data-agent-props` remain stable while their
  documented rendering contract is supported.
- The package's release/version support window is defined separately in the
  release policy; this document does not promise support for every Node.js,
  browser, or operating-system version.

## Deprecation process

When a supported API needs replacement, Ligature will, when practical:

1. mark the old name or behavior as deprecated in the API reference,
   declarations, and source documentation;
2. document the replacement and a migration example in the same change;
3. record the deprecation in the changelog/release notes and retain the old
   behavior through at least the next major version; and
4. remove it only in a major release, with the removal listed in the release
   notes.

Deprecation warnings are not emitted by default because framework libraries
must not write unexpected output during server rendering. A future diagnostic
or development mode may surface warnings without changing production HTML.

Security, legal, or irreparably broken behavior may require restricting or
removing an API sooner. Such an exception must be documented with its impact,
replacement or mitigation, and the affected version.

The current legacy aliases are `agentTagsMiddleware` for
`ligatureMiddleware`, and the `css` component-definition field for `styles`.
Both are explicitly annotated in the source/declarations and listed with
migrations in [`API.md`](API.md). They remain supported through the next
major release; new code should use only the canonical names.
