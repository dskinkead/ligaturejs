import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const ignored = new Set(['node_modules', '.git', 'PROVENANCE.json'])
function files(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    if (ignored.has(entry.name)) return []
    const relative = path.join(prefix, entry.name)
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? files(full, relative) : [relative]
  })
}
const hashes = files(root).sort().map(file => `${file}\0${crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex')}`)
const sourceDigest = crypto.createHash('sha256').update(hashes.join('\n')).digest('hex')
const metadata = { schema: 'ligaturejs.provenance.v1', package: pkg.name, version: pkg.version, sourceDigest, reproducible: true, generatedBy: 'scripts/provenance.js' }
const target = path.join(root, 'PROVENANCE.json')
if (process.argv.includes('--write')) fs.writeFileSync(target, `${JSON.stringify(metadata, null, 2)}\n`)
else {
  if (!fs.existsSync(target) || JSON.stringify(JSON.parse(fs.readFileSync(target, 'utf8'))) !== JSON.stringify(metadata)) { console.error('Provenance metadata is stale; run npm run build:provenance'); process.exit(1) }
  console.log(`Provenance check passed: ${sourceDigest}`)
}
