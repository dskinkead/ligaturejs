import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const usage = 'Usage: npm run effort:study -- <study.json> [--out <report.json>]'
const args = process.argv.slice(2)
const input = args.find(value => !value.startsWith('--'))
const outIndex = args.indexOf('--out')
const output = outIndex >= 0 ? args[outIndex + 1] : null

function fail(message) {
  console.error(`${message}\n\n${usage}`)
  process.exit(2)
}

if (!input || args.includes('--out') && !output || args.some(value => value.startsWith('--') && value !== '--out')) fail('A study record is required; no machine-local app paths or inferred agent metrics are used.')

let study
try {
  study = JSON.parse(readFileSync(path.resolve(input), 'utf8'))
} catch (error) {
  fail(`Could not read study JSON: ${error.message}`)
}
if (!study || typeof study !== 'object' || Array.isArray(study)) fail('The study record must be a JSON object.')

const errors = []
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonNegative = value => value === null || Number.isInteger(value) && value >= 0
if (!isObject(study) || study.schemaVersion !== 1) errors.push('schemaVersion must be 1')
if (!isObject(study.task) || !study.task.id || !study.task.prompt || !Array.isArray(study.task.acceptanceCriteria) || !study.task.acceptanceCriteria.length) errors.push('task needs id, prompt, and non-empty acceptanceCriteria')
if (!isObject(study.controls) || !study.controls.model || !study.controls.tooling || !Number.isInteger(study.controls.turnBudget) || study.controls.turnBudget < 1) errors.push('controls need model, tooling, and a positive turnBudget')
if (!Array.isArray(study.runs) || !study.runs.length) errors.push('runs must contain at least one recorded run')

const seen = new Set()
for (const [index, run] of (Array.isArray(study.runs) ? study.runs : []).entries()) {
  const label = `runs[${index}]`
  if (!isObject(run)) { errors.push(`${label} must be an object`); continue }
  if (!run.pairId || !['ligature', 'baseline'].includes(run.implementation)) errors.push(`${label} needs pairId and implementation (ligature or baseline)`)
  if (typeof run.startCommit !== 'string' || !run.startCommit) errors.push(`${label}.startCommit must identify its clean starting snapshot`)
  const key = `${run.pairId}:${run.implementation}`
  if (seen.has(key)) errors.push(`${label} duplicates ${key}`)
  seen.add(key)
  if (!['pass', 'partial', 'fail', null].includes(run.reviewOutcome)) errors.push(`${label}.reviewOutcome must be pass, partial, fail, or null`)
  if (!('elapsedSeconds' in run) || !(run.elapsedSeconds === null || typeof run.elapsedSeconds === 'number' && Number.isFinite(run.elapsedSeconds) && run.elapsedSeconds >= 0)) errors.push(`${label}.elapsedSeconds must be a non-negative number or null`)
  for (const field of ['agentToolTurns', 'humanPrompts', 'humanCorrections', 'defects']) {
    if (!(field in run) || !nonNegative(run[field])) errors.push(`${label}.${field} must be a non-negative integer or null`)
  }
  if (run.reviewOutcome !== null && (!Number.isInteger(run.defects) || !isObject(run.functionalChecks) || !Number.isInteger(run.functionalChecks.passed) || run.functionalChecks.passed < 0 || !Number.isInteger(run.functionalChecks.total) || run.functionalChecks.total < 1 || run.functionalChecks.passed > run.functionalChecks.total)) errors.push(`${label} reviewed runs need defects and functionalChecks { passed, total }`)
  if (!isObject(run.runtimeMetrics)) errors.push(`${label}.runtimeMetrics must record serverRenderMs, clientRuntimeGzipBytes, and usefulHtmlBytes (use null when unavailable)`)
  else for (const field of ['serverRenderMs', 'clientRuntimeGzipBytes', 'usefulHtmlBytes']) {
    const value = run.runtimeMetrics[field]
    if (!(value === null || typeof value === 'number' && Number.isFinite(value) && value >= 0)) errors.push(`${label}.runtimeMetrics.${field} must be a non-negative number or null`)
  }
}
if (errors.length) fail(`Invalid study record:\n- ${errors.join('\n- ')}`)

const grouped = Object.fromEntries(['ligature', 'baseline'].map(implementation => [implementation, study.runs.filter(run => run.implementation === implementation)]))
const paired = new Map()
for (const run of study.runs) {
  const pair = paired.get(run.pairId) || {}
  pair[run.implementation] = run
  paired.set(run.pairId, pair)
}
const completePairs = [...paired.values()].filter(pair => pair.ligature && pair.baseline)
const median = values => {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}
const summarizeMetric = (field, pairs = completePairs) => {
  const deltas = pairs.flatMap(pair => {
    const left = pair.ligature[field]
    const right = pair.baseline[field]
    return Number.isFinite(left) && Number.isFinite(right) ? [left - right] : []
  })
  return {
    pairedObservations: deltas.length,
    medianLigatureMinusBaseline: median(deltas),
    ligatureLower: deltas.filter(value => value < 0).length,
    equal: deltas.filter(value => value === 0).length,
    baselineLower: deltas.filter(value => value > 0).length,
  }
}
const summarizeRuntimeMetric = field => {
  const deltas = completePairs.flatMap(pair => {
    const left = pair.ligature.runtimeMetrics[field]
    const right = pair.baseline.runtimeMetrics[field]
    return Number.isFinite(left) && Number.isFinite(right) ? [left - right] : []
  })
  return {
    pairedObservations: deltas.length,
    medianLigatureMinusBaseline: median(deltas),
    ligatureLower: deltas.filter(value => value < 0).length,
    equal: deltas.filter(value => value === 0).length,
    baselineLower: deltas.filter(value => value > 0).length,
  }
}
const summarizeImplementation = runs => ({
  runs: runs.length,
  reviewed: runs.filter(run => run.reviewOutcome !== null).length,
  outcomes: Object.fromEntries(['pass', 'partial', 'fail'].map(outcome => [outcome, runs.filter(run => run.reviewOutcome === outcome).length])),
  medians: Object.fromEntries(['elapsedSeconds', 'agentToolTurns', 'humanPrompts', 'humanCorrections', 'defects'].map(field => [field, median(runs.map(run => run[field]).filter(Number.isFinite))])),
  missingObservations: Object.fromEntries(['elapsedSeconds', 'agentToolTurns', 'humanPrompts', 'humanCorrections', 'defects'].map(field => [field, runs.filter(run => run[field] === null).length])),
  runtimeMetricMedians: Object.fromEntries(['serverRenderMs', 'clientRuntimeGzipBytes', 'usefulHtmlBytes'].map(field => [field, median(runs.map(run => run.runtimeMetrics[field]).filter(Number.isFinite))])),
  missingRuntimeObservations: Object.fromEntries(['serverRenderMs', 'clientRuntimeGzipBytes', 'usefulHtmlBytes'].map(field => [field, runs.filter(run => run.runtimeMetrics[field] === null).length])),
})

const report = {
  schemaVersion: 1,
  task: study.task,
  controls: study.controls,
  runs: study.runs,
  pairCount: paired.size,
  completePairs: completePairs.length,
  implementations: Object.fromEntries(Object.entries(grouped).map(([name, runs]) => [name, summarizeImplementation(runs)])),
  pairedMetrics: Object.fromEntries(['elapsedSeconds', 'agentToolTurns', 'humanPrompts', 'humanCorrections', 'defects'].map(field => [field, summarizeMetric(field)])),
  pairedRuntimeMetrics: Object.fromEntries(['serverRenderMs', 'clientRuntimeGzipBytes', 'usefulHtmlBytes'].map(field => [field, summarizeRuntimeMetric(field)])),
  limitations: [
    'This is a summary of recorded runs, not proof of a general framework advantage.',
    'Null observations are reported as missing and are never inferred from source files or CI duration.',
    'Review outcomes and defects must come from the same independent rubric for both implementations.',
    'Use multiple representative tasks and repeated clean-snapshot pairs before drawing product conclusions.',
  ],
}

const serialized = `${JSON.stringify(report, null, 2)}\n`
if (output) writeFileSync(path.resolve(output), serialized)
else process.stdout.write(serialized)
