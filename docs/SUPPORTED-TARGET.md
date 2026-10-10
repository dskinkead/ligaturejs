# Supported target

Ligature targets **server-first, progressively enhanced, HTML-oriented web
applications**. The framework-level contract is available as
frameworkTarget from the package entrypoint:

~~~js
import { frameworkTarget } from 'ligaturejs'

// {
//   schema: 'ligaturejs.target.v1',
//   architecture: 'server-first',
//   application: 'html-oriented',
//   enhancement: 'progressive',
//   hydration: 'optional',
//   clientJavaScript: 'optional'
// }
~~~

## What this means

An application fits the supported target when:

- the server can return the page's useful HTML from a request;
- components render ordinary HTML and receive application data as props;
- links and forms have meaningful HTTP behavior without requiring a hydrated
  client tree; and
- browser JavaScript may enhance interactions, navigation, or updates, but is
  not required merely to display the initial page.

Ligature's component registry and browser runtime support this boundary:
registry.render() produces the initial component HTML, while component assets
and lifecycle hooks add optional behavior after the document loads.
An `enhance(element, state)` client hook can add behavior directly to that
HTML without replacing it or requiring a hydrated client render tree.

## What this contract does not promise

This target is an architecture boundary, not a browser/version support policy,
release policy, or claim that every client-heavy application is a good fit.
Those policies require separate decisions. Applications that require a
client-owned render tree for their primary experience should choose a
client-centric framework instead of treating optional enhancement as a
requirement to recreate hydration.

## Relationship to React

Ligature and React can both be used to build web interfaces, but they start
from different ownership boundaries. Ligature treats the server response and
ordinary HTML as the primary application surface; browser JavaScript enhances
that surface when needed. React is a UI library with server-rendering and
client-rendering options, so a React application may also be server-first or
client-first depending on its surrounding architecture. This comparison is
about Ligature's contract, not a claim that React has only one deployment
model.

Choose Ligature when:

- useful HTML should be available directly from an HTTP request;
- links and forms should retain meaningful behavior without a client render
  tree; and
- application behavior is naturally expressed as server routes plus small,
  optional browser enhancements.

React may be a better fit when the primary product requirement is a
client-owned component tree, a React-specific ecosystem, or an interaction
model that assumes client rendering and state are available before the page
is useful. Ligature does not provide a React compatibility layer, JSX
runtime, or a promise that React components can be mounted into its registry
without an adapter owned by the application.

## Explicit non-targets

Ligature does not target:

- applications whose primary content cannot be useful until client
  JavaScript has rendered or hydrated it;
- offline-first or local-only applications whose authoritative state lives in
  the browser;
- highly interactive graphics, games, or editors where a continuously
  client-owned render loop is the product's core surface; or
- drop-in migration of React components, hooks, JSX, or React server/client
  boundaries.

These are fit decisions, not quality judgments. A project can still use a
separate client-focused tool for an isolated surface while keeping a
Ligature application server-first at its outer boundary.

## Example verification

The reference project tracker is the conformance example for this target. Its
root page includes project HTML and component mount markers in the HTTP response
before any browser JavaScript runs. The regression test
