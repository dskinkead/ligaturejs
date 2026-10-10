# Ligature redesign

Ligature is a server-first component framework for data-driven Express
applications. The redesign makes components the center of the system while
keeping ordinary HTML, optional browser behavior, and agent-readable contracts.

## Component API

```js
defineComponent({
  name: 'profile-card',
  props: { profile: { required: true, type: 'object' } },
  styles: '.profile-card { display: block; }',
  state: () => ({ selected: false }),
  render(props, state, context) { return '<article>...</article>' },
  client: {
    mount(element, state) {},
    update(element, props, state) {},
    unmount(element, state) {}
  }
})
```

The server registry supports child rendering through `context.render`, slots,
instance-local state metadata, and deterministic component contracts. Styles are
discoverable component assets and can be served through the Ligature middleware.

## Browser runtime

The runtime now provides:

- Explicit registration and mounting
- Instance-local state
- Targeted updates
- MutationObserver-based dynamic mount/unmount
- Cleanup for removed component trees
- Outlet navigation
- Browser history integration

Components should clean up listeners, timers, observers, and subscriptions in
`unmount`.

## Developer workflow

```bash
ligature create app my-app ./my-app
cd my-app
npm install
ligature dev .
npm test
```

Use the route, repository, and migration generators when those boundaries are
needed. They are conventions, not a requirement for a static component.

## Intended niche

Ligature is not intended to replace React for every client-heavy application.
It is designed as a lower-ceremony alternative for server-first, data-driven,
SEO-sensitive, and AI-agent-built applications. React remains a strong choice
for large client-centric applications with extensive ecosystem needs.

