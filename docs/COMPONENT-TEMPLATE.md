# Component Template

```js
import { defineComponent, escapeHtml } from 'ligaturejs'

export default defineComponent({
  name: 'example-card',
  version: '1.0.0',
  props: {
    title: { required: true, type: 'string' },
    description: { type: 'string', default: '' }
  },
  events: { select: 'example-card:select' },
  render(props) {
    return `<article><h2>${escapeHtml(props.title)}</h2><p>${escapeHtml(props.description)}</p></article>`
  },
  mount(element, state) {},
  update(element, props, state) {},
  unmount(element, state) {}
})
```

Never put database queries, credentials, or unescaped user input in a component client asset.
