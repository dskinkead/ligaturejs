import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { Button, Alert, Field, definePlugin, createPluginRegistry, pluginContract } from '../src/index.js'
import * as runtime from '../src/runtime.js'
import * as adapters from '../src/adapters.js'
import * as devtools from '../src/devtools.js'

test('public package boundaries and component library are available', () => {
  const packageJson = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.deepEqual(Object.keys(packageJson.exports).sort(), ['.', './adapters', './cli', './devtools', './runtime'])
  assert.equal(pluginContract.schema, 'ligaturejs.plugin.v1')
  assert.equal(packageJson.version, '0.1.0-rc.1')
  assert.equal('private' in packageJson, false)
  assert.equal(typeof runtime.clientRuntime, 'function'); assert.equal(typeof adapters.createRouteHandler, 'function'); assert.equal(typeof devtools.inspectProject, 'function')
  assert.equal(Button.name, 'button'); assert.equal(Alert.name, 'alert'); assert.equal(Field.name, 'field')
  assert.match(Button.render({ label: '<go>' }), /&lt;go&gt;/)
})

test('plugin registry enforces versioned contract and reverse cleanup', async () => {
  const events = []; const plugin = definePlugin({ name: 'metrics', install: () => events.push('install'), uninstall: () => events.push('uninstall') })
  const registry = createPluginRegistry({ plugins: [plugin] })
  assert.deepEqual(registry.list(), [{ name: 'metrics', version: '1.0.0' }])
  await registry.close(); assert.deepEqual(events, ['install', 'uninstall'])
  assert.throws(() => createPluginRegistry({ plugins: [{ name: 'bad' }] }), /plugin.v1/)
})
