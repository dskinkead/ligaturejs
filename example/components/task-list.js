import { defineComponent, escapeHtml } from '../../src/index.js'

export default defineComponent({
  name: 'task-list',
  version: '1.0.0',
  props: { tasks: { required: true, type: 'object' } },
  events: { toggle: 'task-list:toggle', add: 'task-list:add' },
  render({ tasks }) {
    return `<section class="task-list"><form data-task-form><input name="title" required maxlength="120" placeholder="New task"><button>Add</button></form><ul data-task-items>${tasks.map(task => `<li data-task-id="${escapeHtml(task.id)}"><label><input type="checkbox" data-task-toggle ${task.done ? 'checked' : ''}> ${escapeHtml(task.title)}</label></li>`).join('')}</ul></section>`
  },
  mount(element) {
    element.addEventListener('submit', async event => {
      if (!event.target.matches('[data-task-form]')) return
      event.preventDefault()
      const input = event.target.elements.title
      const title = input.value.trim()
      if (!title) return
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title }) })
      if (response.ok) { input.value = ''; window.location.reload() }
    })
    element.addEventListener('change', async event => {
      if (!event.target.matches('[data-task-toggle]')) return
      const id = event.target.closest('[data-task-id]').dataset.taskId
      await fetch(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ done: event.target.checked }) })
    })
  }
})
