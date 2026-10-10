import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { buildProject, inspectBuild, loadConfig, validateConfig } from '../src/index.js'

test('config discovery applies defaults and rejects invalid values', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligature-config-'))
  fs.writeFileSync(path.join(dir, 'ligature.config.json'), JSON.stringify({ port: 4100 }))
  const config = await loadConfig(dir)
  assert.equal(config.port, 4100)
  assert.equal(config.host, '127.0.0.1')
  assert.deepEqual(config.proxy, { trust: false, basePath: '' })
  assert.throws(() => validateConfig({ port: 70000 }), /port/)
  assert.throws(() => validateConfig({ https: { key: 'key.pem' } }), /cert/)
  assert.throws(() => validateConfig({ proxy: { trust: false, basePath: 'app' } }), /basePath/)
  assert.deepEqual(validateConfig({ environment: { NODE_ENV: 'test' } }).environment, { NODE_ENV: 'test' })
})

test('build emits a reproducible manifest and detects artifact drift', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligature-build-'))
  fs.mkdirSync(path.join(dir, 'src'))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture', version: '1.0.0' }))
  fs.writeFileSync(path.join(dir, 'src', 'server.js'), 'export default 1\n')
  const result = await buildProject(dir)
  const checked = inspectBuild(result.output)
  assert.equal(checked.ok, true)
  assert.match(fs.readFileSync(path.join(result.output, 'src/server.js'), 'utf8'), /sourceMappingURL=server\.js\.map/)
  assert.equal(JSON.parse(fs.readFileSync(path.join(result.output, 'src/server.js.map'), 'utf8')).version, 3)
  fs.appendFileSync(path.join(result.output, 'src/server.js'), ' changed\n')
  assert.equal(inspectBuild(result.output).ok, false)
})
