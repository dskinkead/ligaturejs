import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

test('CLI scaffolds route, repository, and migration contracts', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-expanded-'))
  for (const type of ['route', 'repository', 'migration']) execFileSync(process.execPath, ['src/cli.js', 'create', type, `demo-${type}`, dir], { cwd: process.cwd() })
  assert.ok(fs.existsSync(path.join(dir, 'routes/demo-route.js')))
  assert.ok(fs.existsSync(path.join(dir, 'repositories/demo-repository.js')))
  assert.ok(fs.existsSync(path.join(dir, 'migrations/demo-migration.js')))
})

test('CLI scaffolds a standalone test contract', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-test-'))
  execFileSync(process.execPath, ['src/cli.js', 'create', 'test', 'smoke', dir], { cwd: process.cwd() })
  assert.ok(fs.existsSync(path.join(dir, 'test/smoke.test.js')))
})

test('CLI interactively scaffolds an app when name and directory are omitted', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-interactive-'))
  execFileSync(process.execPath, ['src/cli.js', 'create', 'app'], { cwd: process.cwd(), input: `interactive-app\n${dir}\n` })
  assert.ok(fs.existsSync(path.join(dir, 'src/server.js')))
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))).name, 'interactive-app')
})

test('CLI upgrade records an inspectable framework marker', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-upgrade-'))
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'old-app', dependencies: { ligaturejs: '0.0.1' } }))
  execFileSync(process.execPath, ['src/cli.js', 'upgrade', dir], { cwd: process.cwd() })
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, '.ligature/upgrade-manifest.json')))
  assert.equal(manifest.schema, 'ligaturejs.upgrade.v1')
  assert.equal(fs.readFileSync(path.join(dir, '.ligature/framework-version'), 'utf8').trim(), '0.1.0')
  execFileSync(process.execPath, ['src/cli.js', 'upgrade', '--check', dir], { cwd: process.cwd() })
})
