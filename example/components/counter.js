import { defineComponent } from '../../src/component.js'

export default defineComponent({
  name: 'counter',
  version: '1.0.0',
  props: { initial: { type: 'number', default: 0 } },
  events: { increment: 'counter:increment' },
  render(props) { return `<button data-action="increment">Count: ${Number(props.initial ?? 0)}</button>` },
  mount(element) { element.addEventListener('click', event => { if (event.target.matches('[data-action="increment"]')) event.target.textContent = `Count: ${Number(event.target.textContent.match(/\d+/)?.[0] ?? 0) + 1}` }) }
})
