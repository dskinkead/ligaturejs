import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

async function port() { const s = net.createServer(); await new Promise(resolve => s.listen(0, '127.0.0.1', resolve)); const value = s.address().port; await new Promise(resolve => s.close(resolve)); return value }
test('project tracker supports project and task CRUD', async t => {
  const p = await port(); const dir = await mkdtemp(path.join(os.tmpdir(), 'ligature-project-'))
  const child = spawn(process.execPath, ['example/server.js'], { env: { ...process.env, PORT: String(p), DATABASE_PATH: path.join(dir, 'tracker.sqlite') }, stdio: 'ignore' }); t.after(() => child.kill('SIGTERM'))
  const base = `http://127.0.0.1:${p}`
  for (let i = 0; i < 30; i++) { try { if ((await fetch(`${base}/api/projects`)).ok) break } catch {} await new Promise(resolve => setTimeout(resolve, 100)) }
  const created = await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Website launch', description: 'Ship the new site' }) }); assert.equal(created.status, 201); const project = await created.json()
  const task = await fetch(`${base}/api/projects/${project.id}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Write release notes', priority: 'medium' }) }); assert.equal(task.status, 201)
  const detail = await fetch(`${base}/api/projects/${project.id}`); assert.equal(detail.status, 200); const body = await detail.json(); assert.equal(body.tasks.length, 1)
  const page = await fetch(`${base}/projects/${project.id}`); assert.equal(page.status, 200); assert.match(await page.text(), /Tasks for Website launch/)
})
