import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import net from 'node:net'

const root = path.resolve(new URL('..', import.meta.url).pathname)
const react = '/home/dkinkead/ligature-react-benchmark'
const kind = process.argv[2]

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function freePort() {
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  await new Promise(resolve => server.close(resolve))
  return port
}
async function waitFor(url, log) {
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(url)).ok) return } catch {}
    await sleep(100)
  }
  throw new Error(`Timed out waiting for ${url}\n${log()}`)
}
function launch(command, args, cwd, env) {
  return spawn(command, args, { cwd, env: { ...process.env, ...env }, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] })
}
function stop(child) {
  if (!child || child.exitCode !== null) return
  if (process.platform !== 'win32') { try { process.kill(-child.pid, 'SIGTERM') } catch {} }
  else child.kill('SIGTERM')
}
async function runLigature() {
  const port = await freePort(); const dir = await mkdtemp(path.join(tmpdir(), 'ligature-bench-'))
  const child = launch(process.execPath, ['example/server.js'], root, { PORT: port, DATABASE_PATH: path.join(dir, 'tracker.sqlite') }); let log = ''; child.stderr.on('data', chunk => { log += chunk })
  let browser
  try {
    const base = `http://127.0.0.1:${port}`; await waitFor(`${base}/api/projects`, () => log)
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(5000)
    await page.goto(base); await page.getByLabel('Name').fill('Launch project'); await page.getByLabel('Description').fill('Ship it')
    const created = page.waitForResponse(response => response.url().endsWith('/api/projects') && response.status() === 201); await page.getByRole('button', { name: 'Create project' }).click(); await created
    await page.waitForURL(base + '/'); await page.getByRole('link', { name: 'Launch project' }).click(); await page.getByRole('heading', { name: 'Launch project', exact: true }).waitFor()
    await page.getByRole('textbox', { name: 'Task' }).fill('Publish documentation'); const task = page.waitForResponse(response => response.url().includes('/tasks') && response.status() === 201); await page.getByRole('button', { name: 'Add task' }).click(); await task; await page.getByText('Publish documentation').waitFor()
  } finally { await browser?.close(); stop(child); await rm(dir, { recursive: true, force: true }) }
}
async function runReact() {
  const apiPort = await freePort(); const webPort = await freePort(); const dir = await mkdtemp(path.join(tmpdir(), 'react-bench-')); let log = ''
  const api = launch(process.execPath, ['src/server.js'], react, { PORT: apiPort, DATABASE_PATH: path.join(dir, 'db.sqlite') }); const vite = launch(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', webPort], react); api.stderr.on('data', chunk => { log += chunk }); vite.stderr.on('data', chunk => { log += chunk })
  let browser
  try {
    await waitFor(`http://127.0.0.1:${apiPort}/api/projects`, () => log); await waitFor(`http://127.0.0.1:${webPort}`, () => log)
    browser = await chromium.launch({ headless: true }); const page = await browser.newPage(); page.setDefaultTimeout(5000); await page.addInitScript(({ apiPort: port }) => { window.__API_ORIGIN = `http://127.0.0.1:${port}` }, { apiPort })
    await page.goto(`http://127.0.0.1:${webPort}`); await page.getByLabel('Name').fill('Launch project'); await page.getByRole('button', { name: 'Create project' }).click(); await page.getByRole('button', { name: 'Launch project' }).click(); await page.getByLabel('Task').fill('Publish documentation'); await page.getByRole('button', { name: 'Add task' }).click(); await page.getByText('Publish documentation').waitFor()
  } finally { await browser?.close(); stop(api); stop(vite); await rm(dir, { recursive: true, force: true }) }
}
if (kind === 'ligature') await runLigature()
else if (kind === 'react') await runReact()
else throw new Error('Usage: node scripts/benchmark-worker.js <ligature|react>')
