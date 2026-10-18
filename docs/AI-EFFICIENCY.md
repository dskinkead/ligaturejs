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
  count, agent/tool turns, and elapsed time.
- **Application efficiency:** server-render latency, client runtime and asset
  size, unnecessary browser work, and useful HTML available before enhancement.

Do not infer agent time or correction effort from final source files. Record
unavailable measurements as unavailable.

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
The effort-study command summarizes paired, independently reviewed runs from a
JSON record. It does not run agents, infer human effort, or claim a framework
advantage. Record runs from clean snapshots with identical task prompts, model,
tooling, and turn budgets; use the same functional checks and review rubric for
both implementations. Keep each run's commit, outcome, defect count, elapsed
time, agent/tool turns, human prompts, corrections, and each run's clean start
commit traceable to direct observation. Use `null` when a measurement was not
captured.

The former helper counted source files and invoked checks in a hard-coded local
React checkout. Those numbers did not measure agent effectiveness and the
checkout was not portable. The current command accepts explicit study records:

```sh
npm run effort:study -- /path/to/study.json --out /path/to/report.json
```

The record has `schemaVersion: 1`, a `task` (`id`, exact `prompt`, and
`acceptanceCriteria`), `controls` (`model`, `tooling`, `turnBudget`), and a
`runs` array. Each run records a clean-snapshot `startCommit`, a `pairId`,
`implementation` (`ligature` or `baseline`),
`reviewOutcome` (`pass`, `partial`, `fail`, or `null`), and directly observed
values—or `null`—for `elapsedSeconds`, `agentToolTurns`, `humanPrompts`,
`humanCorrections`, and `defects`. Reviewed runs also include
`functionalChecks: { "passed": n, "total": n }` and each run records
`runtimeMetrics: { "serverRenderMs": n, "clientRuntimeGzipBytes": n,
"usefulHtmlBytes": n }`, using `null` for unavailable metrics. Pair IDs identify
runs started from equivalent snapshots for the same task. The JSON report
preserves missing measurement counts and reports paired median differences for
development effort and runtime metrics; it is descriptive and does not decide
statistical significance or authorize a marketing claim.

The old helper's priority-field task is already implemented in the current
Ligature example, so it is not an unfinished task on the current snapshot. It
could only serve as a historical comparison if equivalent clean pre-feature
snapshots and directly observed runs are available. No comparative result
exists until both implementations have been completed and reviewed under this
protocol.

## Decision rule

Prioritize work that measurably reduces agent mistakes or steering, shortens a
repeatable task path, or improves application efficiency without degrading the
other dimensions. If evaluation shows no advantage, improve the conventions,
diagnostics, examples, or supported target before adding more agent-specific
surface area.
