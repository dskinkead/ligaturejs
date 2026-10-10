import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Measures completed implementations; it never synthesizes edits or guesses agent time.
const root = path.resolve(new URL('..', import.meta.url).pathname)
const react = '/home/dkinkead/ligature-react-benchmark'
const output = process.env.EFFORT_REPORT || path.join(root, 'docs', 'EFFORT-STUDY.json')
const feature = 'Add task priority (low/medium/high), validate server-side, persist it, render it, and cover it in a browser test.'
function walk(dir) { const files = []; for (const name of readdirSync(dir)) { if (['node_modules', '.git', 'data', 'dist'].includes(name)) continue; const file = path.join(dir, name); const stat = statSync(file); if (stat.isDirectory()) files.push(...walk(file)); else if (/\.(js|jsx|ts|tsx|json|css|html|md)$/.test(name)) files.push(file) } return files }
function stats(dir) { const files = walk(dir); return { files: files.length, lines: files.reduce((n, file) => n + readFileSync(file, 'utf8').split('\n').length, 0) } }
function verify(cwd, args) { const result = spawnSync(process.execPath, args, { cwd, encoding: 'utf8', timeout: 120000 }); return { command: [process.execPath, ...args].join(' '), ok: result.status === 0, status: result.status, output: `${result.stdout || ''}${result.stderr || ''}`.slice(-3000) } }
const report = { generatedAt: new Date().toISOString(), feature, methodology: { rule: 'Implementations must be completed independently from clean snapshots.', implementationTime: 'Not inferred; provide timestamps or an agent transcript.', correctionIterations: 'Not guessed from final files.' }, applications: { ligature: { root, finalSize: stats(root), verification: [verify(root, ['--test']), verify(root, ['scripts/package-check.js'])] }, react: { root: react, finalSize: stats(react), verification: [verify(react, ['--test', 'test/browser.test.js'])] } } }
mkdirSync(path.dirname(output), { recursive: true }); writeFileSync(output, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report, null, 2))
