# Styling

Ligature treats styles as component-owned input. A component may use the
legacy string form or the explicit form:

```js
styles: {
  css: '.card { color: var(--card-color); }',
  scope: 'component', // default; use global only deliberately
  order: 20,
  layer: 'components',
  source: 'card.css'
}
```

Component-scoped CSS is emitted under the component's
`[data-agent-component="name"]` marker. Use `:global(selector)` for a
deliberate global escape hatch. Global styles are not rewritten and should be
limited to tokens, resets, and application-wide primitives.

`bundleStyles(components)` sorts by `order`, then component name, removes
duplicate global style entries (component-scoped rules remain per component), and returns content hash metadata plus an inline
source-map data URL. Pass `{ sourceMap: false }` for a deployment artifact
where source maps are not desired. The Express middleware continues to serve
individual component CSS; use the bundle helper when producing one stylesheet.

The framework does not rewrite arbitrary CSS values or sanitize CSS. Keep
component styles trusted source files and validate any user-controlled values
before they reach CSS. `styles` is the canonical field; `css` remains a
deprecated compatibility alias through the current compatibility window.

## Themes and preferences

Use `defineTheme(name, { tokens, dark, reducedMotion })` for validated CSS
custom properties. Token names are kebab-case and values cannot contain CSS
statement delimiters. The generated CSS uses a `[data-theme="name"]` selector
and emits `prefers-color-scheme: dark` and `prefers-reduced-motion: reduce`
overrides when supplied. Applications choose when to set `data-theme`; the
server remains the authority for the initial theme to avoid a flash of the
wrong theme. Keep semantic colors and motion durations as tokens rather than
duplicating component rules.

Asset descriptors from `assetDescriptor` include a SHA-256 content version,
versioned URL, and immutable cache policy. The Express middleware emits the
same content version as an `ETag` and sends one-year immutable cache headers
for runtime, client, and component CSS assets. Use the descriptor URL (or
`assetUrl` for a custom asset type) when publishing images, fonts, or SVGs;
never derive a URL from untrusted input.

## Modules, imported assets, and critical CSS

Ligature's documented alternative to CSS Modules is marker-scoped CSS: the
`bundleStyles` helper rewrites component selectors under the stable component
marker and returns deterministic source-map metadata. This avoids a second
class-name compiler while preserving component isolation; use `:global(...)`
only for intentional application-wide rules.

Use `importAsset({ name, source })` for build-time images, fonts, and SVGs.
The extension is validated, the descriptor URL is content-addressed, and SVG
imports are rejected unless they contain only the conservative static SVG
allowlist. Do not use this helper for user-uploaded files; validate, isolate,
and scan those at the application boundary. `preloadLink(asset)` emits a
validated preload tag for the descriptor.

Keep only above-the-fold rules in `criticalCss(css)`. It enforces a 16 KiB
default budget and returns bytes plus a content version for observability.
Inline the returned CSS in the document head, then load the full stylesheet
with a versioned descriptor URL. Preload fonts with `preloadLink` and include
`crossorigin` when the font is served from another origin.
