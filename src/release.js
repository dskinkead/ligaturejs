import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { inspectProject } from './project-check.js'

export function releaseReport(dir = process.cwd()) {
  const check = inspectProject(dir)
  let packageJson = {}
  try { packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) } catch {}
  let audit = null
  try { audit = JSON.parse(execFileSync('npm', ['audit', '--json'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) } catch {}
  return { ok: check.ok && (!audit?.metadata?.vulnerabilities?.high && !audit?.metadata?.vulnerabilities?.critical), package: { name: packageJson.name, version: packageJson.version }, contract: check, audit: audit?.metadata?.vulnerabilities ?? null }
}
