#!/usr/bin/env node
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { componentMetadata, defineComponent } from '../src/index.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'))
function checkSchema(file, id, required) {
  const schema = readJson(file)
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema', `${file}: draft`)
  assert.equal(schema.$id, id, `${file}: id`)
  assert.equal(schema.type, 'object', `${file}: object root`)
  for (const name of required) assert.ok(schema.required?.includes(name), `${file}: missing required ${name}`)
}
checkSchema('schemas/application.schema.json', 'ligaturejs/application.v1', ['schema', 'name', 'version', 'components', 'routes'])
checkSchema('schemas/component.schema.json', 'ligaturejs/component.v1', ['name', 'render'])
checkSchema('schemas/bolt.schema.json', 'ligaturejs/bolt.v1', ['name', 'version', 'props', 'mode'])
const component = defineComponent({ name: 'schema-check-card', props: { title: { type: 'string', required: true }, count: { type: 'number', default: 0 } }, events: { select: 'card:select' }, slots: ['body'], render: () => '<article></article>' })
const metadata = componentMetadata(component)
assert.equal(metadata.schema, 'ligaturejs.component-metadata.v1')
assert.deepEqual(metadata.events, { select: 'card:select' })
assert.deepEqual(metadata.slots, ['body'])
assert.deepEqual(metadata.jsonSchema.required, ['title'])
assert.ok(Object.isFrozen(metadata) && Object.isFrozen(metadata.jsonSchema))
console.log('Schema checks passed')
