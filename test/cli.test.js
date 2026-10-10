import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

test('CLI scaffolds an app and component', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-'))
  execFileSync(process.execPath, ['src/cli.js', 'create', 'app', 'demo-app', dir], { cwd: process.cwd() })
  execFileSync(process.execPath, ['src/cli.js', 'create', 'component', 'profile-card', dir], { cwd: process.cwd() })
  assert.ok(fs.existsSync(path.join(dir, 'package.json')))
  assert.ok(fs.existsSync(path.join(dir, 'components/profile-card.js')))
  assert.ok(fs.existsSync(path.join(dir, 'test/profile-card.test.js')))
  assert.ok(fs.existsSync(path.join(dir, 'vendor/ligaturejs/src/index.js')))
  assert.match(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'), /file:vendor\/ligaturejs/)
  assert.match(fs.readFileSync(path.join(dir, 'src/server.js'), 'utf8'), /Skip to content/)
  assert.match(fs.readFileSync(path.join(dir, 'src/server.js'), 'utf8'), /:focus-visible/)
})

test('generated app installs and runs its generated tests', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-installed-'))
  const cli = ['src/cli.js']
  const run = (args) => execFileSync(process.execPath, [...cli, ...args, dir], { cwd: process.cwd() })

  run(['create', 'app', 'demo-app'])
  run(['create', 'component', 'profile-card'])
  run(['create', 'route', 'profiles'])
  run(['create', 'repository', 'profiles'])
  run(['create', 'migration', '001_profiles'])

  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund'], {
    cwd: dir,
    stdio: 'ignore'
  })
  const runner = path.join(dir, 'run-generated-tests.cjs')
  fs.writeFileSync(runner, `
    const { execFileSync } = require('node:child_process')
    execFileSync('npm', ['test'], { stdio: 'inherit' })
  `)
  execFileSync(process.execPath, [runner], { cwd: dir, stdio: 'inherit' })
})
