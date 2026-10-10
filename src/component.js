const propTypes = new Set(['string', 'number', 'boolean', 'object', 'array', 'null'])
const lifecycleHooks = ['mount', 'update', 'unmount']
const contextTokens = new WeakSet()

export function createContext(name, defaultValue) {
  if (typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new TypeError('createContext(name) requires a kebab-case name')
  }
  const context = Object.freeze({ name, defaultValue, id: Symbol(`ligature.context.${name}`) })
  contextTokens.add(context)
  return context
}

export function isContext(value) {
  return contextTokens.has(value)
}

export class PropValidationError extends TypeError {
  constructor(componentName, issues) {
    const normalizedIssues = issues.map(issue => Object.freeze({ ...issue }))
    super(`${componentName}: ${normalizedIssues.map(issue => issue.message).join('; ')}`)
    this.name = 'PropValidationError'
    this.component = componentName
    this.issues = Object.freeze(normalizedIssues)
  }
}

export function defineComponent(definition) {
  if (!isRecord(definition)) throw new TypeError('defineComponent(definition) requires an object')
  if (!definition.name || !/^[a-z][a-z0-9-]*$/.test(definition.name)) throw new Error('Component name must be kebab-case')
  if (typeof definition.render !== 'function') throw new Error(`${definition.name} requires render(props, state, context)`)
  if (definition.version !== undefined && typeof definition.version !== 'string') throw new TypeError(`${definition.name}: version must be a string`)

  const styles = normalizeStyles(definition)
  const component = {
    name: definition.name,
    version: definition.version ?? '0.1.0',
    props: normalizeProps(definition.name, definition.props),
    events: normalizeRecord(definition.name, 'events', definition.events),
    styles,
    css: styles,
    hasClient: definition.client !== undefined,
    client: normalizeClient(definition.client),
    state: normalizeOptionalFunction(definition.name, 'state', definition.state),
    errorBoundary: normalizeOptionalFunction(definition.name, 'errorBoundary', definition.errorBoundary),
    children: normalizeContentRecord(definition.name, 'children', definition.children),
    slots: normalizeSlots(definition.name, definition.slots),
    slotFallbacks: normalizeContentRecord(definition.name, 'slotFallbacks', definition.slotFallbacks),
    ...Object.fromEntries(lifecycleHooks.map(hook => [hook, normalizeOptionalFunction(definition.name, hook, definition[hook])])),
    render: definition.render
  }
  return deepFreeze(component)
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function normalizeStyles(definition) {
  if (definition.styles !== undefined && !isStyleDefinition(definition.styles)) throw new TypeError(`${definition.name}: styles must be a string or style definition`)
  // @deprecated `css` is retained as a compatibility alias; use `styles`.
  if (definition.css !== undefined && !isStyleDefinition(definition.css)) throw new TypeError(`${definition.name}: css must be a string or style definition`)
  if (definition.styles !== undefined && definition.css !== undefined && JSON.stringify(definition.styles) !== JSON.stringify(definition.css)) {
    throw new Error(`${definition.name}: styles and css must match when both are provided`)
  }
  const value = definition.styles ?? definition.css ?? ''
  if (typeof value === 'string') return value
  return { css: value.css, scope: value.scope ?? 'component', layer: value.layer, order: value.order ?? 0, source: value.source }
}

function isStyleDefinition(value) {
  return typeof value === 'string' || (isRecord(value) && typeof value.css === 'string' &&
    (value.scope === undefined || value.scope === 'component' || value.scope === 'global') &&
    (value.layer === undefined || typeof value.layer === 'string') &&
    (value.order === undefined || (Number.isInteger(value.order) && Number.isFinite(value.order))) &&
    (value.source === undefined || typeof value.source === 'string'))
}

function normalizeRecord(componentName, field, value) {
  if (value === undefined) return {}
  if (!isRecord(value)) throw new TypeError(`${componentName}: ${field} must be an object`)
  return { ...value }
}

function normalizeProps(componentName, value) {
  const props = normalizeRecord(componentName, 'props', value)
  for (const [name, rule] of Object.entries(props)) {
    if (!isRecord(rule)) throw new TypeError(`${componentName}: prop '${name}' must be an object`)
    if (rule.type !== undefined && !propTypes.has(rule.type)) throw new Error(`${componentName}: prop '${name}' has unsupported type '${rule.type}'`)
    if (rule.required !== undefined && typeof rule.required !== 'boolean') throw new TypeError(`${componentName}: prop '${name}' required must be boolean`)
    if (rule.coerce !== undefined && typeof rule.coerce !== 'boolean') throw new TypeError(`${componentName}: prop '${name}' coerce must be boolean`)
    if (rule.coerce === true && rule.type === undefined) throw new TypeError(`${componentName}: prop '${name}' coerce requires a type`)
    if (Object.hasOwn(rule, 'default')) {
      if (rule.default === undefined) throw new TypeError(`${componentName}: prop '${name}' default must be defined`)
      const defaultValue = rule.coerce ? coerceValue(rule.default, rule.type) : rule.default
      if (rule.type && !matchesType(defaultValue, rule.type)) throw new TypeError(`${componentName}: prop '${name}' default must be ${rule.type}`)
      if (rule.required && (defaultValue === undefined || defaultValue === null)) throw new TypeError(`${componentName}: prop '${name}' required default cannot be null`)
      props[name] = { ...rule, default: defaultValue }
    } else {
      props[name] = { ...rule }
    }
  }
  return props
}

function normalizeSlots(componentName, value) {
  if (value === undefined) return []
  if (!Array.isArray(value) || value.some(slot => typeof slot !== 'string' || !slot)) throw new TypeError(`${componentName}: slots must be an array of non-empty strings`)
  if (new Set(value).size !== value.length) throw new Error(`${componentName}: slots must not contain duplicates`)
  return [...value]
}

function normalizeContentRecord(componentName, field, value) {
  const record = normalizeRecord(componentName, field, value)
  for (const [name, content] of Object.entries(record)) {
    if (typeof content !== 'string' && typeof content !== 'function') {
      throw new TypeError(`${componentName}: ${field}.${name} must be HTML text or a function`)
    }
  }
  return record
}

function normalizeOptionalFunction(componentName, field, value) {
  if (value !== undefined && typeof value !== 'function') throw new TypeError(`${componentName}: ${field} must be a function`)
  return value
}

function normalizeClient(client) {
  if (client == null) return '{}'
  if (typeof client === 'string') return client
  if (isRecord(client)) return `{${Object.entries(client).map(([key, value]) => `${JSON.stringify(key)}:${serializeClientValue(value)}`).join(',')}}`
  throw new Error('Component client must be an object or source string')
}

function serializeClientValue(value) {
  if (typeof value !== 'function') return JSON.stringify(value)
  const source = value.toString()
  // Function#toString preserves object-method shorthand (`enhance() {}`),
  // which is valid in an object literal but not after a JSON property colon.
  return source.replace(/^(async\s+)?(?:get\s+|set\s+)?[A-Za-z_$][\w$]*\s*(\()/, '$1function$2')
}

function deepFreeze(value) {
  if (!isRecord(value) && !Array.isArray(value)) return value
  for (const nested of Object.values(value)) deepFreeze(nested)
  return Object.freeze(value)
}

export function validateProps(component, props = {}) {
  if (!isRecord(props)) {
    throw new PropValidationError(component.name, [{
      name: '$props',
      code: 'invalid_props',
      expected: 'object',
      received: describeType(props),
      message: 'props must be an object'
    }])
  }

  const normalized = { ...props }
  const issues = []
  for (const [name, rule] of Object.entries(component.props ?? {})) {
    let value = props[name]
    if (value === undefined && Object.hasOwn(rule, 'default')) value = cloneDefault(rule.default)
    if (value === undefined || (value === null && rule.required)) {
      if (rule.required) issues.push(issueFor(name, 'missing', rule.type, value, `missing required prop '${name}'`))
      continue
    }
    if (rule.coerce) {
      try {
        value = coerceValue(value, rule.type)
      } catch {
        issues.push(issueFor(name, 'invalid_type', rule.type, value, `prop '${name}' must be ${rule.type}`))
        continue
      }
    }
    if (rule.type && !matchesType(value, rule.type)) {
      issues.push(issueFor(name, 'invalid_type', rule.type, value, `prop '${name}' must be ${rule.type}`))
      continue
    }
    if (value !== undefined) normalized[name] = value
  }
  if (issues.length) throw new PropValidationError(component.name, issues)
  return normalized
}

function matchesType(value, type) { return type === 'array' ? Array.isArray(value) : type === 'null' ? value === null : typeof value === type }

function coerceValue(value, type) {
  if (value === undefined || value === null || !type || matchesType(value, type)) return value
  if (type === 'string') return String(value)
  if (type === 'number' && typeof value === 'string' && value.trim() !== '') {
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  if (type === 'boolean') {
    if (typeof value === 'string' && ['true', 'false'].includes(value.trim().toLowerCase())) return value.trim().toLowerCase() === 'true'
    if (value === 1 || value === 0) return value === 1
  }
  throw new TypeError('Unable to coerce prop')
}

function cloneDefault(value) {
  if (Array.isArray(value)) return value.map(cloneDefault)
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneDefault(nested)]))
  return value
}

function isPlainObject(value) {
  if (!isRecord(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

function describeType(value) {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function issueFor(name, code, expected, value, message) {
  return { name, code, expected, received: describeType(value), message }
}

export function componentContract(component) {
  return { name: component.name, version: component.version, props: component.props, events: component.events, styles: component.styles, slots: component.slots, slotFallbacks: Object.keys(component.slotFallbacks ?? {}), children: Object.keys(component.children), lifecycle: ['render', 'mount', 'update', 'unmount'].filter(name => typeof component[name] === 'function'), hasErrorBoundary: typeof component.errorBoundary === 'function' }
}

/** Return the stable, executable-free contract used by generators and editors. */
export function componentMetadata(component) {
  if (!component?.name || !isRecord(component.props)) throw new TypeError('componentMetadata(component) requires a normalized component')
  return deepFreeze({
    schema: 'ligaturejs.component-metadata.v1',
    name: component.name,
    version: component.version,
    props: component.props,
    events: component.events,
    slots: component.slots,
    slotFallbacks: Object.keys(component.slotFallbacks ?? {}),
    children: Object.keys(component.children ?? {}),
    lifecycle: ['render', 'mount', 'update', 'unmount'].filter(name => typeof component[name] === 'function'),
    hasClient: component.hasClient,
    jsonSchema: componentSchema(component)
  })
}

/**
 * Generate the JSON Schema for a component's validated props.
 *
 * The normalized component is the source of truth: defaults, required fields,
 * declared types, and opt-in coercion are all read from the same contract that
 * validateProps uses at render time.
 */
export function componentSchema(component) {
  if (!component?.name || !isRecord(component.props)) throw new TypeError('componentSchema(component) requires a normalized component')

  const properties = {}
  const required = []
  for (const [name, rule] of Object.entries(component.props)) {
    const property = {}
    if (rule.type) property.type = schemaType(rule.type)
    if (Object.hasOwn(rule, 'default')) property.default = schemaValue(rule.default, `${component.name}.${name}`)
    if (rule.coerce === true) property['x-ligature-coerce'] = true
    properties[name] = property
    if (rule.required && !Object.hasOwn(rule, 'default')) required.push(name)
  }

  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: `ligaturejs/component/${component.name}.props.v1`,
    title: `${component.name} props`,
    type: 'object',
    properties,
    additionalProperties: true
  }
  if (required.length) schema.required = required
  return deepFreeze(schema)
}

function schemaType(type) {
  // Runtime "object" follows JavaScript's object semantics and therefore also
  // accepts arrays; preserve that behavior in the interoperable schema.
  return type === 'object' ? ['object', 'array'] : type
}

function schemaValue(value, path) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (Array.isArray(value)) return value.map((item, index) => schemaValue(item, `${path}[${index}]`))
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, schemaValue(item, `${path}.${key}`)]))
  throw new TypeError(`${path} default cannot be represented in JSON Schema`)
}
