export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]))
}

// Text and attribute values use the same HTML escaping rules. Keep the
// context-specific names available so templates communicate their intent.
export const escapeText = escapeHtml
export const escapeAttribute = escapeHtml

export function escapeUrl(value) {
  const url = String(value ?? '')
  if (/[\u0000-\u001f\u007f\u2028\u2029]/.test(url)) throw new TypeError('Unsafe URL: control characters are not allowed')
  const scheme = url.match(/^([a-z][a-z0-9+.-]*):/i)?.[1].toLowerCase()
  if (scheme && !['http', 'https', 'mailto', 'tel'].includes(scheme)) {
    throw new TypeError(`Unsafe URL scheme: ${scheme}`)
  }
  return escapeAttribute(url)
}

export function escapeStyle(value) {
  const style = String(value ?? '')
  // Inline CSS is an attribute context, but CSS can still invoke script or
  // terminate a surrounding style element when it is reused in a stylesheet.
  // Reject URL-bearing and legacy execution constructs rather than trying to
  // parse the full CSS grammar here.
  if (/[\u0000-\u001f\u007f\u2028\u2029]/.test(style) || /<\s*\/\s*style|expression\s*\(|(?:java|vb)script\s*:|@import\b|-moz-binding\s*:|behavior\s*:|url\s*\(|\\[0-9a-f]{1,6}\s*(?:avascript|bscript)\s*:/i.test(style)) {
    throw new TypeError('Unsafe inline style value')
  }
  return escapeAttribute(style)
}

const safeTags = new Set(['a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'em', 'i', 'img', 'li', 'mark', 'ol', 'p', 'pre', 'q', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'ul'])
const voidTags = new Set(['br', 'img'])
const safeAttributes = new Set(['alt', 'cite', 'class', 'datetime', 'id', 'name', 'rel', 'role', 'target', 'title', 'width', 'height'])

/**
 * Sanitize an application-controlled HTML fragment for the small raw-HTML
 * surface supported by Ligature. This is deliberately an allowlist, not a
 * general HTML parser or a replacement for a maintained sanitizer for rich
 * user content.
 */
export function sanitizeHtml(value) {
  if (typeof value !== 'string') throw new TypeError('sanitizeHtml(value) requires a string')
  let source = value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(?:script|style|template|iframe|object|embed|noscript)\b[^>]*>[\s\S]*?<\/\s*(?:script|style|template|iframe|object|embed|noscript)\s*>/gi, '')

  return source.replace(/<[^>]*>|[^<]+/g, token => {
    if (!token.startsWith('<')) return token
    const closing = token.match(/^<\s*\/\s*([a-z][a-z0-9-]*)\s*>$/i)
    if (closing) return safeTags.has(closing[1].toLowerCase()) ? `</${closing[1].toLowerCase()}>` : ''
    const opening = token.match(/^<\s*([a-z][a-z0-9-]*)([\s\S]*?)\s*\/?>$/i)
    if (!opening) return ''
    const tag = opening[1].toLowerCase()
    if (!safeTags.has(tag)) return ''
    const attrs = []
    const attributeSource = opening[2]
    const attributePattern = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g
    for (const match of attributeSource.matchAll(attributePattern)) {
      const name = match[1].toLowerCase()
      const attrValue = match[2] ?? match[3] ?? match[4] ?? ''
      if (name.startsWith('on') || name === 'style' || name.startsWith('xmlns') || name.startsWith(' formaction')) continue
      if (name === 'href' || name === 'src') {
        // Browsers decode character references before navigating. Reject them
        // here so `java&#x73;cript:` cannot bypass escapeUrl's scheme check.
        if (/&#(?:x[0-9a-f]+|[0-9]+);/i.test(attrValue)) continue
        try { attrs.push(`${name}="${escapeUrl(attrValue)}"`) } catch { /* drop unsafe URL attributes */ }
      } else if (safeAttributes.has(name) || name.startsWith('aria-') || name.startsWith('data-')) {
        attrs.push(`${name}="${escapeAttribute(attrValue)}"`)
      }
    }
    return `<${tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}${voidTags.has(tag) ? '>' : '>'}`
  })
}

/** Explicit opt-in for inserting a sanitized HTML fragment into trusted component output. */
export const rawHtml = sanitizeHtml
