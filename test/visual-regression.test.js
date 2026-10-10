import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import net from 'node:net'

const root = process.cwd()
const fixtures = path.join(root, 'test', 'fixtures', 'visual')

test('example pages match their reviewed Chromium visual fixtures', async (t) => {
  let playwright
  try { playwright = await import('playwright') } catch { t.skip('Install playwright to run visual regression coverage'); return }
  const port = await freePort()
  const server = spawn(process.execPath, ['example/server.js'], { cwd: root, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, PORT: String(port) } })
  let serverError = ''
  server.stderr.on('data', data => { serverError += data })
  let browser
  try {
    await waitForServer(port)
    browser = await playwright.chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
    for (const [route, filename, fullPage] of [['/', 'example-home.png', false], ['/how-to', 'example-how-to.png', true]]) {
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle', timeout: 10000 })
      const fixture = path.join(fixtures, filename)
      assert.ok(fs.existsSync(fixture), `Missing ${path.relative(root, fixture)}; run npm run update:visual`)
      assert.deepEqual(await page.screenshot({ fullPage }), fs.readFileSync(fixture), `${route} changed; review and run npm run update:visual`)
    }
  } catch (error) { error.message += `; example server: ${serverError}`; throw error }
  finally { await browser?.close(); server.kill('SIGTERM') }
})

function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, () => { const port = server.address().port; server.close(() => resolve(port)) }) }) }
async function waitForServer(port) { for (let attempt = 0; attempt < 60; attempt++) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return } catch {} await new Promise(resolve => setTimeout(resolve, 100)) } throw new Error('Example server did not become ready') }
