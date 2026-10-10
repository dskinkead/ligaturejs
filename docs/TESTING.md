# Testing server-rendered components

Ligature supports two complementary render-test styles:

- **Snapshots** lock down the complete HTML contract, including component
  markers, deterministic instance IDs, escaped props, and markup signatures.
  Keep snapshots as reviewed plain-text fixtures and compare them without an
  update flag. A changed snapshot should be an intentional contract change.
- **Semantic render tests** assert the user-visible structure and meaning with
  element names, classes, attributes, and text. Use these for behavior that
  should survive harmless changes to framework-generated metadata.

The repository's `test/helpers/render-test.js` provides the dependency-free
`assertRenderSnapshot()` and `semanticRender()` helpers used by
`test/rendering.test.js`. The semantic selector subset supports element names,
`.class`, `[attribute]`, and `[attribute="value"]`; it is intentionally small
and is not an HTML sanitizer or a browser DOM implementation.

Both styles rely on the server-rendering contract: rendering the same component
tree, props, and options is deterministic, and application values must be
escaped before being placed in trusted component HTML. Run the focused suite
with:

```sh
node --test test/rendering.test.js
```

## Browser compatibility checks

The Playwright suite includes `test/browser-compatibility.test.js`, a shared
smoke contract for the supported Chromium, Firefox, and WebKit (Safari)
engines. It verifies that server-rendered markup can be enhanced and mounted,
then cleaned up after DOM removal in each engine. Run it with:

```sh
npm run test:playwright
```

The check runs each engine whose Playwright browser binary is installed and
reports an explicit skip for missing binaries. Install all three browser
bundles when validating the full compatibility matrix:

```sh
npx playwright install chromium firefox webkit
```

These are engine smoke tests, not a claim that every browser/OS combination
listed in `docs/SUPPORT.md` is continuously tested.

## Visual regression fixtures

The example application has reviewed Chromium screenshots for the home page and
the long-form guide in `test/fixtures/visual/`. They use a fixed 1280×720
viewport, device scale factor 1, and a local Chromium binary. Run the focused
check with:

```sh
npm run test:visual
```

When an intentional visual change is reviewed, regenerate both fixtures with
`npm run update:visual`, then inspect the resulting PNGs in the change. The
update command is deliberately explicit so an ordinary test run cannot rewrite
reviewed artifacts. These fixtures are Chromium-specific; cross-browser
behavior remains covered by the browser compatibility suite.
## Quality and release gates

Accessibility requirements, semantic primitives, and the generated-app
baseline are documented in [`docs/ACCESSIBILITY.md`](ACCESSIBILITY.md).

The focused quality gates are:

- `npm run check:performance` enforces the representative server-render budget,
  the minified runtime gzip budget, and the critical-CSS budget. It prints the
  measured values as JSON for CI artifacts.
- `npm run check:consumer` packs the current project, installs that tarball in
  a clean temporary consumer, and imports/renders through the public package
  export. This catches missing shipped files and broken package boundaries.
- `npm run test:a11y` runs axe against the example application; keyboard and
  semantic contracts are covered by `test/accessibility.test.js`.
- `npm run test:playwright` is run for Chromium, Firefox, and WebKit in CI.
  Local runs skip engines whose Playwright binaries are not installed.

`npm run release:check` includes these gates as well as the complete unit,
browser, visual, runtime, schema, dependency, and package checks.
## Packaging and release

`npm run check:packaging` verifies ESM subpath exports, declaration targets,
templates, and the public component/plugin boundaries. `npm run build:provenance`
updates deterministic source metadata; `npm run release:check` verifies it along
with the package, browser, accessibility, schema, dependency, and documentation
checks.
