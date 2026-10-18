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
  const page = await fetch(`${base}/projects/${project.id}`); assert.equal(page.status, 200); const taskPage = await page.text(); assert.match(taskPage, /Tasks for Website launch/)
  assert.match(taskPage, new RegExp(`<form action="/projects/${project.id}/tasks" method="post"`))
  const formTask = await fetch(`${base}/projects/${project.id}/tasks`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ title: 'Verify without JavaScript', priority: 'high' }) })
  assert.equal(formTask.status, 303); assert.equal(formTask.headers.get('location'), `/projects/${project.id}`)
  const formProject = await fetch(base, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ name: 'No-JavaScript project', description: 'Created with a native form' }) })
  assert.equal(formProject.status, 303); assert.equal(formProject.headers.get('location'), '/')
  const projectList = await fetch(base); assert.match(await projectList.text(), /<form action="\/" method="post"/)
  const updatedDetail = await fetch(`${base}/api/projects/${project.id}`); const updatedProject = await updatedDetail.json(); assert.equal(updatedProject.tasks.length, 2)
  const formCreatedTask = updatedProject.tasks.find(item => item.title === 'Verify without JavaScript')
  const toggleForm = await fetch(`${base}/projects/${project.id}`); const toggleHtml = await toggleForm.text()
  assert.match(toggleHtml, new RegExp(`<form action="/tasks/${formCreatedTask.id}/toggle" method="post"`))
  assert.match(toggleHtml, new RegExp(`<form action="/tasks/${formCreatedTask.id}/delete" method="post"`))
  const toggled = await fetch(`${base}/tasks/${formCreatedTask.id}/toggle`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ done: 'true' }) })
  assert.equal(toggled.status, 303); assert.equal(toggled.headers.get('location'), `/projects/${project.id}`)
  const deleted = await fetch(`${base}/tasks/${formCreatedTask.id}/delete`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams() })
  assert.equal(deleted.status, 303)
  const finalDetail = await fetch(`${base}/api/projects/${project.id}`); assert.equal((await finalDetail.json()).tasks.length, 1)
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
