import { escapeText, escapeAttribute, escapeUrl, escapeStyle } from './escape.js'

export class BoltRenderError extends Error {
  constructor(name, cause) {
    super(`Bolt '${name}' failed: ${cause?.message ?? String(cause)}`)
    this.name = 'BoltRenderError'
    this.bolt = name
    this.cause = cause
  }
}

export class BoltTemplateError extends Error {
  constructor(name, expression, cause) {
    super(`Bolt '${name}' template expression '${expression}' failed: ${cause?.message ?? String(cause)}`)
    this.name = 'BoltTemplateError'
    this.bolt = name
    this.expression = expression
    this.cause = cause
  }
}

export function defineBolt(definition) {
  if (!definition || typeof definition !== 'object' || Array.isArray(definition)) throw new TypeError('defineBolt(definition) requires an object')
  if (!definition.name || !/^[a-z][a-z0-9-]*$/.test(definition.name)) throw new TypeError('Bolt name must be kebab-case')
  if (definition.version !== undefined && (typeof definition.version !== 'string' || definition.version.length === 0)) throw new TypeError(`${definition.name}: version must be a non-empty string`)
  if (definition.props !== undefined && (!definition.props || typeof definition.props !== 'object' || Array.isArray(definition.props))) throw new TypeError(`${definition.name}: props must be an object`)
  if (definition.render !== undefined && typeof definition.render !== 'function') throw new TypeError(`${definition.name}: render must be a function`)
  if (definition.template !== undefined && typeof definition.template !== 'string') throw new TypeError(`${definition.name}: template must be a string`)
  if (typeof definition.render === 'function' && definition.template !== undefined) throw new TypeError(`${definition.name} cannot define both render and template`)
  if (typeof definition.render !== 'function' && definition.template === undefined) throw new TypeError(`${definition.name} requires render(data, context) or template`)
  return Object.freeze({ name: definition.name, version: definition.version ?? '0.1.0', props: Object.freeze({ ...(definition.props ?? {}) }), template: definition.template, render: definition.render })
}

export function createBoltRegistry() {
  const bolts = new Map()
  return {
    register(bolt) { if (!bolt?.name || (typeof bolt.render !== 'function' && typeof bolt.template !== 'string')) throw new TypeError('register requires a defined bolt'); if (bolts.has(bolt.name)) throw new Error(`Duplicate bolt: ${bolt.name}`); bolts.set(bolt.name, bolt); return this },
    get(name) { const bolt = bolts.get(name); if (!bolt) throw new Error(`Unknown bolt: ${name}`); return bolt },
    render(name, data = {}, options = {}) {
      const bolt = this.get(name)
      const context = Object.freeze({ name, parent: options.parent ?? null, escape: Object.freeze({ text: escapeText, attribute: escapeAttribute, url: escapeUrl, style: escapeStyle }), bolt: (childName, childData, childOptions = {}) => this.render(childName, childData, { ...childOptions, parent: name }) })
      try { const html = typeof bolt.render === 'function' ? bolt.render(data, context) : renderTemplate(name, bolt.template, data); if (typeof html !== 'string') throw new TypeError('render must return an HTML string'); return html } catch (error) { if (error instanceof BoltRenderError || error instanceof BoltTemplateError) throw error; throw new BoltRenderError(name, error) }
    },
    manifest() { return [...bolts.values()].map(({ name, version, props, template, render }) => ({ schema: 'ligaturejs.bolt-metadata.v1', name, version, props, mode: typeof render === 'function' ? 'render' : 'template', hasTemplate: typeof template === 'string' })) }
  }
}

function renderTemplate(name, template, data) {
  return template.replace(/{{\s*([^{}]+?)\s*}}/g, (match, expression) => {
    const path = expression.trim()
    if (!/^data(?:\.[A-Za-z_$][\w$]*)*$/.test(path)) throw new BoltTemplateError(name, path, new TypeError('only data paths are allowed'))
    const value = path.slice(5).split('.').filter(Boolean).reduce((current, key) => {
      if (key === '__proto__' || key === 'prototype' || key === 'constructor') throw new BoltTemplateError(name, path, new TypeError('unsafe data path'))
      return current == null ? undefined : current[key]
    }, data)
    return escapeText(value ?? '')
  })
}
