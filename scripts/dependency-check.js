import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const lockPath = path.join(root, 'package-lock.json')
if (!fs.existsSync(lockPath)) throw new Error('package-lock.json is required for reproducible dependency auditing')
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'))
if (lock.lockfileVersion < 2) throw new Error('package-lock.json must use lockfileVersion 2 or newer')
for (const name of Object.keys(pkg.dependencies ?? {})) if (!lock.packages?.[`node_modules/${name}`]) throw new Error(`Dependency is missing from lockfile: ${name}`)
console.log(`Dependency manifest verified: ${pkg.name} (${lock.lockfileVersion})`)
