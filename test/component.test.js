import test from 'node:test'
import assert from 'node:assert/strict'
import { defineComponent, createComponentRegistry, escapeHtml, escapeText, escapeAttribute, escapeUrl, escapeStyle, sanitizeHtml, rawHtml, componentClientSource, validateProps, componentContract, componentMetadata, componentSchema, PropValidationError, markupSignature } from '../src/index.js'

test('escapes rendered values', () => assert.equal(escapeHtml('<script>'), '&lt;script&gt;'))
test('escaping helpers cover HTML, URL, and style contexts', () => {
  assert.equal(escapeText('<Boss>'), '&lt;Boss&gt;')
  assert.equal(escapeAttribute('a"b'), 'a&quot;b')
  assert.equal(escapeUrl('/search?q=<x>&ok=1'), '/search?q=&lt;x&gt;&amp;ok=1')
  assert.equal(escapeStyle('color: red'), 'color: red')
  assert.throws(() => escapeUrl('javascript:alert(1)'), /Unsafe URL scheme/)
  assert.throws(() => escapeUrl('data:text/html,<svg>'), /Unsafe URL scheme/)
  assert.throws(() => escapeUrl('https://example.test/\nnext'), /control characters/)
  assert.throws(() => escapeStyle('background: url(javascript:alert(1))'), /Unsafe inline style/)
  assert.throws(() => escapeStyle('background: url(data:image/svg+xml,...)'), /Unsafe inline style/)
  assert.throws(() => escapeStyle('background:\\6a avascript:alert(1)'), /Unsafe inline style/)
  assert.throws(() => escapeStyle('color:red\u0000'), /Unsafe inline style/)
})
test('rawHtml sanitizes an explicit HTML fragment opt-in', () => {
  const fragment = rawHtml('<p class="note" onclick="alert(1)">Hi <strong>Boss</strong><script>alert(2)</script><a href="javascript:alert(3)" data-id="7">link</a><a href="java&#x73;cript:alert(4)">bad</a><img src="https://example.test/x" onerror="alert(5)"></p>')
  assert.equal(fragment, '<p class="note">Hi <strong>Boss</strong><a data-id="7">link</a><a>bad</a><img src="https://example.test/x"></p>')
  assert.equal(sanitizeHtml('<svg><script>x</script></svg>'), '')
  assert.throws(() => sanitizeHtml(42), /requires a string/)
})
test('registry renders stable component instance metadata', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'hello', render: props => `<p>${escapeHtml(props.name)}</p>` }))
  const html = registry.render('hello', { name: '<Boss>' }, { id: 'fixed' })
  assert.match(html, /data-agent-instance="fixed"/)
  assert.match(html, /data-agent-hydrate="false"/)
  assert.match(registry.render('hello', { name: '<Boss>' }, { id: 'fixed' }), /&lt;Boss&gt;/)
})

test('registry emits a deterministic signature for rendered inner markup', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'signed', render: () => '<p>stable</p>' }))
  const html = registry.render('signed')
  assert.match(html, new RegExp(`data-agent-markup="${markupSignature('<p>stable</p>')}"`))
  assert.equal(registry.render('signed'), html)
})

test('client components advertise hydration while server-only components do not', () => {
  const registry = createComponentRegistry()
    .register(defineComponent({ name: 'interactive', client: { mount() {} }, render: () => '<button>Go</button>' }))
    .register(defineComponent({ name: 'static', render: () => '<p>Read me</p>' }))
  assert.match(registry.render('interactive'), /data-agent-hydrate="true"/)
  assert.match(registry.render('static'), /data-agent-hydrate="false"/)
})
test('client components support explicit hydration island modes', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'island', client: { mount() {} }, render: () => '<button>Go</button>' }))
  for (const mode of ['eager', 'idle', 'visible', 'manual']) {
    assert.match(registry.render('island', {}, { hydrate: mode }), new RegExp(`data-agent-hydrate="${mode}"`))
  }
  assert.match(registry.render('island', {}, { hydrate: false }), /data-agent-hydrate="manual"/)
  assert.throws(() => registry.render('island', {}, { hydrate: 'later' }), /hydrate must be true, false, or one of eager, idle, visible, manual/)
  assert.match(registry.render('island'), /data-agent-hydrate="true"/)
})
test('duplicate component names are rejected', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'x', render: () => '' }))
  assert.throws(() => registry.register(defineComponent({ name: 'x', render: () => '' })), /Duplicate component/)
})
test('client source is deterministic and namespaced', () => {
  const component = defineComponent({ name: 'counter', render: () => '', client: '{mount(){}}' })
  assert.match(componentClientSource(component), /Ligature\.register\("counter"/)
})

test('client definitions may declare an async loader and trusted state fallbacks', () => {
  const component = defineComponent({
    name: 'deferred-panel',
    client: {
      load: () => Promise.resolve({ mount() {} }),
      loading: '<p>Loading…</p>',
      error: '<p role="alert">Unable to load panel.</p>'
    },
    render: () => '<section>Server content</section>'
  })
  assert.match(component.client, /load/)
  assert.match(component.client, /Loading/)
  assert.match(componentClientSource(component), /Ligature\.register\("deferred-panel"/)
})

test('client definitions can serialize a progressive enhancement hook', () => {
  const component = defineComponent({
    name: 'enhanced-label',
    client: { enhance(element, state) { element.dataset.enhanced = String(state.label) } },
    render: props => `<span>${escapeHtml(props.label)}</span>`
  })
  assert.match(component.client, /enhance/)
  assert.doesNotMatch(component.client, /enhance\([^)]*\)\s*\{/)
  assert.match(componentClientSource(component), /enhanced-label/)
})

test('client definitions can serialize a markup comparison renderer and reporter', () => {
  const component = defineComponent({
    name: 'checked-label',
    client: { render(state) { return `<span>${state.label}</span>` }, onMarkupMismatch() {} },
    render: props => `<span>${escapeHtml(props.label)}</span>`
  })
  assert.match(component.client, /render/)
  assert.match(component.client, /onMarkupMismatch/)
})
test('required and typed props are validated', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'typed', props: { count: { required: true, type: 'number' } }, render: () => '' }))
  assert.throws(() => registry.render('typed'), /missing required prop/)
  assert.throws(() => registry.render('typed', { count: '1' }), /must be number/)
})

test('defaults and opt-in primitive coercion normalize props for rendering', () => {
  const component = defineComponent({
    name: 'normalized',
    props: {
      title: { required: true, type: 'string' },
      count: { type: 'number', default: '2', coerce: true },
      enabled: { type: 'boolean', default: false, coerce: true },
      tags: { type: 'array', default: ['one'] }
    },
    render: props => `<p>${props.title}:${props.count}:${props.enabled}:${props.tags.join(',')}</p>`
  })
  const input = { title: 'Card', count: '4', enabled: 'true' }
  const normalized = validateProps(component, input)
  assert.deepEqual(normalized, { title: 'Card', count: 4, enabled: true, tags: ['one'] })
  assert.notEqual(normalized.tags, component.props.tags.default)
  assert.deepEqual(input, { title: 'Card', count: '4', enabled: 'true' })
  const html = createComponentRegistry().register(component).render('normalized', input)
  assert.match(html, />Card:4:true:one<\//)
  assert.match(html, /data-agent-props=.*&quot;count&quot;:4/)
})

test('prop failures expose structured issues and invalid coercion is rejected', () => {
  const component = defineComponent({
    name: 'validated',
    props: {
      title: { required: true, type: 'string' },
      count: { type: 'number', coerce: true }
    },
    render: () => ''
  })
  assert.throws(() => validateProps(component, { count: 'not-a-number' }), error => {
    assert.ok(error instanceof PropValidationError)
    assert.deepEqual(error.issues, [{ name: 'title', code: 'missing', expected: 'string', received: 'undefined', message: "missing required prop 'title'" }, { name: 'count', code: 'invalid_type', expected: 'number', received: 'string', message: "prop 'count' must be number" }])
    return true
  })
  assert.throws(() => defineComponent({ name: 'bad-default', props: { count: { type: 'number', default: 'many' } }, render: () => '' }), /default must be number/)
  assert.throws(() => defineComponent({ name: 'bad-coercion', props: { count: { coerce: true } }, render: () => '' }), /coerce requires a type/)
})

test('array props and object client definitions are supported', () => {
  const component = defineComponent({ name: 'items-box', props: { items: { required: true, type: 'array' } }, styles: '.items-box{display:block}', client: { mount(element) { element.dataset.ready = 'yes' } }, render: ({ items }) => `<div>${items.length}</div>` })
  assert.equal(component.styles, '.items-box{display:block}')
  assert.equal(component.hasClient, true)
  assert.match(component.client, /mount/)
  assert.doesNotThrow(() => validateProps(component, { items: [] }))
  assert.deepEqual(componentContract(component).styles, '.items-box{display:block}')
})
test('rendered props are safely serialized', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'props', render: () => '' }))
  assert.match(registry.render('props', { value: '<unsafe>' }), /data-agent-props=/)
})
test('data attributes are normalized, deterministic, and explicitly serialized', () => {
  const registry = createComponentRegistry().register(defineComponent({ name: 'data-box', render: () => '' }))
  const html = registry.render('data-box', {}, { data: { zuluKey: '<unsafe>', alpha: true, omitted: null, alsoOmitted: undefined, count: 2 } })
  assert.match(html, / data-alpha="true" data-count="2" data-zulu-key="&lt;unsafe&gt;"/)
  assert.doesNotMatch(html, /omitted|also-omitted/)
  assert.throws(() => registry.render('data-box', {}, { data: ['invalid'] }), /data must be an object/)
  assert.throws(() => registry.render('data-box', {}, { data: { 'not_valid': 'x' } }), /kebab-case-compatible/)
  assert.throws(() => registry.render('data-box', {}, { data: { object: {} } }), /must be a string, finite number, or boolean/)
})
test('registry assigns deterministic default IDs for repeatable server renders', () => {
  const registry = createComponentRegistry()
    .register(defineComponent({ name: 'badge', render: ({ label }) => `<b>${escapeHtml(label)}</b>` }))
    .register(defineComponent({ name: 'card', render: (_, __, context) => `<article>${context.render('badge', { label: 'A' })}${context.render('badge', { label: 'B' })}</article>` }))
  const first = registry.render('card')
  const second = registry.render('card')
  assert.equal(first, second)
  assert.match(first, /data-agent-instance="card-0"/)
  assert.match(first, /data-agent-instance="badge-1"/)
  assert.match(first, /data-agent-instance="badge-2"/)
})

test('error boundaries render fallbacks for component and nested render failures', () => {
  const registry = createComponentRegistry()
    .register(defineComponent({ name: 'broken-child', render: () => { throw new Error('database unavailable') } }))
    .register(defineComponent({
      name: 'safe-panel',
      errorBoundary: (error, props) => `<p role="alert">${escapeHtml(props.label)}: ${escapeText(error.message)}</p>`,
      render: (_, __, context) => `<section>${context.render('broken-child')}</section>`
    }))
  const html = registry.render('safe-panel', { label: 'Projects' })
  assert.match(html, /<p role="alert">Projects: database unavailable<\/p>/)
  assert.throws(() => registry.render('broken-child'), /database unavailable/)
})

test('error boundaries require an HTML string fallback', () => {
  const registry = createComponentRegistry().register(defineComponent({
    name: 'bad-boundary', errorBoundary: () => null, render: () => { throw new Error('broken') }
  }))
  assert.throws(() => registry.render('bad-boundary'), /errorBoundary must return an HTML string/)
})

test('server render context is scoped and immutable', () => {
  let observed
  const registry = createComponentRegistry().register(defineComponent({
    name: 'context-card',
    render: (_, __, context) => {
      observed = context
      return '<article></article>'
    }
  }))
  registry.render('context-card', {}, { id: 'context-1', children: { body: '<p>trusted</p>' }, slots: { header: '<h1>trusted</h1>' } })
  assert.equal(observed.name, 'context-card')
  assert.equal(observed.instanceId, 'context-1')
  assert.deepEqual(observed.children, { body: '<p>trusted</p>' })
  assert.equal(observed.escape.text('<x>'), '&lt;x&gt;')
  assert.equal(observed.escape.url('/next?x=1&y=2'), '/next?x=1&amp;y=2')
  assert.equal(Object.isFrozen(observed), true)
  assert.equal(Object.isFrozen(observed.children), true)
  assert.equal(Object.isFrozen(observed.escape), true)
  assert.throws(() => { observed.children.body = 'changed' }, TypeError)
})

 
test('defineComponent returns one normalized immutable contract', () => {
  const source = { props: { title: { required: true, type: 'string' } }, slots: ['header'] }
  const component = defineComponent({
    name: 'canonical-card',
    props: source.props,
    events: { select: 'canonical-card:select' },
    styles: '.canonical-card{}',
    slots: source.slots,
    children: { body: 'default' },
    state: () => ({}),
    mount() {},
    render: () => ''
  })

  assert.equal(component.version, '0.1.0')
  assert.equal(component.css, component.styles)
  assert.deepEqual(component.slots, ['header'])
  assert.deepEqual(componentContract(component).children, ['body'])
  assert.ok(Object.isFrozen(component))
  assert.ok(Object.isFrozen(component.props))
  assert.ok(Object.isFrozen(component.props.title))
  assert.ok(Object.isFrozen(component.slots))
  assert.throws(() => { component.props.title.required = false }, TypeError)
  source.slots.push('footer')
  assert.deepEqual(component.slots, ['header'])
})

test('css is a deprecated compatibility alias for styles', () => {
  const legacy = defineComponent({ name: 'legacy-css', css: '.legacy{}', render: () => '<p />' })
  const canonical = defineComponent({ name: 'canonical-styles', styles: '.canonical{}', render: () => '<p />' })
  assert.equal(legacy.styles, '.legacy{}')
  assert.equal(legacy.css, '.legacy{}')
  assert.equal(canonical.styles, '.canonical{}')
})

test('defineComponent rejects malformed contract fields', () => {
  assert.throws(() => defineComponent(null), /requires an object/)
  assert.throws(() => defineComponent({ name: 'bad', render: () => '', props: { count: { type: 'decimal' } } }), /unsupported type/)
  assert.throws(() => defineComponent({ name: 'bad', render: () => '', mount: true }), /mount must be a function/)
  assert.throws(() => defineComponent({ name: 'bad', render: () => '', styles: 'a', css: 'b' }), /styles and css must match/)
  assert.throws(() => defineComponent({ name: 'bad', render: () => '', slots: ['main', 'main'] }), /slots must not contain duplicates/)
})

test('component schema is generated from the normalized prop contract', () => {
  const component = defineComponent({
    name: 'schema-card',
    props: {
      title: { required: true, type: 'string' },
      count: { type: 'number', default: 2, coerce: true },
      metadata: { type: 'object' },
      tags: { type: 'array', default: ['one'] },
      nullable: { type: 'null' }
    },
    render: () => ''
  })
  const schema = componentSchema(component)

  assert.deepEqual(schema, {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'ligaturejs/component/schema-card.props.v1',
    title: 'schema-card props',
    type: 'object',
    properties: {
      title: { type: 'string' },
      count: { type: 'number', default: 2, 'x-ligature-coerce': true },
      metadata: { type: ['object', 'array'] },
      tags: { type: 'array', default: ['one'] },
      nullable: { type: 'null' }
    },
    required: ['title'],
    additionalProperties: true
  })
  assert.equal(Object.isFrozen(schema), true)
  assert.equal(Object.isFrozen(schema.properties), true)
  assert.throws(() => { schema.properties.title = {} }, TypeError)
})

test('component schema rejects defaults that JSON Schema cannot represent', () => {
  const component = defineComponent({ name: 'schema-date', props: { value: { type: 'object', default: new Date() } }, render: () => '' })
  assert.throws(() => componentSchema(component), /default cannot be represented in JSON Schema/)
})

test('component metadata is an immutable tooling contract', () => {
  const component = defineComponent({ name: 'metadata-card', events: { select: 'metadata:select' }, slots: ['body'], render: () => '' })
  const metadata = componentMetadata(component)
  assert.equal(metadata.schema, 'ligaturejs.component-metadata.v1')
  assert.deepEqual(metadata.events, { select: 'metadata:select' })
  assert.deepEqual(metadata.slots, ['body'])
  assert.equal(metadata.jsonSchema.$id, 'ligaturejs/component/metadata-card.props.v1')
  assert.equal(Object.isFrozen(metadata), true)
  assert.equal(Object.isFrozen(metadata.jsonSchema), true)
})

test('component client source carries the declared event contract', () => {
  const component = defineComponent({
    name: 'event-card',
    events: { select: 'event-card:select' },
    client: { mount() {} },
    render: () => '<button>select</button>'
  })
  const source = componentClientSource(component)
  assert.match(source, /definition=Object\.assign\(\{\}/)
  assert.match(source, /"select":"event-card:select"/)
})
