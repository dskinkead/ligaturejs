import crypto from 'node:crypto'

export function assetVersion(source) { return crypto.createHash('sha256').update(source).digest('hex').slice(0, 16) }
export function assetUrl(prefix, name, source, extension = 'js') {
  const suffix = String(extension).replace(/^\./, '')
  if (!/^[a-z0-9]+$/i.test(suffix)) throw new TypeError('assetUrl extension must be alphanumeric')
  return `${prefix}/${encodeURIComponent(name)}.${suffix}?v=${assetVersion(source)}`
}

export function assetDescriptor({ prefix = '/__agent_tags/components', name, type = 'binary', source = '', extension = type === 'style' ? 'css' : type }) {
  if (!name || !/^[a-z][a-z0-9-]*$/i.test(name)) throw new TypeError('assetDescriptor name must be kebab-case')
  const version = assetVersion(source)
  return Object.freeze({ name, type, source, version, url: assetUrl(prefix, name, source, extension), cacheControl: 'public, max-age=31536000, immutable' })
}

const assetTypes = new Map([
  ['css', 'style'], ['js', 'script'], ['mjs', 'script'], ['svg', 'image'],
  ['png', 'image'], ['jpg', 'image'], ['jpeg', 'image'], ['webp', 'image'], ['avif', 'image'],
  ['gif', 'image'], ['woff', 'font'], ['woff2', 'font'], ['ttf', 'font'], ['otf', 'font']
])

/** Import a build-time asset and publish its immutable, content-addressed descriptor. */
export function importAsset({ name, source = '', type, extension, prefix = '/assets', sanitize = true } = {}) {
  if (typeof source !== 'string') throw new TypeError('importAsset source must be a string')
  const inferredExtension = String(extension ?? name?.split('.').pop() ?? '').replace(/^\./, '').toLowerCase()
  if (!assetTypes.has(inferredExtension)) throw new TypeError(`Unsupported asset extension: ${inferredExtension || '(missing)'}`)
  const resolvedType = type ?? assetTypes.get(inferredExtension)
  const resolvedSource = inferredExtension === 'svg' && sanitize ? sanitizeSvg(source) : source
  return assetDescriptor({ name: String(name).replace(/\.[^.]+$/, ''), source: resolvedSource, type: resolvedType, extension: inferredExtension, prefix })
}

/** Conservative SVG sanitizer for application-owned icons and illustrations. */
export function sanitizeSvg(value) {
  if (typeof value !== 'string') throw new TypeError('sanitizeSvg(value) requires a string')
  if (!/^\s*<svg\b/i.test(value) || !/<\/svg>\s*$/i.test(value)) throw new TypeError('sanitizeSvg requires one SVG root')
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) throw new TypeError('SVG contains control characters')
  if (/<\s*(?:script|foreignObject|iframe|object|embed|use)\b|\bon[a-z]+\s*=|(?:javascript|vbscript|data):/i.test(value)) throw new TypeError('Unsafe SVG content')
  if (/<!DOCTYPE|<!\[CDATA\[|<!--|<\?xml/i.test(value)) throw new TypeError('SVG declarations are not allowed')
  const tags = new Set(['svg', 'g', 'path', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'rect', 'defs', 'linearGradient', 'radialGradient', 'stop', 'clipPath', 'mask', 'title', 'desc'])
  const attributes = new Set(['xmlns', 'xmlns:xlink', 'href', 'xlink:href', 'id', 'class', 'fill', 'stroke', 'stroke-width', 'viewbox', 'preserveaspectratio', 'width', 'height', 'cx', 'cy', 'r', 'rx', 'ry', 'x', 'x1', 'x2', 'y', 'y1', 'y2', 'd', 'points', 'gradientunits', 'offset', 'stop-color', 'stop-opacity', 'fill-rule', 'clip-rule'])
  return value.replace(/<\/?\s*([a-z][a-z0-9]*)\b([^>]*)>/gi, (token, rawTag, rawAttributes) => {
    const closing = /^\s*\//.test(token.slice(1))
    const tag = rawTag
    if (!tags.has(tag)) throw new TypeError(`Unsupported SVG element: ${tag}`)
    if (closing) return `</${tag}>`
    const selfClosing = /\/\s*$/.test(rawAttributes)
    const source = rawAttributes.replace(/\/\s*$/, '')
    const output = []
    const attributePattern = /([:\w-]+)\s*=\s*(['"])(.*?)\2/g
    let consumed = 0
    for (const match of source.matchAll(attributePattern)) {
      if (source.slice(consumed, match.index).trim()) throw new TypeError('SVG attributes must be quoted')
      consumed = match.index + match[0].length
      const name = match[1].toLowerCase()
      const content = match[3]
      if (!attributes.has(name) || /[<>`]|(?:javascript|vbscript|data):/i.test(content)) throw new TypeError(`Unsafe SVG attribute: ${name}`)
      output.push(`${match[1]}="${escapeAttribute(content)}"`)
    }
    if (source.slice(consumed).trim()) throw new TypeError('Malformed SVG attributes')
    return `<${tag}${output.length ? ` ${output.join(' ')}` : ''}${selfClosing ? '/>' : '>'}`
  })
}

/** Generate a preload link for a trusted imported asset descriptor. */
export function preloadLink(asset, options = {}) {
  if (!asset || typeof asset.url !== 'string' || typeof asset.type !== 'string') throw new TypeError('preloadLink requires an asset descriptor')
  const as = options.as ?? (asset.type === 'font' ? 'font' : asset.type === 'style' ? 'style' : asset.type === 'script' ? 'script' : 'image')
  if (!['font', 'image', 'script', 'style', 'fetch'].includes(as)) throw new TypeError('preloadLink as must be a valid fetch destination')
  const crossorigin = options.crossorigin === true ? ' crossorigin' : ''
  return `<link rel="preload" href="${escapeAttribute(asset.url)}" as="${as}"${crossorigin}>`
}

/** Keep critical CSS inline and return a deterministic artifact for documentation/build tooling. */
export function criticalCss(source, { maxBytes = 16384 } = {}) {
  if (typeof source !== 'string' || !source.trim()) throw new TypeError('criticalCss source must be a non-empty string')
  if (!Number.isInteger(maxBytes) || maxBytes < 1) throw new TypeError('criticalCss maxBytes must be a positive integer')
  if (Buffer.byteLength(source) > maxBytes) throw new RangeError(`criticalCss exceeds ${maxBytes} bytes`)
  return Object.freeze({ css: source, bytes: Buffer.byteLength(source), version: assetVersion(source) })
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}
