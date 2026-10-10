/** Generate validated CSS custom properties and preference-aware overrides. */
export function defineTheme(name, definition = {}) {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) throw new TypeError('theme name must be kebab-case')
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new TypeError('theme definition must be an object')
  const tokens = normalizeTokens(definition.tokens ?? definition)
  const dark = normalizeTokens(definition.dark ?? {})
  const reducedMotion = normalizeTokens(definition.reducedMotion ?? {})
  const css = themeCss(tokens, { dark, reducedMotion, selector: `[data-theme="${name}"]` })
  return Object.freeze({ name, tokens: Object.freeze(tokens), dark: Object.freeze(dark), reducedMotion: Object.freeze(reducedMotion), css })
}

export function themeCss(tokens, options = {}) {
  const base = normalizeTokens(tokens)
  const dark = normalizeTokens(options.dark ?? {})
  const reducedMotion = normalizeTokens(options.reducedMotion ?? {})
  const selector = options.selector ?? ':root'
  if (typeof selector !== 'string' || !selector.trim()) throw new TypeError('theme selector must be a non-empty string')
  const blocks = [`${selector}{${variables(base)}}`]
  if (Object.keys(dark).length) blocks.push(`@media (prefers-color-scheme: dark){${selector}{${variables(dark)}}}`)
  if (Object.keys(reducedMotion).length) blocks.push(`@media (prefers-reduced-motion: reduce){${selector}{${variables(reducedMotion)}}}`)
  return blocks.join('\n')
}

function normalizeTokens(tokens) {
  if (!tokens || typeof tokens !== 'object' || Array.isArray(tokens)) throw new TypeError('theme tokens must be an object')
  return Object.fromEntries(Object.entries(tokens).map(([key, value]) => {
    if (!/^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(key)) throw new TypeError(`theme token '${key}' must be kebab-case`)
    if (value === null || value === undefined || typeof value === 'object' || /[;{}]/.test(String(value))) throw new TypeError(`theme token '${key}' has an unsafe value`)
    return [key, String(value)]
  }))
}

function variables(tokens) { return Object.entries(tokens).map(([key, value]) => `--${key}:${value};`).join('') }
