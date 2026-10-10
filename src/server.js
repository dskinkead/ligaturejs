import { escapeHtml, escapeText, escapeAttribute, escapeUrl, escapeStyle } from './escape.js'
import { validateProps, componentContract, isContext } from './component.js'
import { markupSignature } from './markup.js'
import { assetDescriptor } from './assets.js'

export function createComponentRegistry() {
  const components = new Map()
  let renderScope = null
  return {
    register(component) { if (components.has(component.name)) throw new Error(`Duplicate component: ${component.name}`); components.set(component.name, component); return this },
    get(name) { const component = components.get(name); if (!component) throw new Error(`Unknown component: ${name}`); return component },
    render(name, props = {}, options = {}) {
      const isRootRender = renderScope === null
      if (isRootRender) renderScope = { nextOrdinal: 0, contexts: new Map() }
      const ordinal = renderScope.nextOrdinal++
      const previousContexts = renderScope.contexts
      try {
        const component = this.get(name)
        const instanceId = options.id ?? `${name}-${ordinal}`
        const normalizedProps = validateProps(component, props)
        const state = options.state ?? {}
        renderScope.contexts = new Map(previousContexts)
        applyProviders(renderScope.contexts, options.providers, name)
        const children = contentMap(options.children, `${name} children`)
        const slots = contentMap(options.slots, `${name} slots`)
        const scopeFor = scope => Object.freeze({ ...(scope ?? {}) })
        const resolve = (map, fallback, childName, scope) => {
          const value = map[childName]
          if (value === undefined) return typeof fallback === 'function' ? fallback(scopeFor(scope)) : (fallback ?? '')
          return typeof value === 'function' ? value(scopeFor(scope)) : value
        }
        const context = Object.freeze({
          name,
          instanceId,
          children: Object.freeze({ ...children }),
          slots: Object.freeze({ ...slots }),
          child: (childName, scope) => resolve(children, component.children[childName], childName, scope),
          slot: (slotName, scope) => resolve(slots, component.slotFallbacks[slotName], slotName, scope),
          consume: dependency => consumeContext(renderScope.contexts, dependency),
          provide: (dependency, value, renderChild) => {
            assertContext(dependency)
            if (typeof renderChild !== 'function') throw new TypeError('context.provide requires a render callback')
            const hadValue = renderScope.contexts.has(dependency.id)
            const previousValue = renderScope.contexts.get(dependency.id)
            renderScope.contexts.set(dependency.id, value)
            try { return renderChild() } finally {
              if (hadValue) renderScope.contexts.set(dependency.id, previousValue)
              else renderScope.contexts.delete(dependency.id)
            }
          },
          escape: Object.freeze({ text: escapeText, attribute: escapeAttribute, url: escapeUrl, style: escapeStyle }),
          render: (childName, childProps, childOptions) => this.render(childName, childProps, childOptions)
        })
        let html
        try {
          html = component.render(normalizedProps, state, context)
        } catch (error) {
          if (typeof component.errorBoundary !== 'function') throw error
          html = component.errorBoundary(error, normalizedProps, state, context)
          if (typeof html !== 'string') throw new TypeError(`${name}: errorBoundary must return an HTML string`)
        }
        const dataAttributes = serializeDataAttributes(options.data, name)
        const hydration = component.hasClient ? hydrationMode(options.hydrate, name) : 'false'
        return `<div data-agent-component="${escapeHtml(name)}" data-agent-instance="${escapeHtml(instanceId)}" data-agent-hydrate="${hydration}" data-agent-markup="${markupSignature(html)}" data-agent-props="${escapeHtml(JSON.stringify(normalizedProps))}"${dataAttributes}>${html}</div>`
      } finally {
        renderScope.contexts = previousContexts
        if (isRootRender) renderScope = null
      }
    },
    manifest() { return [...components.values()].map(component => ({ ...componentContract(component), hasClient: component.hasClient, hasCss: Boolean(component.css) })) },
    assets() { return [...components.values()].flatMap(component => {
      const client = component.client ?? ''
      const style = styleSource(component.styles)
      return [
        assetDescriptor({ name: component.name, type: 'client', source: client, extension: 'js' }),
        { ...assetDescriptor({ name: component.name, type: 'style', source: style, extension: 'css' }), scope: component.styles?.scope ?? 'component', layer: component.styles?.layer, order: component.styles?.order ?? 0 }
      ]
    }) }
  }
}

function styleSource(styles) { return typeof styles === 'string' ? styles : styles?.css ?? '' }

function hydrationMode(value, componentName) {
  if (value === undefined || value === true) return 'true'
  if (value === false) return 'manual'
  if (!['eager', 'idle', 'visible', 'manual'].includes(value)) {
    throw new TypeError(`${componentName}: hydrate must be true, false, or one of eager, idle, visible, manual`)
  }
  return value
}

function serializeDataAttributes(data, componentName) {
  if (data === undefined) return ''
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    throw new TypeError(`${componentName}: data must be an object`)
  }

  return Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const normalizedKey = key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)
      if (!/^[a-z][a-z0-9-]*$/.test(normalizedKey)) {
        throw new TypeError(`${componentName}: data key '${key}' must be kebab-case-compatible`)
      }
      if (!['string', 'number', 'boolean'].includes(typeof value) || (typeof value === 'number' && !Number.isFinite(value))) {
        throw new TypeError(`${componentName}: data.${key} must be a string, finite number, or boolean`)
      }
      return [normalizedKey, String(value)]
    })
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, value]) => ` data-${escapeAttribute(key)}="${escapeAttribute(value)}"`)
    .join('')
}

function assertContext(dependency) {
  if (!isContext(dependency)) {
    throw new TypeError('Expected a context created by createContext')
  }
}

function applyProviders(target, providers, componentName) {
  if (providers === undefined) return
  if (!(providers instanceof Map)) throw new TypeError(`${componentName}: providers must be a Map`)
  for (const [dependency, value] of providers) {
    assertContext(dependency)
    target.set(dependency.id, value)
  }
}

function consumeContext(values, dependency) {
  assertContext(dependency)
  return values.has(dependency.id) ? values.get(dependency.id) : dependency.defaultValue
}

function contentMap(value, label) {
  if (value === undefined) return {}
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${label} must be an object`)
  for (const [name, content] of Object.entries(value)) {
    if (typeof content !== 'string' && typeof content !== 'function') throw new TypeError(`${label}.${name} must be HTML text or a function`)
  }
  return { ...value }
}
