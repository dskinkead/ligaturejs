import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import net from 'node:net'

test('accessibility suite is explicit', async () => {
  const { AxeBuilder } = await import('@axe-core/playwright')
  const { chromium } = await import('playwright')
  const port = await freePort(); const child = spawn(process.execPath, ['example/server.js'], { stdio: 'ignore', env: { ...process.env, PORT: String(port) } })
  try {
    await waitForServer(port)
    const browser = await chromium.launch({ headless: true }); const context = await browser.newContext(); const page = await context.newPage(); await page.goto(`http://127.0.0.1:${port}/`)
    const results = await new AxeBuilder({ page }).analyze(); assert.deepEqual(results.violations, [])
    await context.close(); await browser.close()
  } finally { child.kill() }
})

function freePort() { return new Promise(resolve => { const server = net.createServer(); server.listen(0, () => { const port = server.address().port; server.close(() => resolve(port)) }) }) }
async function waitForServer(port) { for (let i = 0; i < 50; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return } catch {} await new Promise(resolve => setTimeout(resolve, 100)) } throw new Error('server not ready') }
