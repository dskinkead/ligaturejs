#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { inspectProject } from './project-check.js'
import { releaseReport } from './release.js'
import { loadConfig } from './config.js'
import { buildProject, inspectBuild } from './build.js'
import { upgradeProject } from './upgrade.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const [, , command, type, initialName, ...rest] = process.argv
let name = initialName
let target = rest[0] || name

function write(file, content) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content) }
function copyTree(source, destination) { const entries = fs.readdirSync(source, { withFileTypes: true }).filter(entry => !['node_modules', '.git', 'backups'].includes(entry.name)); for (const entry of entries) { const from = path.join(source, entry.name); const to = path.join(destination, entry.name); if (entry.isDirectory()) { fs.mkdirSync(to, { recursive: true }); copyTree(from, to) } else { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to) } } }
function kebab(value) { return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }
function usage() { console.log('Usage: ligature <create|dev|build|start|test|check|manifest|upgrade|release> [type] [name] [directory]') }

async function prompt(question) {
  const readline = await import('node:readline/promises')
  const input = readline.createInterface({ input: process.stdin, output: process.stdout })
  try { return (await input.question(question)).trim() } finally { input.close() }
}

if (command === 'create' && type === 'app' && !name) {
  if (!process.stdin.isTTY) {
    const answers = fs.readFileSync(0, 'utf8').split(/\r?\n/)
    name = answers[0]?.trim() || 'my-ligature-app'
    target = answers[1]?.trim() || name
  } else {
    name = await prompt('Application name [my-ligature-app]: ') || 'my-ligature-app'
    target = await prompt(`Directory [${name}]: `) || name
  }
}

if (command === 'create' && type === 'component') {
  const component = kebab(name); const dir = path.resolve(target || '.')
  if (!component) throw new Error('Component name is required')
  write(path.join(dir, 'components', `${component}.js`), `import { defineComponent, escapeHtml } from 'ligaturejs'\n\nexport default defineComponent({\n  name: '${component}',\n  version: '1.0.0',\n  props: { title: { required: true, type: 'string' } },\n  events: {},\n  render(props) { return \`<section><h2>\${escapeHtml(props.title)}</h2></section>\` },\n  mount(element, state) {},\n  update(element, props, state) {},\n  unmount(element, state) {}\n})\n`)
  write(path.join(dir, 'test', `${component}.test.js`), `import test from 'node:test'\nimport assert from 'node:assert/strict'\nimport component from '../components/${component}.js'\n\ntest('${component} has a stable contract', () => { assert.equal(component.name, '${component}'); assert.equal(typeof component.render, 'function') })\n`)
  console.log(`Created component ${component} in ${dir}`)
} else if (command === 'create' && type === 'route') {
  const route = kebab(name); const dir = path.resolve(target || '.')
  write(path.join(dir, 'routes', `${route}.js`), `import { defineRoute } from 'ligaturejs'\n\nexport default defineRoute({\n  method: 'GET',\n  path: '/${route}',\n  auth: true,\n  input: {},\n  output: {},\n  async handle({ user, repositories }) { return { ok: true, user: user?.id } }\n})\n`)
  write(path.join(dir, 'test', `${route}.route.test.js`), `import test from 'node:test'\nimport assert from 'node:assert/strict'\nimport route from '../routes/${route}.js'\n\ntest('${route} route has a contract', () => { assert.equal(route.path, '/${route}'); assert.equal(route.method, 'GET') })\n`)
  console.log(`Created route ${route} in ${dir}`)
} else if (command === 'create' && type === 'repository') {
  const repository = kebab(name); const dir = path.resolve(target || '.')
  write(path.join(dir, 'repositories', `${repository}.js`), `import { defineRepository } from 'ligaturejs'\n\nexport default defineRepository({\n  name: '${repository}',\n  methods: { all: async () => [], find: async () => null }\n})\n`)
  write(path.join(dir, 'test', `${repository}.repository.test.js`), `import test from 'node:test'\nimport assert from 'node:assert/strict'\nimport repository from '../repositories/${repository}.js'\n\ntest('${repository} repository has methods', () => { assert.equal(repository.name, '${repository}'); assert.equal(typeof repository.methods.all, 'function') })\n`)
  console.log(`Created repository ${repository} in ${dir}`)
} else if (command === 'create' && type === 'migration') {
  const migration = String(name || '').replace(/[^a-zA-Z0-9_-]/g, '') || '001_initial'; const dir = path.resolve(target || '.')
  write(path.join(dir, 'migrations', `${migration}.js`), `import { defineMigration } from 'ligaturejs'\n\nexport default defineMigration({\n  id: '${migration}',\n  description: 'Describe this migration',\n  async up(adapter) {},\n  async down(adapter) {}\n})\n`)
  console.log(`Created migration ${migration} in ${dir}`)
} else if (command === 'create' && type === 'test') {
  const fixture = kebab(name); const dir = path.resolve(target || '.')
  if (!fixture) throw new Error('Test name is required')
  write(path.join(dir, 'test', `${fixture}.test.js`), `import test from 'node:test'\nimport assert from 'node:assert/strict'\n\ntest('${fixture} contract', () => { assert.ok(true) })\n`)
  console.log(`Created test ${fixture} in ${dir}`)
} else if (command === 'create' && type === 'app') {
  const app = kebab(name); const dir = path.resolve(target || name || '.')
  if (!app) throw new Error('App name is required')
  write(path.join(dir, 'package.json'), JSON.stringify({ name: app, private: true, type: 'module', scripts: { start: 'ligature start', dev: 'ligature dev', build: 'ligature build', test: 'ligature test', check: 'ligature check' }, dependencies: { 'ligaturejs': 'file:vendor/ligaturejs' } }, null, 2) + '\n')
  const vendor = path.join(dir, 'vendor', 'ligaturejs'); fs.mkdirSync(vendor, { recursive: true }); for (const item of ['src', 'schemas', 'index.d.ts', 'package.json', 'LICENSE']) { const from = path.resolve(root, '..', item); const to = path.join(vendor, item); if (fs.statSync(from).isDirectory()) copyTree(from, to); else { fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(from, to) } }
  write(path.join(dir, 'components', '.gitkeep'), '')
  write(path.join(dir, 'src', 'server.js'), [
    "import http from 'node:http'",
    '',
    'const port = Number(process.env.PORT || 3000)',
    'const server = http.createServer((req, res) => {',
    "  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })",
    `  res.end(${JSON.stringify(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${app}</title><style>:focus-visible{outline:3px solid currentColor;outline-offset:3px}.skip-link{position:absolute;left:-10000px}.skip-link:focus{left:1rem}</style></head><body><a class="skip-link" href="#main">Skip to content</a><main id="main"><h1>${app}</h1><p>Ligature app is running.</p></main></body></html>`)})`,
    '})',
    '',
    `server.listen(port, () => console.log(${JSON.stringify(`${app} listening on http://localhost:`)} + port))`,
    ''
  ].join('\n'))
  write(path.join(dir, 'routes', '.gitkeep'), '')
  write(path.join(dir, 'repositories', '.gitkeep'), '')
  write(path.join(dir, 'test', '.gitkeep'), '')
  write(path.join(dir, 'ligature.config.json'), JSON.stringify({ server: 'src/server.js', buildDir: '.ligature/build', port: 3000, host: '127.0.0.1', watch: true }, null, 2) + '\n')
  write(path.join(dir, 'AGENTS.md'), `# ${app}\n\nBuild this application using the Ligature contracts.\n`)
  console.log(`Created app ${app} at ${dir}`)
} else if (command === 'dev' || command === 'start') {
  const { spawn } = await import('node:child_process')
  const cwd = path.resolve(type || '.')
  const config = await loadConfig(cwd, { watch: command === 'dev' })
  const script = path.resolve(cwd, config.server)
  if (!fs.existsSync(script)) throw new Error(`Missing ${script}; create an app or provide a project directory`)
  const args = command === 'dev' ? ['--watch', script] : [script]
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env: {
    ...process.env,
    ...Object.fromEntries(Object.entries(config.environment).map(([key, value]) => [key, String(value)])),
    NODE_ENV: process.env.NODE_ENV || (command === 'dev' ? 'development' : 'production'),
    PORT: process.env.PORT || String(config.port),
    HOST: process.env.HOST || config.host,
    LIGATURE_BASE_PATH: config.proxy.basePath,
    LIGATURE_PROXY_TRUST: String(config.proxy.trust),
    LIGATURE_HTTPS: config.https ? '1' : '0',
    ...(config.https ? { LIGATURE_HTTPS_KEY: config.https.key, LIGATURE_HTTPS_CERT: config.https.cert, ...(config.https.ca ? { LIGATURE_HTTPS_CA: config.https.ca } : {}) } : {})
  } })
  process.once('SIGINT', () => child.kill('SIGINT'))
  process.once('SIGTERM', () => child.kill('SIGTERM'))
  child.on('exit', code => { process.exitCode = code ?? 0 })
} else if (command === 'manifest') {
  const file = path.resolve(target || 'application-manifest.js')
  if (fs.existsSync(file)) console.log(fs.readFileSync(file, 'utf8'))
  else console.log('Use the running application manifest endpoint: /__agent_tags/manifest.json')
} else if (command === 'test') {
  const { spawnSync } = await import('node:child_process'); process.exitCode = spawnSync('node', ['--test'], { stdio: 'inherit', cwd: process.cwd() }).status ?? 1
} else if (command === 'check') {
  const cwd = path.resolve(type || '.')
  const result = inspectProject(cwd)
  if (result.ok && fs.existsSync(path.join(cwd, '.ligature', 'build', 'build-manifest.json'))) { const build = inspectBuild(path.join(cwd, '.ligature', 'build')); result.errors.push(...build.errors); result.ok = build.ok }
  console.log(result.ok ? 'Project contract check passed' : result.errors.join('\n')); process.exitCode = result.ok ? 0 : 1
} else if (command === 'build') {
  const cwd = path.resolve(type || '.')
  const result = await buildProject(cwd)
  console.log(`Built ${result.manifest.files.length} files in ${path.relative(cwd, result.output) || '.'}`)
} else if (command === 'upgrade') {
  const checking = type === '--check' || rest.includes('--check')
  const cwd = path.resolve(checking ? (name || rest.find(value => value !== '--check') || '.') : (type || '.'))
  const report = upgradeProject(cwd, { check: checking })
  if (!report.ok) { console.error(report.errors.join('\n')); process.exitCode = 1 }
  else if (report.needed) { console.log(`Upgrade available: ${report.current} -> ${report.target}`); process.exitCode = 2 }
  else console.log(report.changed ? `Upgrade applied: ${report.target}` : `Already at ${report.target}`)
} else if (command === 'release') {
  const report = releaseReport(process.cwd()); console.log(JSON.stringify(report, null, 2)); process.exitCode = report.ok ? 0 : 1
} else usage()
