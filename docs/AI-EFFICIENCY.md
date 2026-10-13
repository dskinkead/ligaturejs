# AI-assisted development and performance

Ligature's product goal is to help an AI agent complete ordinary web-app work
with less human steering and fewer incorrect changes, while keeping the
resulting application efficient at runtime. “AI-friendly” is a hypothesis to
validate, not a claim that follows from having agent-specific APIs or docs.

## North star

For a fixed application task, a capable agent using Ligature should produce a
correct, reviewable result with fewer human corrections and less interaction
overhead than with a suitable conventional baseline. The resulting app must
also meet the same user-visible behavior and performance requirements.

Optimize both sides of the work:

- **Development efficiency:** task success, correctness, human correction
  count, agent/tool turns, and elapsed time or token use when the harness can
  measure them reliably.
- **Application efficiency:** server-render latency, client runtime and asset
  size, unnecessary browser work, and useful HTML available before enhancement.

Do not infer agent time, tokens, or correction effort from final source files.
Record unavailable measurements as unavailable.

## Design implications

- Keep one discoverable contract for routes, repositories, components, forms,
  and migrations. Prefer scaffolds, schemas, manifests, and structured errors
  over parallel conventions that agents must guess between.
- Give agents a short path from task to context: a bounded app map, the relevant
  contract, the focused check, and the expected result. Avoid requiring a full
  repository read for a local change.
- Make generated changes easy to validate and diagnose. Checks should point to
  the contract violation and its location, not only report a generic failure.
- Preserve server-first behavior. Browser enhancement must remain optional;
  use the existing performance budgets and representative app paths to guard
  against runtime, asset, and render regressions.
- Add framework surface area only when it removes repeated ambiguity or work
  for both agents and maintainers. Tags, slots, or other syntax are not goals
  by themselves.

## Validation protocol

Before claiming a distinct agent advantage:

1. Choose representative, bounded app tasks that fit Ligature's supported
   target and can be completed in each baseline.
2. Start each run from a clean, equivalent snapshot. Give agents the same task,
   model/tool access, time budget, and relevant starting information.
3. Verify outcomes with the same behavior checks and independent review rubric.
   Record task success, defects, human corrections, agent/tool turns, and
   time/token metrics only when directly observed.
4. Measure the resulting applications against the same performance and
   user-visible requirements. Report the task, harness, baseline, sample size,
   failures, and limitations alongside results.
5. Use repeated results to choose improvements. Do not market a win from a
   single run or compare unlike application architectures.

The existing `npm run check:performance` enforces framework-level budgets;
it is not a substitute for measuring representative end-to-end applications.
The current effort-study script is an implementation-size and verification
helper, not a controlled agent-comparison result.

## Decision rule

Prioritize work that measurably reduces agent mistakes or steering, shortens a
repeatable task path, or improves application efficiency without degrading the
other dimensions. If evaluation shows no advantage, improve the conventions,
diagnostics, examples, or supported target before adding more agent-specific
surface area.
