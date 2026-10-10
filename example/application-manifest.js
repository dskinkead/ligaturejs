import { createApplicationManifest } from '../src/index.js'

export const applicationManifest = createApplicationManifest({
  name: 'ligature-project-tracker',
  version: '0.1.0',
  authentication: 'demoAuth',
  routes: [{ method: 'GET', path: '/', auth: false }, { method: 'GET', path: '/api/projects', auth: false }, { method: 'POST', path: '/api/projects', auth: false }, { method: 'GET', path: '/api/projects/:id', auth: false }, { method: 'POST', path: '/api/projects/:id/tasks', auth: false }],
  components: ['project-list', 'task-board'],
  capabilities: ['server-rendering', 'sqlite', 'project-crud', 'task-crud', 'lifecycle-cleanup']
})
