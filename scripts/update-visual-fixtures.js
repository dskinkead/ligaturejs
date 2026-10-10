#!/usr/bin/env node
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const fixtureDir = path.join(projectRoot, 'test', 'fixtures', 'visual')
const shouldUpdate = process.argv.includes('--update')

let playwright
try { playwright = await import('playwright') } catch { console.error('Playwright is required to capture visual fixtures'); process.exitCode = 1 }

if (playwright) {
  const port = await freePort()
  const server = spawn(process.execPath, ['example/server.js'], { cwd: projectRoot, stdio: ['ignore', 'ignore', 'pipe'], env: { ...process.env, PORT: String(port) } })
  let browser
  try {
    await waitForServer(port)
    browser = await playwright.chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
    for (const [route, filename] of [['/', 'example-home.png'], ['/how-to', 'example-how-to.png']]) {
      await page.goto(`http://127.0.0.1:${port}${route}`, { waitUntil: 'networkidle', timeout: 10000 })
      const output = path.join(fixtureDir, filename)
      const screenshot = await page.screenshot({ fullPage: route === '/how-to' })
      if (shouldUpdate) { fs.mkdirSync(fixtureDir, { recursive: true }); fs.writeFileSync(output, screenshot); console.log(`Updated ${path.relative(projectRoot, output)}`) }
      else if (!fs.existsSync(output)) throw new Error(`Missing ${path.relative(projectRoot, output)}; run npm run update:visual`)
      else if (!screenshot.equals(fs.readFileSync(output))) throw new Error(`Visual drift detected in ${path.relative(projectRoot, output)}; run npm run update:visual after review`)
      else console.log(`Verified ${path.relative(projectRoot, output)}`)
    }
  } finally { await browser?.close(); server.kill('SIGTERM') }
}

function freePort() { return new Promise((resolve, reject) => { const server = net.createServer(); server.once('error', reject); server.listen(0, () => { const port = server.address().port; server.close(() => resolve(port)) }) }) }
async function waitForServer(port) { for (let attempt = 0; attempt < 60; attempt++) { try { if ((await fetch(`http://127.0.0.1:${port}/`)).ok) return } catch {} await new Promise(resolve => setTimeout(resolve, 100)) } throw new Error('Example server did not become ready') }
