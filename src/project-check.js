import fs from 'node:fs'
import path from 'node:path'
import { checkApplication } from './check.js'
import { validateConfig } from './config.js'

export function inspectProject(dir = process.cwd()) {
  const errors = []
  const required = ['package.json', 'index.d.ts', 'schemas/application.schema.json', 'schemas/component.schema.json']
  for (const file of required) if (!fs.existsSync(path.join(dir, file))) errors.push(`Missing required file: ${file}`)
  let packageJson
  try { packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')) } catch { errors.push('Invalid package.json') }
  if (!packageJson?.name) errors.push('package.json missing name')
  const manifest = { schema: 'ligaturejs.application.v1', name: packageJson?.name, version: packageJson?.version || '0.0.0' }
  const result = checkApplication({ manifest })
  try {
    if (fs.existsSync(path.join(dir, 'ligature.config.json'))) validateConfig(JSON.parse(fs.readFileSync(path.join(dir, 'ligature.config.json'), 'utf8')))
  } catch (error) { errors.push(`Invalid Ligature config: ${error.message}`) }
  return { ok: errors.length === 0 && result.ok, errors: [...errors, ...result.errors] }
}
