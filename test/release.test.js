import test from 'node:test'
import assert from 'node:assert/strict'
import { releaseReport } from '../src/index.js'

test('release report includes package and contract status', () => { const report = releaseReport(process.cwd()); assert.equal(report.package.name, 'ligaturejs'); assert.equal(report.contract.ok, true) })
