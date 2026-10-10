import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectProject } from '../src/index.js'

test('current project passes structural contract check', () => { const result = inspectProject(process.cwd()); assert.equal(result.ok, true, result.errors.join('; ')) })
