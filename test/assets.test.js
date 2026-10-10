import test from 'node:test'
import assert from 'node:assert/strict'
import { assetVersion, assetUrl, assetDescriptor, importAsset, sanitizeSvg, preloadLink, criticalCss } from '../src/assets.js'
import { defineTheme, themeCss } from '../src/themes.js'
import { bundleStyles } from '../src/styles.js'
import { createComponentRegistry } from '../src/server.js'
import { defineComponent } from '../src/component.js'

test('asset URLs are content-addressed', () => { assert.equal(assetVersion('a'), assetVersion('a')); assert.notEqual(assetVersion('a'), assetVersion('b')); assert.match(assetUrl('/assets', 'x', 'a'), /x\.js\?v=/) })
test('asset descriptors expose immutable versions and cache metadata', () => { const asset = assetDescriptor({ name: 'logo', type: 'image', extension: 'svg', source: '<svg />' }); assert.match(asset.url, /logo\.svg\?v=/); assert.equal(asset.cacheControl, 'public, max-age=31536000, immutable'); assert.ok(Object.isFrozen(asset)); assert.throws(() => assetDescriptor({ name: 'Bad Name' }), /kebab-case/) })
test('asset imports infer supported image/font types and sanitize SVGs', () => {
  const asset = importAsset({ name: 'logo.svg', source: '<svg viewBox="0 0 1 1"><path d="M0 0"/></svg>' })
  assert.equal(asset.type, 'image')
  assert.match(asset.url, /logo\.svg\?v=/)
  assert.throws(() => importAsset({ name: 'font.exe', source: 'x' }), /Unsupported asset extension/)
  assert.throws(() => sanitizeSvg('<svg><script>alert(1)</script></svg>'), /Unsafe SVG/)
  assert.throws(() => sanitizeSvg('<svg><use href="javascript:alert(1)"/></svg>'), /Unsafe SVG/)
})
test('critical CSS and preload helpers are bounded and deterministic', () => {
  const asset = importAsset({ name: 'app.woff2', source: 'font-bytes' })
  const critical = criticalCss('body{margin:0}', { maxBytes: 20 })
  assert.deepEqual(critical, { css: 'body{margin:0}', bytes: 14, version: assetVersion('body{margin:0}') })
  assert.match(preloadLink(asset, { crossorigin: true }), /rel="preload".*as="font" crossorigin/)
  assert.throws(() => criticalCss('0123456789', { maxBytes: 3 }), /exceeds/)
})
test('component styles are discoverable and served as assets', () => { const registry = createComponentRegistry().register(defineComponent({ name: 'styled-card', styles: '.styled-card{color:red}', render: () => '<article class="styled-card"></article>' })); assert.equal(registry.assets().find(asset => asset.type === 'style').source, '.styled-card{color:red}') })
test('style bundles scope, order, deduplicate, and expose a source map', () => {
  const one = defineComponent({ name: 'z-card', styles: { css: '.card, :global(body){color:red}', order: 2, source: 'card.css' }, render: () => '' })
  const two = defineComponent({ name: 'a-card', styles: { css: '.card{color:red}', order: 1 }, render: () => '' })
  const bundle = bundleStyles([one, two])
  assert.match(bundle.css, /data-agent-component="a-card"\] \.card/)
  assert.match(bundle.css, /data-agent-component="z-card"\] \.card/)
  assert.match(bundle.css, /:global|body/)
  assert.equal(bundle.map.sources.length, 2)
  assert.match(bundle.css, /sourceMappingURL=data:application\/json;base64/)
})
test('themes generate safe tokens and preference overrides', () => {
  const theme = defineTheme('app', { tokens: { color: 'white', 'space-sm': '0.5rem' }, dark: { color: 'black' }, reducedMotion: { 'motion-duration': '0ms' } })
  assert.match(theme.css, /data-theme="app"/) 
  assert.match(theme.css, /prefers-color-scheme: dark/)
  assert.match(theme.css, /prefers-reduced-motion: reduce/)
  assert.equal(themeCss({ color: 'red' }, { selector: ':root' }), ':root{--color:red;}')
  assert.throws(() => themeCss({ color: 'red; color: blue' }), /unsafe/)
})
