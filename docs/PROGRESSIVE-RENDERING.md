# Progressive rendering guidance

Ligature's server renderer currently returns complete, deterministic HTML
strings. It does not expose a framework-level `renderToStream` API. An
application may still progressively deliver a document by composing complete
Ligature renders with the response API supplied by its HTTP server.

## Recommended response shape

1. Render and write the document shell first. Include the page's critical
   navigation, heading, loading placeholders, and an empty or pending
   `[data-agent-outlet]` where navigation will be enhanced.
2. Load request data outside component `render` functions. Components should
   receive the resolved value as props; this preserves deterministic output
   and keeps rendering side-effect free.
3. Write each completed section as a complete HTML fragment. Use an explicit
   `options.id` when independently rendered fragments are combined into one
   response, so `data-agent-instance` values cannot collide.
4. Flush after meaningful chunks only when the deployment stack supports
   flushing. Proxies may buffer chunks, so progressive delivery is an
   optimization rather than an application correctness requirement.
5. End the response with the normal closing document markup. If a later data
   load fails, send a user-visible error fragment or use the application's
   normal error response before ending the response.

For example, an Express handler can use the registry's existing complete
rendering contract:

```js
app.get('/dashboard', async (req, res, next) => {
  try {
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.write('<!doctype html><main><h1>Dashboard</h1><div data-agent-outlet>')
    res.write(registry.render('dashboard-loading', {}, { id: 'dashboard-loading' }))

    const data = await repository.dashboard(req)
    res.write(registry.render('dashboard', data, { id: 'dashboard-content' }))
    res.end('</div></main>')
  } catch (error) {
    if (res.headersSent) res.end('<p role="alert">Unable to load dashboard.</p></div></main>')
    else next(error)
  }
})
```

The example's fallback and error strings are trusted HTML and must be authored
with the same escaping and accessibility care as component output. User data
must be escaped before it enters component markup. A response must not write
an incomplete component wrapper: each `registry.render()` result includes its
own mount metadata and can be consumed by the browser runtime independently.

## Boundaries and future API work

- JavaScript is optional. The first bytes must remain useful HTML when the
  browser never runs the Ligature client.
- Streaming does not change the hydration contract. Use stable explicit IDs
  for independently emitted fragments and register client assets before the
  browser needs to enhance a fragment.
- Do not share a registry render across requests or mutate component state
  between writes. Request data belongs in the request handler and render
  props.
- Cancellation, back-pressure, and aborting pending data work remain the
  responsibility of the HTTP/application layer; Ligature does not currently
  manage them.
- A future framework streaming API must preserve deterministic component
  markers, escaping, progressive enhancement, and useful no-JavaScript HTML.

This guidance documents the supported composition pattern. Native streaming
rendering remains planned and is tracked in the feature-status matrix.
