# AI outcome study: first matched task

This is the first proposed execution of the protocol in
[`AI-EFFICIENCY.md`](AI-EFFICIENCY.md). It defines a task before runs begin so
the prompt and review criteria cannot drift to fit the result. **No runs have
been conducted; this is a study specification, not evidence of an advantage.**

## Study question

For a bounded change to a server-rendered task tracker, does the documented
Ligature workflow help an agent deliver the same correct behavior with fewer
human corrections and interaction turns than a conventional React + Express
implementation, without worse server-render or browser-runtime performance?

## Task prompt (give verbatim to each run)

> Add a task-status filter to the project task page. The filter has three
> choices: All, Open, and Completed. It must work with JavaScript disabled,
> preserve the selected choice in the URL, and show only matching tasks in
> both the HTML page and the existing JSON tasks endpoint when the same filter
> is requested. Invalid filter values must return a clear client error rather
> than silently showing an arbitrary subset. Keep the current task creation,
> completion, and deletion behavior intact. Add focused automated coverage and
> update the app guide if needed. Do not add dependencies.

## Acceptance and review rubric

Score each criterion pass/fail against both implementations. The independent
reviewer sees anonymized patches and uses the same checks for each.

1. `all`, `open`, and `completed` return exactly the corresponding tasks in
   server-rendered HTML and JSON; omitted filter means `all`.
2. A native GET form submits the filter, works without JavaScript, and the
   response URL preserves the selected value.
3. Unknown filter values produce a documented 400 response and do not mutate
   data.
4. Existing create, toggle, delete, and project-isolation behavior is
   unchanged.
5. User-controlled task text remains escaped; filter handling cannot broaden
   project access or alter another project's tasks.
6. Focused automated checks cover all filter values, invalid input, no-JS
   submission, and the existing mutation flow.
7. The implementation follows the starter's established architecture and is
   reviewable: no unnecessary dependency, duplicated filter semantics, or
   unrelated public API changes.

Any failed criterion is a defect. Record the count and exact failing criteria;
do not collapse functional correctness and reviewer preference into a single
subjective score. A run is `pass` only if all seven criteria pass; `partial`
means some pass and some fail; `fail` means none pass. Reviewers must record
functional-check counts and human corrections separately.

## Execution controls still required

Before launching agents, prepare and freeze both equivalent starter
applications: the current Ligature project tracker and a React + Express
server-rendered counterpart. Both must have the same routes, seed data,
existing task behavior, and externally observable HTML/API contract before the
filter task begins. Record each clean start commit, a shared pair ID, and the
starter artifact hashes in the study record. The React version is a study
baseline, not a claim that React itself requires Express or server rendering.

Use the same model version, agent harness, tools/network access, task prompt,
starting information, wall-clock limit, and turn budget. Randomize which
implementation is attempted first across pairs. Runs start from fresh clean
snapshots; do not carry discoveries or edits from one run into its pair.
Capture elapsed time, tool turns, human prompts, human corrections, and defects
directly as they occur. If a measure was not captured, use `null`.

Run identical functional checks for both variants. Measure each resulting app
on the same machine/runtime with the same seeded dataset and request sequence;
record the exact Node version, hardware, and commands alongside the study
record. At minimum, compare server response latency and compressed client
runtime bytes. Do not compare raw HTML byte counts as a proxy for usefulness;
the study tool's `usefulHtmlBytes` should only be populated after a consistent
measurement definition is selected for both implementations.

## Current status

- Task and review rubric: specified above.
- Equivalent React + Express starter: not yet prepared.
- Matched runs: none.
- Product conclusion: none.

Do not summarize the report as a Ligature win from this single task. Use it to
find friction and choose the next task; broader product claims require multiple
representative tasks and repeated pairs.
