import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const expected = ['.', './runtime', './adapters', './devtools', './cli']
const errors = []
if (pkg.type !== 'module') errors.push('package must declare ESM via type: module')
for (const name of expected) {
  const entry = pkg.exports?.[name]
  if (!entry?.import || !entry?.types) errors.push(`export ${name} must provide import and types conditions`)
  for (const file of [entry?.import, entry?.types]) if (file && !fs.existsSync(path.join(root, file))) errors.push(`missing export target: ${file}`)
}
if (!pkg.files.includes('*.d.ts') || !pkg.files.includes('templates')) errors.push('package files must include declarations and starter templates')
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`Packaging check passed: ${expected.length} public subpaths, ESM-only policy, declarations, templates`)
