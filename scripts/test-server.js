import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

// Real-browser and pixel fixtures run in the pinned Linux CI container.
// All other test files, including new server tests, are included automatically.
const browserTests = new Set([
  'a11y.test.js', 'browser-compatibility.test.js', 'playwright.test.js',
  'playwright.example.test.js', 'playwright.project-tracker.test.js',
  'visual-regression.test.js'
])
const files = readdirSync('test').filter(name => name.endsWith('.test.js') && !browserTests.has(name)).sort()
const result = spawnSync(process.execPath, ['--test', ...files.map(name => `test/${name}`)], { stdio: 'inherit' })
if (result.error) console.error(result.error)
process.exitCode = result.status ?? 1
