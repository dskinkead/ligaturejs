// Product-level contract for what Ligature is designed to build.
// Keep this separate from an application's manifest: it describes the
// framework target, not an application's routes or components.
export const frameworkTarget = Object.freeze({
  schema: 'ligaturejs.target.v1',
  architecture: 'server-first',
  application: 'html-oriented',
  enhancement: 'progressive',
  hydration: 'optional',
  clientJavaScript: 'optional'
})

// Support is deliberately a separate contract from frameworkTarget: target
// describes application architecture, while this describes environments that
// receive compatibility coverage.
export const frameworkSupport = Object.freeze({
  schema: 'ligaturejs.support.v1',
  server: Object.freeze({
    runtime: 'Node.js',
    minimum: '22.13.0',
    supportedMajors: Object.freeze(['22.x', '24.x']),
    operatingSystems: Object.freeze([
      'Linux (x64/arm64)',
      'macOS 12+ (x64/arm64)',
      'Windows 10+ (x64)'
    ])
  }),
  browser: Object.freeze({
    policy: 'evergreen',
    minimumVersions: Object.freeze({
      chromium: '109',
      firefox: '115',
      safari: '16.4'
    }),
    operatingSystems: Object.freeze([
      'Windows 10+',
      'macOS 12+',
      'iOS 16.4+',
      'Android 12+'
    ])
  }),
  verification: Object.freeze({
    nodeCi: Object.freeze(['22.13.0', '22.x', '24.x']),
    browserCi: 'Chromium via Playwright'
  })
})

// This is intentionally a small, machine-readable summary of the published
// policy. The full rationale and examples live in docs/COMPATIBILITY.md.
export const frameworkCompatibility = Object.freeze({
  schema: 'ligaturejs.compatibility.v1',
  publicSurface: Object.freeze(['package exports', 'documented APIs', 'versioned schemas', 'documented HTML mount markers']),
  undocumentedSurface: 'internal modules, incidental object fields, exact error wording, and example-app implementation details',
  apiChanges: 'preserve documented behavior within a major version; use a deprecation period before removal when practical',
  schemaChanges: 'introduce a new schema version for incompatible machine-readable contract changes',
  deprecations: Object.freeze({
    announcement: 'documentation and changelog',
    replacement: 'documented before removal',
    removal: 'next major version at the earliest',
    securityException: 'security or legal issues may require immediate restriction or removal'
  })
})

// Release policy is separate from API compatibility: it describes how package
// versions communicate change and how long release lines receive maintenance.
export const frameworkRelease = Object.freeze({
  schema: 'ligaturejs.release.v1',
  versioning: Object.freeze({
    standard: 'SemVer 2.0.0',
    pre1_0: Object.freeze({
      breaking: 'increment minor',
      feature: 'increment minor',
      fix: 'increment patch',
      compatibility: 'not guaranteed across minor releases'
    }),
    stable: Object.freeze({
      breaking: 'increment major',
      feature: 'increment minor',
      fix: 'increment patch'
    })
  }),
  support: Object.freeze({
    pre1_0: 'latest minor line only; support ends when the next minor line is released',
    stableCurrentMajor: 'latest minor line receives features, bug fixes, and security fixes',
    stablePreviousMajor: 'security and critical fixes for 12 months after the successor major release',
    prerelease: 'no maintenance window; compatibility may change between prerelease versions'
  })
})

// Feature status is intentionally separate from frameworkTarget and
// frameworkRelease: it describes the maturity and scope of individual
// capabilities, not the application's architecture or package version.
const featureStatuses = Object.freeze(['stable', 'experimental', 'planned', 'unsupported'])

const featureEntries = [
  ['server-rendering', 'Rendering', 'stable', 'Deterministic server rendering of useful HTML with component mount metadata.'],
  ['component-contracts', 'Components', 'stable', 'Validated component definitions with props, rendering, and lifecycle contracts.'],
  ['component-composition', 'Components', 'stable', 'Nested components, children, named slots, and scoped render context.'],
  ['route-and-repository-boundaries', 'Application architecture', 'stable', 'Explicit route and repository contracts for server-side application boundaries.'],
  ['input-validation-and-csrf', 'Security', 'stable', 'Input validation and CSRF primitives for server-rendered forms and actions.'],
  ['progressive-browser-enhancement', 'Browser runtime', 'experimental', 'Optional client lifecycle, DOM enhancement, and partial navigation behavior.'],
  ['ajax-navigation', 'Browser runtime', 'experimental', 'Enhanced navigation that preserves ordinary links and server responses as a fallback.'],
  ['hydration-islands', 'Rendering', 'experimental', 'Per-instance eager, idle, visible, and manual activation for explicitly interactive components.'],
  ['streaming-rendering', 'Rendering', 'planned', 'Streaming responses and framework guidance for progressive document rendering.'],
  ['typed-component-schemas', 'TypeScript and schemas', 'stable', 'Typed prop declarations and generated JSON Schema are derived from component definitions.'],
  ['database-adapters', 'Data', 'planned', 'Portable production database adapters beyond the current reference boundaries.'],
  ['react-compatibility-layer', 'Interoperability', 'unsupported', 'Drop-in React components, hooks, JSX runtime, or React render-tree compatibility.'],
  ['offline-first-applications', 'Application architecture', 'unsupported', 'Applications whose authoritative state and primary experience live only in the browser.'],
  ['client-owned-graphics-and-editors', 'Application architecture', 'unsupported', 'Games, graphics, or editors requiring a continuously client-owned render loop.']
]

export const frameworkFeatureStatus = Object.freeze({
  schema: 'ligaturejs.feature-status.v1',
  statuses: featureStatuses,
  features: Object.freeze(featureEntries.map(([id, area, status, summary]) => Object.freeze({
    id,
    area,
    status,
    summary
  })))
})
