import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { defineRepository } from '../src/index.js'

test('type declarations and schemas are shipped', () => {
  assert.ok(fs.existsSync('index.d.ts'))
  assert.match(fs.readFileSync('schemas/application.schema.json', 'utf8'), /ligaturejs\/application\.v1/)
  assert.match(fs.readFileSync('schemas/component.schema.json', 'utf8'), /ligaturejs\/component\.v1/)
})

test('public data and route contracts are represented in declarations', () => {
  const declarations = fs.readFileSync('index.d.ts', 'utf8')
  for (const name of ['TypedRouteContext', 'RouteContract', 'Repository', 'DatabaseAdapter', 'Migration', 'LigatureError', 'BoltContext', 'BoltDefinition', 'BoltRegistry', 'createRouteHandler', 'diagnosticsMiddleware', 'csrfMiddleware', 'inspectUpgrade']) {
    assert.match(declarations, new RegExp(`(?:export (?:interface|type|class|function|const) )${name}\\b`), name)
  }
  const repository = defineRepository({ name: 'tasks', methods: { all: async () => [] } })
  assert.equal(Object.isFrozen(repository), true)
  assert.equal(Object.isFrozen(repository.methods), true)
  assert.equal(repository.name, 'tasks')
})

test('bolt schema and declarations are shipped together', () => {
  const declarations = fs.readFileSync('index.d.ts', 'utf8')
  assert.match(declarations, /BoltTemplateDefinition/)
  assert.match(fs.readFileSync('schemas/bolt.schema.json', 'utf8'), /ligaturejs\/bolt\.v1/)
})
