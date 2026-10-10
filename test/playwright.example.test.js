import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'

test('example app renders component outlet in Chromium', async () => {
  let playwright
  try { playwright = await import('playwright') } catch { test.skip('Install playwright to run real browser coverage'); return }
  const browser = await playwright.chromium.launch({ headless: true })
  const port = await freePort()
  const child = spawn(process.execPath, ['example/server.js'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } })
  let childError = ''
  child.stderr.on('data', data => { childError += data })
  try {
    await waitForServer(port)
    const page = await browser.newPage()
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 5000 })
    await page.waitForSelector('[data-agent-outlet]')
    assert.equal(await page.locator('[data-agent-outlet]').count(), 1)
  } catch (error) { error.message += `; child=${childError}`; throw error } finally { child.kill(); await browser.close() }
})

test('example app serves the Ligature how-to page', async () => {
  const port = await freePort()
  const child = spawn(process.execPath, ['example/server.js'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } })
  try {
    await waitForServer(port)
    const response = await fetch(`http://127.0.0.1:${port}/how-to`)
    const html = await response.text()
    assert.equal(response.status, 200)
    assert.match(html, /How to use Ligature/)
    assert.match(html, /Create an application/)
    assert.match(html, /Routes and repositories/)
    assert.match(html, /Migrations and transactions/)
    assert.match(html, /Browser lifecycle/)
    assert.match(html, /Production checklist/)
  } finally { child.kill() }
})

test('example app serves useful HTML before browser enhancement', async () => {
  const port = await freePort()
  const child = spawn(process.execPath, ['example/server.js'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port) } })
  try {
    await waitForServer(port)
    const response = await fetch('http://127.0.0.1:' + port + '/')
    const html = await response.text()
    assert.equal(response.status, 200)
    assert.match(html, /<h1>Projects<\/h1>/)
    assert.match(html, /data-agent-component="project-list"/)
    assert.match(html, /data-agent-outlet/)
  } finally { child.kill() }
})

function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.listen(0, () => { const port = server.address().port; server.close(() => resolve(port)) }); server.on('error', reject) }) }
async function waitForServer(port) { for (let i = 0; i < 50; i++) { try { const response = await fetch(`http://127.0.0.1:${port}/`); if (response.ok) return } catch {} await new Promise(resolve => setTimeout(resolve, 100)) } throw new Error('Example server did not become ready') }
