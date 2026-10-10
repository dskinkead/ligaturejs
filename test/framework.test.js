import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { frameworkTarget, frameworkSupport, frameworkCompatibility, frameworkRelease, frameworkFeatureStatus } from "../src/index.js"

test("framework target makes the supported product boundary explicit", () => {
  assert.deepEqual(frameworkTarget, {
    schema: "ligaturejs.target.v1",
    architecture: "server-first",
    application: "html-oriented",
    enhancement: "progressive",
    hydration: "optional",
    clientJavaScript: "optional"
  })
  assert.equal(Object.isFrozen(frameworkTarget), true)
})

test("framework support contract defines runtime, browser, and OS baselines", () => {
  assert.deepEqual(frameworkSupport, {
    schema: "ligaturejs.support.v1",
    server: {
      runtime: "Node.js",
      minimum: "20.0.0",
      supportedMajors: ["20.x", "22.x"],
      operatingSystems: ["Linux (x64/arm64)", "macOS 12+ (x64/arm64)", "Windows 10+ (x64)"]
    },
    browser: {
      policy: "evergreen",
      minimumVersions: { chromium: "109", firefox: "115", safari: "16.4" },
      operatingSystems: ["Windows 10+", "macOS 12+", "iOS 16.4+", "Android 12+"]
    },
    verification: { nodeCi: ["20.x", "22.x"], browserCi: "Chromium via Playwright" }
  })
  assert.equal(Object.isFrozen(frameworkSupport), true)
  assert.equal(Object.isFrozen(frameworkSupport.server), true)
  assert.equal(Object.isFrozen(frameworkSupport.browser.minimumVersions), true)
  assert.equal(Object.isFrozen(frameworkSupport.verification.nodeCi), true)
})

test("support docs, package engines, and CI matrix agree with the support contract", () => {
  const documentation = readFileSync(new URL("../docs/SUPPORT.md", import.meta.url), "utf8")
  const packageManifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))
  const workflow = readFileSync(new URL("../.github/workflows/test.yml", import.meta.url), "utf8")

  assert.match(documentation, /^## Server runtime$/m)
  assert.match(documentation, /Node\.js 20\.x and 22\.x/)
  assert.match(documentation, /Chromium 109\+, Firefox 115\+, and Safari 16\.4\+/)
  assert.match(documentation, /not a promise of cross-browser CI coverage/)
  assert.equal(packageManifest.engines.node, ">=20.0.0")
  assert.match(workflow, /node-version: \[20\.x, 22\.x\]/)
})

test("supported-target docs state the React boundary and explicit non-targets", () => {
  const documentation = readFileSync(new URL("../docs/SUPPORTED-TARGET.md", import.meta.url), "utf8")

  assert.match(documentation, /^## Relationship to React$/m)
  assert.match(documentation, /^## Explicit non-targets$/m)
  assert.match(documentation, /server response and\s+ordinary HTML as the primary application surface/)
  assert.match(documentation, /does not provide a React compatibility layer/)
  assert.match(documentation, /offline-first or local-only applications/)
  assert.match(documentation, /highly interactive graphics, games, or editors/)
})

test("progressive-rendering guidance matches the current server contract", () => {
  const documentation = readFileSync(new URL("../docs/PROGRESSIVE-RENDERING.md", import.meta.url), "utf8")

  assert.match(documentation, /^# Progressive rendering guidance$/m)
  assert.match(documentation, /does not expose a framework-level `renderToStream` API/)
  assert.match(documentation, /complete, deterministic HTML\s+strings/)
  assert.match(documentation, /explicit\s+`options\.id`/)
  assert.match(documentation, /JavaScript is optional/)
  assert.match(documentation, /Native streaming\s+rendering remains planned/)
})

test("compatibility policy is immutable and machine-readable", () => {
  assert.equal(frameworkCompatibility.schema, "ligaturejs.compatibility.v1")
  assert.ok(frameworkCompatibility.publicSurface.includes("documented APIs"))
  assert.equal(frameworkCompatibility.deprecations.removal, "next major version at the earliest")
  assert.equal(Object.isFrozen(frameworkCompatibility), true)
  assert.equal(Object.isFrozen(frameworkCompatibility.publicSurface), true)
  assert.equal(Object.isFrozen(frameworkCompatibility.deprecations), true)
})

test("compatibility docs publish the public surface and deprecation process", () => {
  const documentation = readFileSync(new URL("../docs/COMPATIBILITY.md", import.meta.url), "utf8")

  assert.match(documentation, /^## Supported public surface$/m)
  assert.match(documentation, /^## Compatibility rules$/m)
  assert.match(documentation, /^## Deprecation process$/m)
  assert.match(documentation, /Incompatible machine-readable contract changes use a new schema version;\s+consumers/)
  assert.match(documentation, /retain the old\s+behavior through at least the next major version/)
  assert.match(documentation, /agentTagsMiddleware/)
})

test("release contract defines pre-1.0 and stable versioning rules", () => {
  assert.deepEqual(frameworkRelease, {
    schema: "ligaturejs.release.v1",
    versioning: {
      standard: "SemVer 2.0.0",
      pre1_0: {
        breaking: "increment minor",
        feature: "increment minor",
        fix: "increment patch",
        compatibility: "not guaranteed across minor releases"
      },
      stable: {
        breaking: "increment major",
        feature: "increment minor",
        fix: "increment patch"
      }
    },
    support: {
      pre1_0: "latest minor line only; support ends when the next minor line is released",
      stableCurrentMajor: "latest minor line receives features, bug fixes, and security fixes",
      stablePreviousMajor: "security and critical fixes for 12 months after the successor major release",
      prerelease: "no maintenance window; compatibility may change between prerelease versions"
    }
  })
  assert.equal(Object.isFrozen(frameworkRelease), true)
  assert.equal(Object.isFrozen(frameworkRelease.versioning), true)
  assert.equal(Object.isFrozen(frameworkRelease.versioning.pre1_0), true)
  assert.equal(Object.isFrozen(frameworkRelease.versioning.stable), true)
  assert.equal(Object.isFrozen(frameworkRelease.support), true)
})

test("release docs define SemVer and maintenance windows", () => {
  const documentation = readFileSync(new URL("../docs/RELEASE.md", import.meta.url), "utf8")
  const packageManifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"))

  assert.match(documentation, /^## Semantic versioning$/m)
  assert.match(documentation, /^## Release support windows$/m)
  assert.match(documentation, /After `1\.0\.0`, the normal rules apply/)
  assert.match(documentation, /previous stable major receives security and critical fixes for twelve\s+months/)
  assert.match(packageManifest.version, /^0\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/)
})

test("feature status contract represents every published maturity status", () => {
  assert.equal(frameworkFeatureStatus.schema, "ligaturejs.feature-status.v1")
  assert.deepEqual(frameworkFeatureStatus.statuses, ["stable", "experimental", "planned", "unsupported"])
  assert.equal(Object.isFrozen(frameworkFeatureStatus), true)
  assert.equal(Object.isFrozen(frameworkFeatureStatus.statuses), true)
  assert.equal(Object.isFrozen(frameworkFeatureStatus.features), true)

  const ids = new Set()
  const statuses = new Set()
  for (const feature of frameworkFeatureStatus.features) {
    assert.equal(Object.isFrozen(feature), true)
    assert.match(feature.id, /^[a-z0-9-]+$/)
    assert.equal(ids.has(feature.id), false)
    ids.add(feature.id)
    statuses.add(feature.status)
    assert.ok(feature.area)
    assert.ok(feature.summary)
  }

  assert.deepEqual([...statuses].sort(), ["experimental", "planned", "stable", "unsupported"])
})

test("feature status documentation describes and lists the machine-readable matrix", () => {
  const documentation = readFileSync(new URL("../docs/FEATURE-STATUS.md", import.meta.url), "utf8")

  assert.match(documentation, /^# Feature status matrix$/m)
  assert.match(documentation, /frameworkFeatureStatus\.schema/)
  for (const status of frameworkFeatureStatus.statuses) {
    assert.match(documentation, new RegExp("\\*\\*" + status + "\\*\\*"))
    assert.match(documentation, new RegExp("\\| " + status + " \\|"))
  }
  const matrixRows = documentation.match(/^\| .+ \| (stable|experimental|planned|unsupported) \|/gm) ?? []
  assert.equal(matrixRows.length, frameworkFeatureStatus.features.length)
})
