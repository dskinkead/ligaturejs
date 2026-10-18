import test from 'node:test'
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

async function freePort() { const server = net.createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); const p = server.address().port; await new Promise(resolve => server.close(resolve)); return p }
test('project tracker supports browser project/task workflow', async t => {
  const port = await freePort(); const dir = await mkdtemp(path.join(os.tmpdir(), 'ligature-browser-'))
  const child = spawn(process.execPath, ['example/server.js'], { env: { ...process.env, PORT: String(port), DATABASE_PATH: path.join(dir, 'tracker.sqlite') }, stdio: ['ignore', 'pipe', 'pipe'] }); let diagnostics = ''; child.stderr.on('data', chunk => { diagnostics += chunk }); t.after(() => child.kill('SIGTERM'))
  const browser = await chromium.launch({ headless: true }); t.after(() => browser.close()); const page = await browser.newPage(); page.on('console', message => console.log(`browser:${message.type()}:${message.text()}`)); page.on('pageerror', error => console.log(`pageerror:${error.message}`)); const base = `http://127.0.0.1:${port}`
  let ready = false; for (let i = 0; i < 30; i++) { try { if ((await fetch(`${base}/api/projects`)).ok) { ready = true; break } } catch {} await new Promise(resolve => setTimeout(resolve, 100)) }; assert.equal(ready, true, diagnostics)
  await page.goto(base); await page.getByLabel('Name').fill('Launch project'); await page.getByLabel('Description').fill('Ship it'); const createResponse = page.waitForResponse(response => response.url().endsWith('/api/projects') && response.status() === 201); await page.getByRole('button', { name: 'Create project' }).click({ timeout: 5000 }); await createResponse; await page.waitForURL(base + '/'); const projectLink = page.getByRole('link', { name: 'Launch project' }); await projectLink.waitFor(); await projectLink.click(); await page.waitForLoadState('domcontentloaded');
  assert.equal(await page.getByRole('heading', { name: 'Launch project', exact: true }).count(), 1); await page.getByRole('textbox', { name: 'Task' }).fill('Publish documentation'); await page.getByLabel('Priority').selectOption('high'); const taskResponse = page.waitForResponse(response => response.url().includes('/tasks') && response.status() === 201); await page.getByRole('button', { name: 'Add task' }).click(); await taskResponse; await page.getByText('Publish documentation').waitFor(); const taskRow = page.locator('li[data-task-id]').filter({ hasText: 'Publish documentation' }); assert.equal(await taskRow.getByText('Priority: high').count(), 1)
  const toggleResponse = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().includes('/api/tasks/'))
  await taskRow.getByRole('button', { name: 'Mark complete' }).click(); await toggleResponse; await taskRow.getByRole('button', { name: 'Mark incomplete' }).waitFor()
  const deleteResponse = page.waitForResponse(response => response.request().method() === 'DELETE' && response.url().includes('/api/tasks/'))
  await taskRow.getByRole('button', { name: 'Delete' }).click(); await deleteResponse; await taskRow.waitFor({ state: 'detached' })
})
