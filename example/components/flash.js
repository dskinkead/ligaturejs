import { defineComponent, escapeHtml } from '../../src/index.js'

export default defineComponent({
  name: 'flash-message',
  props: { message: { required: true, type: 'string' }, kind: { type: 'string', default: 'info' } },
  render({ message, kind }) { return `<div role="status" class="flash flash-${escapeHtml(kind)}" data-flash>${escapeHtml(message)}<button type="button" aria-label="Dismiss message" data-dismiss>×</button></div>` },
  mount(element) { element.querySelector('[data-dismiss]')?.addEventListener('click', () => element.remove()) }
})
