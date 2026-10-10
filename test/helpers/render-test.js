import assert from 'node:assert/strict'

const VOID_ELEMENTS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'])

/**
 * Compare rendered HTML with a checked-in snapshot without silently updating it.
 * Snapshots are deliberately plain text so they can be reviewed in code review.
 */
export function assertRenderSnapshot(actual, expected, message = 'render snapshot') {
  const normalize = value => value.replaceAll('\r\n', '\n').replace(/\n$/, '')
  assert.equal(normalize(actual), normalize(expected), message)
}

/**
 * Parse the small, trusted HTML fragments produced by the server renderer into
 * a queryable semantic view. This is a test helper, not an HTML sanitizer.
 */
export function semanticRender(html) {
  assert.equal(typeof html, 'string', 'semanticRender requires an HTML string')
  const root = { type: 'root', children: [] }
  const stack = [root]
  const tokenPattern = /<!--[\s\S]*?-->|<[^>]+>|[^<]+/g
  let match
  while ((match = tokenPattern.exec(html))) {
    const token = match[0]
    if (token.startsWith('<!--')) continue
    if (!token.startsWith('<')) {
      if (token.trim()) stack.at(-1).children.push({ type: 'text', value: decodeEntities(token) })
      continue
    }
    if (/^<\//.test(token)) {
      const name = token.slice(2, -1).trim().toLowerCase()
      assert.equal(stack.at(-1).name, name, `unbalanced closing tag: ${name}`)
      stack.pop()
      continue
    }
    const body = token.slice(1, token.endsWith('/>') ? -2 : -1).trim()
    const nameMatch = body.match(/^([a-zA-Z][\w:-]*)/)
    assert.ok(nameMatch, `invalid element token: ${token}`)
    const name = nameMatch[1].toLowerCase()
    const attributes = {}
    const attributeText = body.slice(nameMatch[0].length)
    const attributePattern = /([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g
    let attribute
    while ((attribute = attributePattern.exec(attributeText))) {
      attributes[attribute[1].toLowerCase()] = decodeEntities(attribute[2] ?? attribute[3])
    }
    const element = { type: 'element', name, attributes, children: [] }
    stack.at(-1).children.push(element)
    if (!token.endsWith('/>') && !VOID_ELEMENTS.has(name)) stack.push(element)
  }
  assert.equal(stack.length, 1, `unclosed element: ${stack.at(-1).name}`)
  return createNodeView(root)
}

function createNodeView(node) {
  const children = node.children ?? []
  return Object.freeze({
    type: node.type,
    name: node.name,
    value: node.value,
    attributes: Object.freeze({ ...(node.attributes ?? {}) }),
    children: Object.freeze(children.map(createNodeView)),
    text() { return node.type === 'text' ? node.value : children.map(child => child.type === 'text' ? child.value : createNodeView(child).text()).join('') },
    find(selector) { return this.findAll(selector)[0] ?? null },
    findAll(selector) { return flatten(node).filter(candidate => candidate.type === 'element' && matches(candidate, selector)).map(createNodeView) }
  })
}

function flatten(node) {
  return [node, ...(node.children ?? []).flatMap(flatten)]
}

function matches(node, selector) {
  const match = selector.match(/^([\w-]+)?(?:\.([\w-]+))?(?:\[([^=\]]+)(?:=["']?([^\]"']+)["']?)?\])?$/)
  if (!match) throw new TypeError(`Unsupported semantic selector: ${selector}`)
  const [, name, className, attribute, value] = match
  return (!name || node.name === name.toLowerCase()) &&
    (!className || (node.attributes.class ?? '').split(/\s+/).includes(className)) &&
    (!attribute || (attribute.toLowerCase() in node.attributes && (value === undefined || node.attributes[attribute.toLowerCase()] === value)))
}

function decodeEntities(value) {
  return value.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&amp;', '&')
}
