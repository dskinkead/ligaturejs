import http from 'node:http'
import { createComponentRegistry, ligatureMiddleware, escapeHtml } from '../src/index.js'
import projectList from './components/project-list.js'
import taskBoard from './components/task-board.js'
import { createProjectRepository } from './project-repository.js'
import { applicationManifest } from './application-manifest.js'

const registry = createComponentRegistry().register(projectList).register(taskBoard)
const repository = createProjectRepository(process.env.DATABASE_PATH || ':memory:')
const middleware = ligatureMiddleware(registry)
http.createServer((req,res)=>{
  const url = new URL(req.url,'http://localhost')
  res.setHeader('X-Request-Id', req.headers['x-request-id'] || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`)
  if (url.pathname === '/__agent_tags/application.json') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(applicationManifest)) }
  if (url.pathname === '/how-to' && req.method === 'GET') return sendHowTo(res)
  if (url.pathname === '/api/projects' && req.method === 'GET') return sendJson(res, 200, { data: repository.projects() })
  if (url.pathname === '/api/projects' && req.method === 'POST') return readJson(req, body => { if (!body?.name?.trim()) return sendJson(res, 400, { error: 'project name required' }); try { sendJson(res, 201, repository.createProject(body)) } catch { sendJson(res, 409, { error: 'project name already exists' }) } })
  const projectApi = url.pathname.match(/^\/api\/projects\/(\d+)$/)
  if (projectApi && req.method === 'GET') { const project = repository.project(projectApi[1]); return project ? sendJson(res, 200, { ...project, tasks: repository.tasks(project.id) }) : sendJson(res, 404, { error: 'not found' }) }
  if (projectApi && req.method === 'PATCH') return readJson(req, body => { const project = repository.updateProject(projectApi[1], body || {}); project ? sendJson(res, 200, project) : sendJson(res, 404, { error: 'not found' }) })
  if (projectApi && req.method === 'DELETE') return repository.removeProject(projectApi[1]) ? res.writeHead(204).end() : sendJson(res, 404, { error: 'not found' })
  const taskApi = url.pathname.match(/^\/api\/projects\/(\d+)\/tasks$/)
  if (taskApi && req.method === 'GET') return sendJson(res, 200, { data: repository.tasks(taskApi[1]) })
  if (taskApi && req.method === 'POST') return readJson(req, body => { if (!body?.title?.trim()) return sendJson(res, 400, { error: 'task title required' }); if (!['low', 'medium', 'high'].includes(body.priority)) return sendJson(res, 400, { error: 'priority must be low, medium, or high' }); try { const project = repository.project(taskApi[1]); if (!project) return sendJson(res, 404, { error: 'project not found' }); sendJson(res, 201, repository.createTask(taskApi[1], { title: body.title, priority: body.priority })) } catch { sendJson(res, 404, { error: 'project not found' }) } })
  const taskApiId = url.pathname.match(/^\/api\/tasks\/(\d+)$/)
  if (taskApiId && req.method === 'PATCH') return readJson(req, body => { const task = repository.updateTask(taskApiId[1], body || {}); task ? sendJson(res, 200, task) : sendJson(res, 404, { error: 'not found' }) })
  if (taskApiId && req.method === 'DELETE') return repository.removeTask(taskApiId[1]) ? res.writeHead(204).end() : sendJson(res, 404, { error: 'not found' })
  const projectPage = url.pathname.match(/^\/projects\/(\d+)$/)
  if (projectPage && req.method === 'GET') { const project = repository.project(projectPage[1]); if (!project) return sendJson(res, 404, { error: 'not found' }); const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(project.name)}</title><script src="/__agent_tags/runtime.js"></script></head><body><nav><a href="/">Projects</a></nav><main data-agent-outlet><h1>${escapeHtml(project.name)}</h1>${registry.render('task-board',{project,tasks:repository.tasks(project.id)},{id:`project-${project.id}`,data:{projectId:project.id}})}</main><script src="/__agent_tags/components/task-board.js"></script><script src="/example-bootstrap.js"></script></body></html>`; res.setHeader('content-type','text/html'); return res.end(html) }
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ligature Projects</title><script src="/__agent_tags/runtime.js"></script></head><body><nav aria-label="Primary"><a href="/">Projects</a><a href="/how-to">How to use Ligature</a><a href="/__agent_tags/application.json">Manifest</a></nav><main data-agent-outlet><h1>Projects</h1>${registry.render('project-list',{projects:repository.projects()},{id:'projects'})}</main><script src="/__agent_tags/components/project-list.js"></script><script src="/example-bootstrap.js"></script></body></html>`
  const next = () => {
    if (url.pathname === '/example-bootstrap.js') {
      res.statusCode = 200
      res.setHeader('content-type', 'text/javascript; charset=utf-8')
      res.setHeader('cache-control', 'no-store')
      return res.end("window.addEventListener('DOMContentLoaded',()=>window.Ligature?.mount(document));window.Ligature?.mount(document);")
    }
    if (url.pathname === '/') {
      res.statusCode = 200
      res.setHeader('content-type', 'text/html; charset=utf-8')
      return res.end(html)
    }
    res.statusCode = 404
    res.setHeader('content-type', 'application/json; charset=utf-8')
    return res.end(JSON.stringify({ error: 'not found' }))
  }
  const request = { path: url.pathname }
  const response = {
    set: (name, value) => { res.setHeader(name, value); return response },
    json: value => { res.setHeader('content-type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)) },
    type: value => { res.setHeader('content-type', value === 'js' ? 'text/javascript; charset=utf-8' : value); return response },
    send: value => res.end(value),
    status: value => { res.statusCode = value; return response },
    end: () => res.end()
  }
  return middleware(request, response, next)
}).listen(Number(process.env.PORT || 4177),()=>console.log(`Ligature example: http://localhost:${process.env.PORT || 4177}`))
process.on('SIGTERM', () => { repository.close(); process.exit(0) })

function readJson(req, callback) { let raw=''; req.on('data', chunk => { raw += chunk }); req.on('end', () => { try { callback(JSON.parse(raw || '{}')) } catch { callback({}) } }) }
function sendJson(res, status, value) { res.statusCode=status; res.setHeader('content-type','application/json'); res.end(JSON.stringify(value)) }

function sendHowTo(res) {
  const sections = [
    ['What Ligature is', '<p>Ligature is a server-first component system for Express applications. Components render ordinary HTML on the server and can declare optional browser behavior.</p>'],
    ['Create an application', '<pre><code>node src/cli.js create app my-app ./my-app\ncd my-app\nnpm install\nnpm test\nnpm start</code></pre>'],
    ['Build with contracts', '<p>Keep responsibilities explicit: components own UI, routes own HTTP and authorization, repositories own persistence, and migrations own schema changes.</p>'],
    ['Create a component', '<pre><code>import { defineComponent } from \'ligaturejs\'\n\nexport const profileCard = defineComponent({\n  name: \'profile-card\',\n  props: { profile: { required: true, type: \'object\' } },\n  render({ profile }) {\n    return &lt;article&gt;{profile.name}&lt;/article&gt;\n  }\n})</code></pre>'],
    ['Test your work', '<pre><code>npm test\nnpm run test:playwright\nnpm run test:a11y\nnpm run release:check</code></pre>'],
    ['Work safely with an AI agent', '<ol><li>Read the manifest and contracts.</li><li>Change one bounded feature.</li><li>Add regression tests.</li><li>Run the full verification gate.</li><li>Report changed files and rollback steps.</li></ol>'],
    ['Routes and repositories', '<p>Routes validate input, enforce authorization, call repositories, and return deliberate responses. Repositories are the persistence boundary; keep SQL and database details out of rendering.</p><pre><code>app.get(\'/api/profiles\', async (req, res) =&gt; {\n  const profiles = await repository.list()\n  res.json({ data: profiles })\n})</code></pre>'],
    ['Migrations and transactions', '<p>Give each schema change an identifier, an <code>up</code> operation, and a reversible <code>down</code> operation. Run related writes in a transaction and test both commit and rollback behavior.</p>'],
    ['Browser lifecycle', '<p>Declare browser behavior through the component contract. Use <code>mount</code>, <code>update</code>, and <code>unmount</code> for event listeners, timers, observers, and cleanup. Use <code>data-agent-outlet</code> and <code>Ligature.navigate(url)</code> for replaceable page regions.</p>'],
    ['Security basics', '<ul><li>Escape user-controlled values.</li><li>Use parameterized database queries.</li><li>Protect cookie-authenticated writes with CSRF tokens.</li><li>Keep secrets out of source control.</li><li>Do not expose stack traces to users.</li></ul>'],
    ['Production checklist', '<ul><li>Configure TLS and a reverse proxy.</li><li>Run migrations with rollback plans.</li><li>Verify backups by restoring them.</li><li>Monitor health and readiness endpoints.</li><li>Run dependency, accessibility, browser, and release checks.</li><li>Document privacy and retention rules.</li></ul>'],
    ['Full written guide', '<p>This page is the quick interactive guide. The complete long-form version is available in the repository at <code>docs/HOW-TO-LIGATURE.md</code>.</p>']
  ]
  const body = sections.map(([title, content]) => `<section><h2>${title}</h2>${content}</section>`).join('')
  res.statusCode = 200
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>How to use Ligature</title><style>body{font:16px system-ui;line-height:1.6;max-width:850px;margin:2rem auto;padding:0 1rem;color:#17202a}nav{display:flex;gap:1rem;margin-bottom:2rem}pre{background:#f3f5f7;padding:1rem;overflow:auto}section{margin:2rem 0}h1{font-size:2.2rem}</style></head><body><nav aria-label="Primary"><a href="/">Projects</a><a href="/__agent_tags/application.json">Manifest</a></nav><main><h1>How to use Ligature</h1><p>A practical guide to building server-first applications with Ligature.</p>${body}</main></body></html>`)
}
