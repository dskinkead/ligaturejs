import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'))
const packages = Object.entries(lock.packages ?? {})
  .filter(([name]) => name.startsWith('node_modules/'))
  .map(([name, value]) => ({ name: name.slice('node_modules/'.length), version: value.version, license: value.license ?? value.licenses ?? null }))
  .sort((a, b) => a.name.localeCompare(b.name))
const missing = packages.filter(item => !item.license)
if (missing.length) throw new Error(`Packages missing license metadata: ${missing.map(item => item.name).join(', ')}`)
console.log(JSON.stringify({ schema: 'ligaturejs.licenses.v1', package: pkg.name, version: pkg.version, packages }, null, 2))
