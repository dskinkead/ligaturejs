import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-package-'))
const result = spawnSync('npm', ['pack', '--json', '--pack-destination', dir], { encoding: 'utf8' })
if (result.status !== 0) { process.stderr.write(result.stderr || 'npm pack failed\n'); process.exit(result.status || 1) }
const metadata = JSON.parse(result.stdout)[0]
const required = ['package.json', 'README.md', 'LICENSE', 'src/index.js', 'index.d.ts', 'schemas/application.schema.json']
const files = new Set(metadata.files.map(file => file.path))
const missing = required.filter(file => !files.has(file))
if (missing.length) { console.error(`Package missing: ${missing.join(', ')}`); process.exit(1) }
const forbidden = metadata.files.map(file => file.path).filter(file =>
  /(^|\/)(?:test|scripts|example|skill)(?:\/|$)|\.orig$|\.bak$|(?:\.db|\.sqlite3?)$|(?:^|\/)\.env(?:\.|$)/i.test(file))
if (forbidden.length) { console.error(`Package contains development/private artifacts: ${forbidden.join(', ')}`); process.exit(1) }
const packageRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ligaturejs-unpack-'))
try {
  spawnSync('tar', ['-xzf', path.join(dir, metadata.filename), '-C', packageRoot], { stdio: 'ignore' })
  const sourceFiles = []
  const walk = current => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) walk(full)
      else sourceFiles.push(full)
    }
  }
  walk(path.join(packageRoot, 'package'))
  const privatePath = /(?:(?:^|[\s"'`])\/(?:home|Users)\/|[A-Za-z]:\\|BEGIN (?:RSA|OPENSSH|EC|DSA) PRIVATE KEY|(?:npm|github)[_-]?(?:auth|token)\s*[:=]\s*[^\s`]+|\b(?:api[_-]?key|password|secret)\s*[:=]\s*["'][^"']+["'])/i
  const leaks = sourceFiles.flatMap(file => {
    const content = fs.readFileSync(file, 'utf8')
    return privatePath.test(content) ? [path.relative(path.join(packageRoot, 'package'), file)] : []
  })
  if (leaks.length) { console.error(`Package contains private-path or credential material: ${leaks.join(', ')}`); process.exit(1) }
} finally { fs.rmSync(packageRoot, { recursive: true, force: true }) }
console.log(`Package check passed: ${metadata.filename} (${metadata.size} bytes)`)
