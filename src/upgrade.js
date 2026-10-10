import fs from 'node:fs'
import path from 'node:path'

const frameworkVersion = '0.1.0'

export function inspectUpgrade(dir = process.cwd()) {
  const packageFile = path.join(dir, 'package.json')
  if (!fs.existsSync(packageFile)) return { ok: false, errors: ['Missing package.json'], current: null, target: frameworkVersion }
  let packageJson
  try { packageJson = JSON.parse(fs.readFileSync(packageFile, 'utf8')) } catch { return { ok: false, errors: ['Invalid package.json'], current: null, target: frameworkVersion } }
  const marker = path.join(dir, '.ligature', 'framework-version')
  const current = fs.existsSync(marker) ? fs.readFileSync(marker, 'utf8').trim() : packageJson.dependencies?.ligaturejs?.replace(/^file:.*/, '') || 'unknown'
  return { ok: true, errors: [], current, target: frameworkVersion, needed: current !== frameworkVersion }
}

export function upgradeProject(dir = process.cwd(), options = {}) {
  const report = inspectUpgrade(dir)
  if (!report.ok || options.check || !report.needed) return report
  const stateDir = path.join(dir, '.ligature')
  fs.mkdirSync(stateDir, { recursive: true })
  fs.writeFileSync(path.join(stateDir, 'framework-version'), `${frameworkVersion}\n`)
  const manifest = { schema: 'ligaturejs.upgrade.v1', from: report.current, to: frameworkVersion, applied: ['framework-version-marker'] }
  fs.writeFileSync(path.join(stateDir, 'upgrade-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
  return { ...report, needed: false, changed: true, manifest }
}

export { frameworkVersion }
