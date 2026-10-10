# Troubleshooting and FAQ

## The page is blank without JavaScript

Check that the route calls `registry.render` and sends the returned HTML before
adding a browser script. Inspect the response with `curl -i`; server-rendered
component markers should be present.

## Hydration reports a mismatch

Confirm that server and client use the same props and deterministic data order.
Do not render timestamps, random IDs, or locale-dependent values in the first
markup. Use the mismatch diagnostic's component and DOM location to narrow the
boundary, then add a semantic regression test.

## A form loses its value after navigation

Use stable `data-agent-field` keys for repeated controls and update only the
replaceable outlet. `Ligature.replace` and `Ligature.navigate` preserve matched
values, checked state, focus, and selection.

## An action returns 403

Unsafe cookie-authenticated methods require a session-bound CSRF token. Verify
the session is available to the action handler and include the token in the
documented header or form field. Authorization failures are separate from CSRF
failures and should remain distinct in logs.

## Browser tests are skipped

Install dependencies with `npm install` and the Playwright browsers with
`npx playwright install`. The compatibility suite intentionally skips engines
that are unavailable locally; CI installs Chromium, Firefox, and WebKit.

## Where should code go?

Components render and enhance; routes handle HTTP; repositories handle data;
migrations change schemas. For agent work, read `docs/AGENT-GUIDE.md`, choose
one bounded contract, add its test, and report verification.
