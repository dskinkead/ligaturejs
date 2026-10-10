import crypto from 'node:crypto'

/**
 * Bundle normalized component styles in stable component/order/name order.
 * Component-scoped rules are prefixed with the component marker. Use :global
 * for an intentional escape hatch; it is removed from the emitted selector.
 */
export function bundleStyles(components, options = {}) {
  if (!Array.isArray(components)) throw new TypeError('bundleStyles(components) requires an array')
  const entries = components.map(component => {
    if (!component?.name) throw new TypeError('bundleStyles requires named components')
    const style = normalizeStyle(component.styles)
    return { component, style }
  }).filter(entry => entry.style.css)
    .sort((a, b) => (a.style.order - b.style.order) || a.component.name.localeCompare(b.component.name))
  const seen = new Set()
  const chunks = []
  const sources = []
  for (const { component, style } of entries) {
    const key = style.scope === 'global' ? `${style.scope}|${style.layer ?? ''}|${style.css}` : `${component.name}|${style.layer ?? ''}|${style.css}`
    if (seen.has(key)) continue
    seen.add(key)
    const chunk = style.scope === 'global' ? style.css : scopeCss(style.css, component.name)
    chunks.push(style.layer ? `@layer ${style.layer}{${chunk}}` : chunk)
    sources.push(style.source ?? `${component.name}.css`)
  }
  const css = chunks.join('\n')
  const result = { css, hash: hash(css) }
  if (options.sourceMap !== false) {
    result.map = { version: 3, file: options.file ?? 'ligature.css', sources, names: [], mappings: '' }
    result.css += `\n/*# sourceMappingURL=data:application/json;base64,${Buffer.from(JSON.stringify(result.map)).toString('base64')} */`
  }
  return Object.freeze(result)
}

function normalizeStyle(style) {
  if (typeof style === 'string') return { css: style, scope: 'component', order: 0 }
  return style && typeof style.css === 'string' ? { scope: 'component', order: 0, ...style } : { css: '', scope: 'component', order: 0 }
}

function scopeCss(css, name) {
  const marker = `[data-agent-component="${name}"]`
  return css.replace(/([^{}]+)\{/g, (match, selector) => {
    const trimmed = selector.trim()
    if (!trimmed || trimmed.startsWith('@') || trimmed.startsWith('/*')) return match
    const scoped = trimmed.split(',').map(part => {
      const global = part.match(/:global\((.*)\)/)
      if (global) return global[1]
      return `${marker} ${part.trim()}`
    }).join(', ')
    return `${selector.replace(trimmed, scoped)}{`
  })
}

function hash(value) { return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16) }
