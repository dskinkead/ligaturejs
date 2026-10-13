import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

async function freePort() {
  const server = net.createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const value = server.address().port
  await new Promise(resolve => server.close(resolve))
  return value
}

test('project tracker supports project and task CRUD', async t => {
  const port = await freePort()
  const dir = await mkdtemp(path.join(os.tmpdir(), 'ligature-project-'))
  const child = spawn(process.execPath, ['example/server.js'], {
    env: { ...process.env, PORT: String(port), DATABASE_PATH: path.join(dir, 'tracker.sqlite') },
    stdio: ['ignore', 'ignore', 'pipe']
  })
  let serverError = ''
  child.stderr.setEncoding('utf8').on('data', chunk => { serverError += chunk })
  child.on('error', error => { serverError += `${error.message}\n` })
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill('SIGTERM')
  })
  const base = `http://127.0.0.1:${port}`
  await waitForServer(base, child, () => serverError)
  const created = await fetch(`${base}/api/projects`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Website launch', description: 'Ship the new site' }) }); assert.equal(created.status, 201); const project = await created.json()
  const task = await fetch(`${base}/api/projects/${project.id}/tasks`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Write release notes', priority: 'medium' }) }); assert.equal(task.status, 201)
  const detail = await fetch(`${base}/api/projects/${project.id}`); assert.equal(detail.status, 200); const body = await detail.json(); assert.equal(body.tasks.length, 1)
  const page = await fetch(`${base}/projects/${project.id}`); assert.equal(page.status, 200); assert.match(await page.text(), /Tasks for Website launch/)
})

async function waitForServer(base, child, getServerError) {
  const deadline = Date.now() + 10000
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(`Example server exited before becoming ready (${child.exitCode ?? child.signalCode}): ${getServerError()}`)
    }
    try {
      const response = await fetch(`${base}/api/projects`, { signal: AbortSignal.timeout(1000) })
      if (response.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  throw new Error(`Example server did not become ready within 10 seconds: ${getServerError()}`)
}
