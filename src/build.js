import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { loadConfig } from './config.js'

const roots = ['src', 'components', 'routes', 'repositories', 'migrations']

export async function buildProject(dir = process.cwd(), options = {}) {
  const config = await loadConfig(dir, options)
  const output = path.resolve(dir, options.output ?? config.buildDir)
  const files = collectFiles(dir, roots).concat(fs.existsSync(path.join(dir, 'package.json')) ? ['package.json'] : [])
  fs.rmSync(output, { recursive: true, force: true })
  const entries = []
  for (const relative of files.sort()) {
    const source = path.join(dir, relative)
    const destination = path.join(output, relative)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    const original = fs.readFileSync(source)
    let content = original
    if (relative.endsWith('.js')) {
      const mapName = `${path.basename(relative)}.map`
      content = Buffer.from(`${original.toString()}\n//# sourceMappingURL=${mapName}\n`)
      fs.writeFileSync(`${destination}.map`, JSON.stringify({ version: 3, file: path.basename(relative), sources: [relative], sourcesContent: [original.toString()], names: [], mappings: '' }) + '\n')
    }
    fs.writeFileSync(destination, content)
    entries.push({ file: relative, bytes: content.byteLength, sha256: crypto.createHash('sha256').update(content).digest('hex') })
  }
  const manifest = { schema: 'ligaturejs.build.v1', name: readPackage(dir).name, version: readPackage(dir).version, config: { server: config.server, port: config.port, host: config.host, https: Boolean(config.https), proxy: config.proxy }, files: entries }
  fs.writeFileSync(path.join(output, 'build-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return { output, manifest }
}

export function inspectBuild(dir) {
  const file = path.resolve(dir, 'build-manifest.json')
  if (!fs.existsSync(file)) return { ok: false, errors: [`Missing build manifest: ${file}`] }
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'))
  const errors = []
  if (manifest.schema !== 'ligaturejs.build.v1') errors.push('Invalid build manifest schema')
  for (const entry of manifest.files ?? []) {
    const target = path.join(dir, entry.file)
    if (!fs.existsSync(target)) errors.push(`Missing build file: ${entry.file}`)
    else if (crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex') !== entry.sha256) errors.push(`Changed build file: ${entry.file}`)
  }
  return { ok: errors.length === 0, errors, manifest }
}

function collectFiles(dir, selectedRoots) {
  const result = []
  for (const root of selectedRoots) {
    const base = path.join(dir, root)
    if (!fs.existsSync(base)) continue
    walk(base, dir, result)
  }
  return result
}
function walk(current, base, result) {
  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    if (['node_modules', '.git', '.ligature'].includes(entry.name)) continue
    const target = path.join(current, entry.name)
    if (entry.isDirectory()) walk(target, base, result)
    else result.push(path.relative(base, target))
  }
}
function readPackage(dir) { try { return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) } catch { return {} } }
