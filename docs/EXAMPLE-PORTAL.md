# Example portal

The repository's `example/` application is a complete project portal rather
than a collection of isolated CRUD snippets. It has a server-rendered project
list, project detail pages, task creation and updates, a browser-enhanced task
board, an application manifest, request IDs, and a how-to page.

## Run it

```bash
npm start
# visit http://localhost:4177
```

The home page and project detail page remain useful with JavaScript disabled.
The runtime enhances the component markers after the HTML has arrived. The
integration checks in `test/example-project-tracker.test.js` cover project and
task writes; `test/playwright.example.test.js` covers browser enhancement and
the server-first HTML boundary.

## The four boundaries

| Boundary | Example implementation | Responsibility |
| --- | --- | --- |
| Components | `example/components/` | Render HTML and own browser lifecycle |
| Routes | `example/server.js` | Parse requests, choose status, serialize responses |
| Repository | `example/project-repository.js` | Own persistence and transactions |
| Manifest | `example/application-manifest.js` | Describe the app to tooling and agents |

This small portal intentionally demonstrates the framework's server-first
target. It is not a promise that every application should use the same
repository or transport implementation.
